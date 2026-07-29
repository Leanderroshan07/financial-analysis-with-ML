import time
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from .core.config import get_settings, PRODUCTION_MODELS_DIR
from .core.logger import logger
from .core.exceptions import PredictionError, ModelNotLoadedError
from .models.load_models import ModelLoader
from .services.prediction_service import PredictionService
from .middleware.cors import setup_cors
from .middleware.timing import TimingMiddleware
from .middleware.logging import RequestLoggingMiddleware
from .api import prediction, health, model_info, version, features

settings = get_settings()

_service: PredictionService = None


def get_prediction_service() -> PredictionService:
    global _service
    if _service is None:
        raise PredictionError('Service not initialized', status_code=503)
    return _service


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _service
    logger.info('Starting AI Financial Purchase Advisor API...')
    try:
        loader = ModelLoader(PRODUCTION_MODELS_DIR)
        pipeline = loader.load()
        _service = PredictionService(pipeline)
        logger.info('Models and prediction service initialized successfully')
    except Exception as e:
        logger.error(f'Failed to initialize service: {e}')
    yield
    logger.info('Shutting down AI Financial Purchase Advisor API...')


app = FastAPI(
    title=settings.APP_NAME,
    description=settings.API_DESCRIPTION,
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url='/docs',
    redoc_url='/redoc',
    openapi_url='/openapi.json',
    contact={
        'name': 'AI Financial Purchase Advisor',
        'url': 'https://github.com/anomalyco/moneyyy',
    }
)

setup_cors(app)
app.add_middleware(TimingMiddleware)
app.add_middleware(RequestLoggingMiddleware)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for err in exc.errors():
        field = '.'.join(str(loc) for loc in err.get('loc', []))
        msg = err.get('msg', '')
        errors.append(f'{field}: {msg}')
    logger.warning(f'Validation error: {errors}')
    return JSONResponse(
        status_code=422,
        content={'status': 'error', 'message': 'Validation failed', 'errors': errors}
    )


@app.exception_handler(PredictionError)
async def prediction_error_handler(request: Request, exc: PredictionError):
    logger.error(f'Prediction error: {exc.detail}')
    return JSONResponse(
        status_code=exc.status_code,
        content={'status': 'error', 'message': exc.detail}
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f'Unhandled exception: {exc}', exc_info=True)
    return JSONResponse(
        status_code=500,
        content={'status': 'error', 'message': 'Internal server error'}
    )


app.include_router(prediction.router, prefix=settings.API_V1_PREFIX)
app.include_router(health.router, prefix=settings.API_V1_PREFIX)
app.include_router(model_info.router, prefix=settings.API_V1_PREFIX)
app.include_router(version.router, prefix=settings.API_V1_PREFIX)
app.include_router(features.router, prefix=settings.API_V1_PREFIX)


@app.get('/', tags=['Root'])
async def root():
    return {
        'service': settings.APP_NAME,
        'version': settings.APP_VERSION,
        'docs': '/docs',
        'redoc': '/redoc'
    }
