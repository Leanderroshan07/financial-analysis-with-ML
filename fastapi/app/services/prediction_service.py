import math
import time
import uuid
from datetime import datetime
from typing import Any, Optional
from ..core.logger import logger
from ..core.exceptions import PredictionError, ModelNotLoadedError
from ..schemas.request import PredictionRequest
from ..schemas.response import (
    PredictionResponse, BatchPredictionResponse,
    Confidence, FundingStrategy, FundingBreakdown, FundingStep
)


PATTERN_DESCRIPTIONS = {
    'P1': 'Use available money without touching savings or emergency fund. Your income comfortably covers this purchase.',
    'P2': 'Use a portion of savings to supplement available money. The purchase is affordable but may reduce your savings buffer.',
    'P3': 'Rely primarily on savings for this purchase. Consider if the expense is necessary before proceeding.',
    'P4': 'Requires emergency fund usage. Evaluate if this purchase qualifies as an emergency before proceeding.',
    'P6': 'Purchase is not affordable with current financial resources. Consider postponing or exploring financing options.'
}

PATTERN_SUGGESTIONS = {
    'P1': ['Proceed with purchase using available funds.',
           'Maintain current savings and emergency fund levels.',
           'Consider negotiating for a better price to save more.'],
    'P2': ['Consider using a portion of savings to complete the purchase.',
           'Review your budget to replenish savings after purchase.',
           'Check if delaying the purchase would allow full cash payment.'],
    'P3': ['Plan to use significant savings for this purchase.',
           'Review if this purchase is essential or can be postponed.',
           'Consider partial financing to preserve some savings.'],
    'P4': ['Evaluate if emergency fund usage is appropriate for this purchase.',
           'Explore alternative funding sources before using emergency funds.',
           'If proceeding, plan to replenish emergency fund as a priority.'],
    'P6': ['Purchase is not affordable with current financial resources.',
           'Consider postponing the purchase until finances improve.',
           'Explore financing options or increasing income to afford this purchase.',
           'Review monthly expenses for potential reductions.']
}


