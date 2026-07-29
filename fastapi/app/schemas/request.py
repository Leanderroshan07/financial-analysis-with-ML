from pydantic import BaseModel, Field, field_validator
from typing import Optional


ALLOWED_EMERGENCY_LIMITS = [30, 40, 50, 60, 70]


class PredictionRequest(BaseModel):
    total_income: float = Field(..., gt=0, description='Total monthly income')
    total_fixed_expense: float = Field(..., ge=0, description='Total fixed monthly expenses')
    total_variable_expense: float = Field(..., ge=0, description='Total variable monthly expenses')
    current_savings: float = Field(..., ge=0, description='Current savings amount')
    emergency_fund: float = Field(..., ge=0, description='Emergency fund amount')
    emergency_usage_limit: int = Field(..., description='Emergency fund usage limit percentage')
    purchase_price: float = Field(..., gt=0, description='Price of the intended purchase')

    @field_validator('emergency_usage_limit')
    @classmethod
    def validate_emergency_limit(cls, v):
        if v not in ALLOWED_EMERGENCY_LIMITS:
            raise ValueError(f'emergency_usage_limit must be one of {ALLOWED_EMERGENCY_LIMITS}, got {v}')
        return v




class BatchPredictionRequest(BaseModel):
    requests: list[PredictionRequest] = Field(..., min_length=1, max_length=100, description='List of prediction requests')
