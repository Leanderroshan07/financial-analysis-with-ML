from fastapi import APIRouter
from ..core.logger import logger
from ..schemas.response import FeaturesResponse, FeatureInfo

router = APIRouter()

REQUIRED_INPUTS = [
    FeatureInfo(
        name='total_income',
        type='float',
        description='Total monthly income from all sources.',
        validation_rules=['Must be greater than 0', 'Must be a positive number']
    ),
    FeatureInfo(
        name='total_fixed_expense',
        type='float',
        description='Total fixed monthly expenses (rent, loans, insurance, etc.).',
        validation_rules=['Must be >= 0', 'Cannot exceed total_income']
    ),
    FeatureInfo(
        name='total_variable_expense',
        type='float',
        description='Total variable monthly expenses (food, transport, entertainment, etc.).',
        validation_rules=['Must be >= 0']
    ),
    FeatureInfo(
        name='current_savings',
        type='float',
        description='Current total savings amount.',
        validation_rules=['Must be >= 0']
    ),
    FeatureInfo(
        name='emergency_fund',
        type='float',
        description='Total emergency fund amount.',
        validation_rules=['Must be >= 0']
    ),
    FeatureInfo(
        name='emergency_usage_limit',
        type='int',
        description='Percentage of emergency fund available for purchases.',
        validation_rules=['Must be one of: 30, 40, 50, 60, 70']
    ),
    FeatureInfo(
        name='purchase_price',
        type='float',
        description='Price of the intended purchase.',
        validation_rules=['Must be greater than 0', 'Must be a positive number']
    )
]

ENGINEERED_FEATURES = [
    'total_expense', 'remaining_balance', 'disposable_income',
    'emergency_available', 'available_money', 'expense_ratio',
    'savings_ratio', 'debt_ratio', 'purchase_to_income',
    'purchase_to_remaining', 'purchase_to_savings',
    'purchase_to_emergency', 'purchase_ratio',
    'leftover_after_purchase', 'financial_cushion',
    'purchase_burden', 'emergency_usage_needed',
    'financial_health_score'
]

MODEL_INPUT_FEATURES = [
    'emergency_usage_needed', 'purchase_ratio', 'purchase_to_savings',
    'purchase_to_remaining', 'purchase_burden', 'leftover_after_purchase',
    'purchase_to_emergency', 'financial_cushion', 'savings_ratio',
    'emergency_usage_limit'
]


@router.get('/features', response_model=FeaturesResponse, tags=['Features'])
async def features():
    logger.info('Features info requested')
    return FeaturesResponse(
        required_inputs=REQUIRED_INPUTS,
        engineered_features=ENGINEERED_FEATURES,
        model_input_features=MODEL_INPUT_FEATURES
    )