class PredictionService:
    def __init__(self, pipeline):
        self.pipeline = pipeline
        self._validate_pipeline()

    def _validate_pipeline(self):
        if self.pipeline is None:
            raise ModelNotLoadedError('PredictionPipeline')

    def _calculate_funding_strategy(self, record: dict, engineered: dict) -> tuple[FundingStrategy, FundingBreakdown]:
        purchase_price = record['purchase_price']
        remaining_balance = engineered.get('remaining_balance', 0)
        current_savings = record['current_savings']
        emergency_available = engineered.get('emergency_available', 0)

        remaining_balance_used = round(float(min(purchase_price, max(0, remaining_balance))), 2)
        remaining_deficit = purchase_price - remaining_balance_used
        savings_used = round(float(max(0, min(remaining_deficit, current_savings))), 2)
        remaining_deficit_2 = purchase_price - remaining_balance_used - savings_used
        emergency_used = round(float(max(0, min(remaining_deficit_2, emergency_available))), 2)
        final_shortfall = round(float(max(0, purchase_price - remaining_balance_used - savings_used - emergency_used)), 2)

        strategy = FundingStrategy(
            savings_used=savings_used,
            remaining_balance_used=remaining_balance_used,
            emergency_used=emergency_used
        )

        steps = [
            FundingStep(
                source='Monthly Surplus (Income - Expenses)',
                used=remaining_balance_used,
                remaining_after_step=round(float(max(0, purchase_price - remaining_balance_used)), 2),
                available=round(float(max(0, remaining_balance)), 2)
            ),
            FundingStep(
                source='Savings',
                used=savings_used,
                remaining_after_step=round(float(max(0, purchase_price - remaining_balance_used - savings_used)), 2),
                available=round(float(current_savings), 2)
            ),
            FundingStep(
                source='Emergency Fund',
                used=emergency_used,
                remaining_after_step=final_shortfall,
                available=round(float(emergency_available), 2)
            ),
        ]

        breakdown = FundingBreakdown(
            total_needed=round(float(purchase_price), 2),
            steps=steps,
            final_shortfall=final_shortfall
        )

        return strategy, breakdown

    def _generate_business_explanation(self, recommendation: str, pattern: str,
                                        record: dict, engineered: dict) -> str:
        if recommendation == 'NO':
            return (
                f'The purchase (${record["purchase_price"]:,.2f}) is not affordable. '
                f'Available money (${engineered.get("available_money", 0):,.2f}) is insufficient. '
                'Consider increasing income, reducing expenses, or exploring financing options.'
            )

        explanation = PATTERN_DESCRIPTIONS.get(pattern, '')
        purchase_ratio = engineered.get('purchase_ratio', 0)
        if purchase_ratio < 0.3:
            explanation += ' The purchase price is low relative to your available funds.'
        elif purchase_ratio < 0.6:
            explanation += ' The purchase represents a moderate portion of your available funds.'
        else:
            explanation += ' The purchase consumes a significant portion of your available funds.'
        return explanation

    def _generate_wait_period_suggestion(self, record: dict, engineered: dict) -> Optional[str]:
        purchase_price = record['purchase_price']
        remaining_balance = engineered.get('remaining_balance', 0)

        if remaining_balance <= 0:
            return None

        months_needed = math.ceil(purchase_price / remaining_balance)

        if months_needed <= 1:
            return (
                f'You already have enough monthly surplus '
                f'(${remaining_balance:,.2f}) to cover this purchase within a month.'
            )

        now = datetime.now()
        raw_month = now.month + months_needed
        target_year = now.year + (raw_month - 1) // 12
        target_month = ((raw_month - 1) % 12) + 1
        month_name = datetime(target_year, target_month, 1).strftime('%B')

        if months_needed > 60:
            return (
                f'At your current monthly surplus of ${remaining_balance:,.2f}, '
                f'it would take over 5 years to save for this purchase. '
                f'Consider reducing expenses or increasing income.'
            )

        return (
            f'If you save your monthly surplus of ${remaining_balance:,.2f}, '
            f'you can afford this in approximately {months_needed} '
            f'{"month" if months_needed == 1 else "months"} '
            f'(by {month_name} {target_year}).'
        )

    def _build_full_pattern_probability(self, pipeline_result: dict) -> dict:
        all_patterns = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6']
        recommendation = pipeline_result['recommendation']

        if recommendation == 'NO':
            return {p: (100.0 if p == 'P6' else 0.0) for p in all_patterns}

        pat_proba = pipeline_result.get('pattern_probability', {})
        result = {}
        for p in all_patterns:
            raw = pat_proba.get(p, 0.0)
            result[p] = round(float(raw) * 100, 1)
        return result

    def predict_single(self, request: PredictionRequest) -> PredictionResponse:
        start = time.time()
        request_id = str(uuid.uuid4())[:8]

        record = request.model_dump()

        pipeline_result = self.pipeline.predict(record)

        if isinstance(pipeline_result, dict) and pipeline_result.get('status') == 'error':
            raise PredictionError(str(pipeline_result.get('errors', 'Prediction failed')))

        elapsed = (time.time() - start) * 1000

        recommendation = pipeline_result['recommendation']
        pattern = pipeline_result['pattern']
        rec_proba = pipeline_result['recommendation_probability']
        engineered = pipeline_result['engineered_features']
        financial_summary = pipeline_result['financial_summary']

        funding, funding_breakdown = self._calculate_funding_strategy(record, engineered)
        business_explanation = self._generate_business_explanation(
            recommendation, pattern, record, engineered
        )

        rec_confidence = round(max(rec_proba.values()) * 100, 2)
        pat_proba = pipeline_result.get('pattern_probability', {})
        pat_confidence = round(max(pat_proba.values()) * 100, 2) if pat_proba else 100.0

        confidence = Confidence(
            recommendation=rec_confidence,
            pattern=pat_confidence
        )

        rec_proba_pct = {k.lower(): round(v * 100, 2) for k, v in rec_proba.items()}

        pat_proba_full = self._build_full_pattern_probability(pipeline_result)

        model_meta = self.pipeline.metadata.get('recommendation_model', {})
        model_version = model_meta.get('model_version', '2.0.0-optimized')

        suggestions = PATTERN_SUGGESTIONS.get(pattern, ['No specific suggestions available.'])
        wait_period_suggestion = self._generate_wait_period_suggestion(record, engineered)

        response = PredictionResponse(
            recommendation=recommendation,
            pattern=pattern,
            confidence=confidence,
            recommendation_probability=rec_proba_pct,
            pattern_probability=pat_proba_full,
            funding_strategy=funding,
            funding_breakdown=funding_breakdown,
            financial_summary=financial_summary,
            engineered_features=engineered,
            business_explanation=business_explanation,
            suggestions=suggestions,
            wait_period_suggestion=wait_period_suggestion,
            processing_time_ms=round(elapsed, 2),
            model_version=model_version
        )

        logger.info(
            f'Request {request_id} | {elapsed:.2f}ms | '
            f'Rec: {recommendation} | Pattern: {pattern} | '
            f'Conf: {confidence.recommendation}%'
        )

        return response

    def predict_batch(self, requests: list[PredictionRequest]) -> BatchPredictionResponse:
        start = time.time()
        batch_id = str(uuid.uuid4())[:8]

        results = []
        for req in requests:
            try:
                result = self.predict_single(req)
                results.append(result)
            except Exception as e:
                logger.error(f'Batch {batch_id}: Prediction error: {e}')

        elapsed = (time.time() - start) * 1000
        avg_time = elapsed / len(requests) if requests else 0

        logger.info(
            f'Batch {batch_id} | {len(results)}/{len(requests)} completed | '
            f'Total: {elapsed:.2f}ms | Avg: {avg_time:.2f}ms'
        )

        return BatchPredictionResponse(
            predictions=results,
            total_processed=len(results),
            average_time_ms=round(avg_time, 2)
        )
