from fastapi import APIRouter, Depends
from ..core.logger import logger
from ..schemas.response import ModelInfoResponse

router = APIRouter()


@router.get('/model-info', response_model=ModelInfoResponse, tags=['Model Info'])
async def model_info():
    from ..main import get_prediction_service
    service = get_prediction_service()
    pipeline = service.pipeline
    metadata = pipeline.metadata

    rec_meta = metadata.get('recommendation_model', {})
    pat_meta = metadata.get('pattern_model', {})
    feat_meta = metadata.get('feature_metadata', {})

    logger.info('Model info requested')
    return ModelInfoResponse(
        recommendation_model={
            'version': rec_meta.get('model_version', 'unknown'),
            'type': rec_meta.get('model_type', 'XGBoost'),
            'training_date': rec_meta.get('training_date', 'unknown'),
            'features': rec_meta.get('feature_count', 0),
            'metrics': rec_meta.get('test_metrics', {}),
            'cross_validation': rec_meta.get('cross_validation', {})
        },
        pattern_model={
            'version': pat_meta.get('model_version', 'unknown'),
            'type': pat_meta.get('model_type', 'XGBoost'),
            'training_date': pat_meta.get('training_date', 'unknown'),
            'classes': pat_meta.get('classes', []),
            'num_classes': pat_meta.get('num_classes', 0),
            'metrics': pat_meta.get('test_metrics', {}),
            'cross_validation': pat_meta.get('cross_validation', {})
        },
        feature_count=len(feat_meta.get('selected_features', [])),
        dataset_version=rec_meta.get('dataset_version', 'v2'),
        pipeline_version='1.0.0'
    )
