import os
from pathlib import Path
from functools import lru_cache

BASE_DIR = Path(__file__).resolve().parent.parent.parent
PRODUCTION_MODELS_DIR = BASE_DIR / 'production_models'
LOGS_DIR = BASE_DIR / 'logs'
REPORTS_DIR = BASE_DIR / 'reports'

class Settings:
    APP_NAME: str = 'AI Financial Purchase Advisor API'
    APP_VERSION: str = '1.0.0'
    API_V1_PREFIX: str = '/api/v1'
    API_DESCRIPTION: str = 'AI-powered financial purchase recommendation and pattern analysis service.'

    HOST: str = os.getenv('AI_API_HOST', '0.0.0.0')
    PORT: int = int(os.getenv('AI_API_PORT', '8000'))
    RELOAD: bool = os.getenv('AI_API_RELOAD', 'false').lower() == 'true'
    LOG_LEVEL: str = os.getenv('AI_API_LOG_LEVEL', 'INFO')

    CORS_ORIGINS: list[str] = [
        origin.strip()
        for origin in os.getenv('AI_API_CORS_ORIGINS', '*').split(',')
    ]

    MODELS_DIR: Path = PRODUCTION_MODELS_DIR
    LOGS_DIR: Path = LOGS_DIR
    REPORTS_DIR: Path = REPORTS_DIR

    REQUEST_TIMEOUT: int = int(os.getenv('AI_API_REQUEST_TIMEOUT', '30'))
    MAX_BATCH_SIZE: int = int(os.getenv('AI_API_MAX_BATCH_SIZE', '100'))

    class Config:
        env_file = '.env'
        case_sensitive = True

    PREDICTION_LATENCY_WARN_MS: int = 100


@lru_cache()
def get_settings() -> Settings:
    return Settings()
