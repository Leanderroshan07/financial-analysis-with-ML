import time
from fastapi import APIRouter, Depends
from ..core.config import get_settings
from ..core.logger import logger
from ..schemas.response import HealthResponse
from ..services.prediction_service import PredictionService

router = APIRouter()
_start_time = time.time()


def get_service_status(service: PredictionService = None) -> HealthResponse:
    models_loaded = service is not None and service.pipeline is not None
    return HealthResponse(
        status='healthy' if models_loaded else 'degraded',
        service='AI Financial Purchase Advisor API',
        version=get_settings().APP_VERSION,
        uptime_seconds=round(time.time() - _start_time, 2),
        models_loaded=models_loaded,
        pipeline_ready=models_loaded
    )


@router.get('/health', response_model=HealthResponse, tags=['Health'])
async def health_check():
    from ..main import get_prediction_service
    try:
        service = get_prediction_service()
        status = get_service_status(service)
        logger.info(f'Health check: {status.status}')
        return status
    except Exception:
        logger.warning('Health check: service unavailable')
        return HealthResponse(
            status='unavailable',
            service='AI Financial Purchase Advisor API',
            version=get_settings().APP_VERSION,
            uptime_seconds=round(time.time() - _start_time, 2),
            models_loaded=False,
            pipeline_ready=False
        )
