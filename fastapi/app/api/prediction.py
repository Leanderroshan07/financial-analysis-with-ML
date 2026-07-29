from fastapi import APIRouter, Depends, HTTPException
from ..core.logger import logger
from ..core.exceptions import PredictionError
from ..schemas.request import PredictionRequest, BatchPredictionRequest
from ..schemas.response import PredictionResponse, BatchPredictionResponse
from ..schemas.error import ValidationErrorResponse
from ..services.prediction_service import PredictionService

router = APIRouter()


def get_service():
    from ..main import get_prediction_service
    return get_prediction_service()


@router.post(
    '/predict',
    response_model=PredictionResponse,
    responses={
        400: {'model': ValidationErrorResponse},
        422: {'description': 'Validation Error'},
        503: {'description': 'Service Unavailable'}
    },
    tags=['Prediction']
)
async def predict(
    request: PredictionRequest,
    service: PredictionService = Depends(get_service)
):
    try:
        result = service.predict_single(request)
        return result
    except PredictionError as e:
        logger.error(f'Prediction error: {e.detail}')
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f'Unexpected prediction error: {e}')
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    '/batch-predict',
    response_model=BatchPredictionResponse,
    responses={
        400: {'model': ValidationErrorResponse},
        422: {'description': 'Validation Error'},
        503: {'description': 'Service Unavailable'}
    },
    tags=['Prediction']
)
async def batch_predict(
    request: BatchPredictionRequest,
    service: PredictionService = Depends(get_service)
):
    try:
        result = service.predict_batch(request.requests)
        return result
    except PredictionError as e:
        logger.error(f'Batch prediction error: {e.detail}')
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f'Unexpected batch prediction error: {e}')
        raise HTTPException(status_code=500, detail=str(e))
