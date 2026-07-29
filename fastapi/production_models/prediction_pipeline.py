
#!/usr/bin/env python3
"""
Prediction Pipeline for AI Financial Purchase Advisor
Production-ready inference pipeline for XGBoost models.
"""

import os, sys, json, pickle, warnings, hashlib
from pathlib import Path
import numpy as np
import pandas as pd

warnings.filterwarnings('ignore')

class PredictionPipeline:
    """Production prediction pipeline for financial purchase recommendation."""

    REQUIRED_FIELDS = ['total_income', 'total_fixed_expense', 'total_variable_expense',
                       'current_savings', 'emergency_fund', 'emergency_usage_limit', 'purchase_price']
    RAW_FEATURES = REQUIRED_FIELDS
    ALLOWED_EMERGENCY_LIMITS = [30, 40, 50, 60, 70]
    SELECTED_FEATURES = [
        'emergency_usage_needed', 'purchase_ratio', 'purchase_to_savings',
        'purchase_to_remaining', 'purchase_burden', 'leftover_after_purchase',
        'purchase_to_emergency', 'financial_cushion', 'savings_ratio',
        'emergency_usage_limit'
    ]

    PATTERN_DESCRIPTIONS = {
        'P1': 'Full Purchase - Use available money without touching savings or emergency fund.',
        'P2': 'Savings Assisted - Use a portion of savings to supplement available money.',
        'P3': 'Savings Heavy - Rely primarily on savings for the purchase.',
        'P4': 'Emergency Fund - Requires emergency fund usage for the purchase.',
        'P6': 'Not Affordable - Purchase exceeds available financial resources.'
    }

    NEXT_ACTIONS = {
        'P1': 'Proceed with purchase using available funds.',
        'P2': 'Consider using a portion of savings to complete the purchase.',
        'P3': 'Plan to use significant savings for this purchase; review if necessary.',
        'P4': 'Evaluate if emergency fund usage is appropriate for this purchase.',
        'P6': 'Consider postponing purchase or exploring financing options.'
    }

    def __init__(self, models_dir=None):
        if models_dir is None:
            models_dir = Path(__file__).parent / 'production_models'
        self.models_dir = Path(models_dir)

        with open(str(self.models_dir / 'recommendation_model_optimized.pkl'), 'rb') as f:
            self.rec_model = pickle.load(f)
        with open(str(self.models_dir / 'pattern_model_optimized.pkl'), 'rb') as f:
            self.pat_model = pickle.load(f)
        with open(str(self.models_dir / 'recommendation_label_encoder.pkl'), 'rb') as f:
            self.rec_label_encoder = pickle.load(f)
        with open(str(self.models_dir / 'pattern_label_encoder.pkl'), 'rb') as f:
            self.pat_label_encoder = pickle.load(f)
        with open(str(self.models_dir / 'recommendation_metadata.json'), 'r') as f:
            self.rec_meta = json.load(f)
        with open(str(self.models_dir / 'pattern_metadata.json'), 'r') as f:
            self.pat_meta = json.load(f)
        with open(str(self.models_dir / 'feature_metadata.json'), 'r') as f:
            self.feat_meta = json.load(f)

        self.rec_target_map = {v: k for k, v in self.rec_meta.get('target_mapping', {'NO': 0, 'YES': 1}).items()}
        self.pat_target_map = {v: k for k, v in self.pat_meta.get('target_mapping', {}).items()}

    def _validate_input(self, data):
        if isinstance(data, dict):
            data = [data]
        errors = []
        for i, row in enumerate(data):
            row_errors = []
            for field in self.REQUIRED_FIELDS:
                if field not in row:
                    row_errors.append(f'Row {i}: missing field "{field}"')
                    continue
                val = row[field]
                if not isinstance(val, (int, float, np.integer, np.floating)):
                    row_errors.append(f'Row {i}: "{field}" must be numeric, got {type(val).__name__}')
                elif val < 0:
                    row_errors.append(f'Row {i}: "{field}" must be non-negative, got {val}')
            el = row.get('emergency_usage_limit')
            if el is not None and el not in self.ALLOWED_EMERGENCY_LIMITS:
                row_errors.append(f'Row {i}: emergency_usage_limit must be one of {self.ALLOWED_EMERGENCY_LIMITS}, got {el}')
            if row_errors:
                errors.extend(row_errors)
        return errors

    def _engineer_features(self, row):
        df = pd.DataFrame([row])

        df['total_expense'] = df['total_fixed_expense'] + df['total_variable_expense']
        df['remaining_balance'] = df['total_income'] - df['total_expense']
        df['disposable_income'] = df['total_income'] - df['total_fixed_expense']
        df['emergency_available'] = df['emergency_fund'] * (df['emergency_usage_limit'] / 100.0)
        df['available_money'] = df['remaining_balance'] + df['current_savings'] + df['emergency_available']
        df['expense_ratio'] = np.where(df['total_income'] != 0, df['total_expense'] / df['total_income'], 0)
        df['savings_ratio'] = np.where(df['total_income'] != 0, df['current_savings'] / df['total_income'], 0)
        df['debt_ratio'] = np.where(df['total_income'] != 0, df['total_fixed_expense'] / df['total_income'], 0)
        df['purchase_to_income'] = np.where(df['total_income'] != 0, df['purchase_price'] / df['total_income'], 0)
        df['purchase_to_remaining'] = np.where(
            df['remaining_balance'] != 0, df['purchase_price'] / df['remaining_balance'],
            np.where(df['purchase_price'] > 0, 999, 0))
        df['purchase_to_savings'] = np.where(
            df['current_savings'] != 0, df['purchase_price'] / df['current_savings'],
            np.where(df['purchase_price'] > 0, 999, 0))
        df['purchase_to_emergency'] = np.where(
            df['emergency_available'] != 0, df['purchase_price'] / df['emergency_available'],
            np.where(df['purchase_price'] > 0, 999, 0))
        df['purchase_ratio'] = np.where(
            df['available_money'] != 0, df['purchase_price'] / df['available_money'],
            np.where(df['purchase_price'] > 0, 999, 0))
        df['leftover_after_purchase'] = df['available_money'] - df['purchase_price']
        df['financial_cushion'] = df['current_savings'] + df['emergency_available']
        df['purchase_burden'] = np.where(
            df['disposable_income'] != 0, df['purchase_price'] / df['disposable_income'],
            np.where(df['purchase_price'] > 0, 999, 0))
        df['emergency_usage_needed'] = np.maximum(0, df['purchase_price'] - (df['remaining_balance'] + df['current_savings']))

        leftover_ratio = np.where(df['available_money'] != 0, df['leftover_after_purchase'] / df['available_money'], 0)
        score = np.zeros(len(df))
        score += np.where(df['expense_ratio'] <= 0.3, 25, np.where(df['expense_ratio'] <= 0.5, 20,
                          np.where(df['expense_ratio'] <= 0.7, 10, np.where(df['expense_ratio'] <= 1.0, 5, 0))))
        score += np.where(df['savings_ratio'] >= 10, 25, np.where(df['savings_ratio'] >= 5, 20,
                          np.where(df['savings_ratio'] >= 2, 15, np.where(df['savings_ratio'] >= 1, 10,
                          np.where(df['savings_ratio'] > 0, 5, 0)))))
        score += np.where(df['debt_ratio'] <= 0.2, 25, np.where(df['debt_ratio'] <= 0.3, 20,
                          np.where(df['debt_ratio'] <= 0.4, 15, np.where(df['debt_ratio'] <= 0.5, 10, 5))))
        score += np.where(leftover_ratio >= 0.5, 25, np.where(leftover_ratio >= 0.3, 20,
                          np.where(leftover_ratio >= 0.1, 15, np.where(leftover_ratio >= 0, 10,
                          np.where(leftover_ratio > -0.5, 5, 0)))))
        df['financial_health_score'] = np.clip(score, 0, 100).astype(int)

        return df

    def predict(self, data):
        single = isinstance(data, dict)
        records = [data] if single else list(data)

        val_errors = self._validate_input(records)
        if val_errors:
            return {'status': 'error', 'errors': val_errors, 'predictions': []}

        results_list = []
        for record in records:
            try:
                eng_df = self._engineer_features(record)
                X = eng_df[self.SELECTED_FEATURES]

                rec_pred = int(self.rec_model.predict(X)[0])
                rec_proba = self.rec_model.predict_proba(X)[0]
                rec_label = self.rec_target_map[rec_pred]
                rec_confidence = float(max(rec_proba))

                if rec_label == 'NO':
                    pattern = 'P6'
                    pattern_confidence = 1.0
                    funding_strategy = 'Purchase Not Affordable'
                    reasons = [
                        'Insufficient available money to cover the purchase.',
                        'Remaining balance is too low relative to purchase price.',
                        'Consider increasing income or reducing expenses before purchasing.'
                    ]
                else:
                    pat_pred = int(self.pat_model.predict(X)[0])
                    pat_proba = self.pat_model.predict_proba(X)[0]
                    pat_label = self.pat_target_map[pat_pred]
                    pattern = pat_label
                    pattern_confidence = float(max(pat_proba))
                    funding_strategy = self.PATTERN_DESCRIPTIONS.get(pat_label, '')
                    reasons = [funding_strategy]

                financial_summary = {
                    field: float(record[field]) for field in self.RAW_FEATURES
                }
                engineered = {
                    'total_expense': float(eng_df['total_expense'].iloc[0]),
                    'remaining_balance': float(eng_df['remaining_balance'].iloc[0]),
                    'disposable_income': float(eng_df['disposable_income'].iloc[0]),
                    'emergency_available': float(eng_df['emergency_available'].iloc[0]),
                    'available_money': float(eng_df['available_money'].iloc[0]),
                    'expense_ratio': float(eng_df['expense_ratio'].iloc[0]),
                    'savings_ratio': float(eng_df['savings_ratio'].iloc[0]),
                    'debt_ratio': float(eng_df['debt_ratio'].iloc[0]),
                    'purchase_to_income': float(eng_df['purchase_to_income'].iloc[0]),
                    'purchase_to_remaining': float(eng_df['purchase_to_remaining'].iloc[0]),
                    'purchase_to_savings': float(eng_df['purchase_to_savings'].iloc[0]),
                    'purchase_to_emergency': float(eng_df['purchase_to_emergency'].iloc[0]),
                    'purchase_ratio': float(eng_df['purchase_ratio'].iloc[0]),
                    'leftover_after_purchase': float(eng_df['leftover_after_purchase'].iloc[0]),
                    'financial_cushion': float(eng_df['financial_cushion'].iloc[0]),
                    'purchase_burden': float(eng_df['purchase_burden'].iloc[0]),
                    'emergency_usage_needed': float(eng_df['emergency_usage_needed'].iloc[0]),
                    'financial_health_score': int(eng_df['financial_health_score'].iloc[0])
                }

                output = {
                    'recommendation': rec_label,
                    'pattern': pattern,
                    'confidence': {
                        'recommendation': rec_confidence,
                        'pattern': pattern_confidence
                    },
                    'recommendation_probability': {
                        'NO': float(rec_proba[0]),
                        'YES': float(rec_proba[1])
                    },
                    'pattern_probability': {
                        self.pat_target_map[i]: float(pat_proba[i])
                        for i in range(len(pat_proba))
                    } if rec_label == 'YES' else {},
                    'financial_summary': financial_summary,
                    'engineered_features': engineered,
                    'funding_strategy': funding_strategy,
                    'reasons': reasons,
                    'suggested_next_action': self.NEXT_ACTIONS.get(pattern, '')
                }
                results_list.append(output)
            except Exception as e:
                results_list.append({
                    'status': 'error',
                    'input': record,
                    'error': str(e)
                })

        if single:
            return results_list[0]
        return {'status': 'success', 'predictions': results_list}

    def predict_csv(self, csv_path, output_path=None):
        df_in = pd.read_csv(csv_path)
        records = df_in.to_dict('records')
        result = self.predict(records)
        if output_path:
            preds = result.get('predictions', [])
            if preds:
                out_df = pd.DataFrame(preds)
                out_df.to_csv(output_path, index=False)
        return result

    def predict_batch(self, data_list):
        return self.predict(data_list)

    @property
    def metadata(self):
        return {
            'recommendation_model': self.rec_meta,
            'pattern_model': self.pat_meta,
            'feature_metadata': {
                'selected_features': self.SELECTED_FEATURES,
                'raw_features': self.RAW_FEATURES
            }
        }
