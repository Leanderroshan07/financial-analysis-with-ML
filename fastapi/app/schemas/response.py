from pydantic import BaseModel
from typing import Optional


class FundingStrategy(BaseModel):
    savings_used: float
    remaining_balance_used: float
    emergency_used: float


class FundingStep(BaseModel):
    source: str
    used: float
    remaining_after_step: float
    available: float


class FundingBreakdown(BaseModel):
    total_needed: float
    steps: list[FundingStep]
    final_shortfall: float


class Confidence(BaseModel):
    recommendation: float
    pattern: float


class PredictionResponse(BaseModel):
    status: str = 'success'
    recommendation: str
    pattern: str
    confidence: Confidence
    recommendation_probability: dict[str, float]
    pattern_probability: dict[str, float]
    funding_strategy: FundingStrategy
    funding_breakdown: FundingBreakdown
    financial_summary: dict
    engineered_features: dict
    business_explanation: str
    suggestions: list[str]
    wait_period_suggestion: Optional[str] = None
    processing_time_ms: float
    model_version: str


class BatchPredictionResponse(BaseModel):
    status: str = 'success'
    predictions: list[PredictionResponse]
    total_processed: int
    average_time_ms: float


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    uptime_seconds: float
    models_loaded: bool
    pipeline_ready: bool


class ModelInfoResponse(BaseModel):
    recommendation_model: dict
    pattern_model: dict
    feature_count: int
    dataset_version: str
    pipeline_version: str


class VersionResponse(BaseModel):
    api_version: str
    pipeline_version: str
    model_versions: dict


class FeatureInfo(BaseModel):
    name: str
    type: str
    description: str
    validation_rules: list[str]


class FeaturesResponse(BaseModel):
    required_inputs: list[FeatureInfo]
    engineered_features: list[str]
    model_input_features: list[str]
