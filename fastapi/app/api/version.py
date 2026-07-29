from fastapi import APIRouter
from ..core.config import get_settings
from ..core.logger import logger
from ..schemas.response import VersionResponse

router = APIRouter()


@router.get('/version', response_model=VersionResponse, tags=['Version'])
async def version():
    from ..main import get_prediction_service
    service = get_prediction_service()
    metadata = service.pipeline.metadata
    rec_meta = metadata.get('recommendation_model', {})
    pat_meta = metadata.get('pattern_model', {})

    logger.info('Version info requested')
    return VersionResponse(
        api_version=get_settings().APP_VERSION,
        pipeline_version='1.0.0',
        model_versions={
            'recommendation': rec_meta.get('model_version', 'unknown'),
            'pattern': pat_meta.get('model_version', 'unknown')
        }
    )
