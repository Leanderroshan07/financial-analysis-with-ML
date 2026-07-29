import sys
import importlib.util
from pathlib import Path
from typing import Optional
from ..core.logger import logger


class ModelLoader:
    _instance: Optional['ModelLoader'] = None
    _pipeline = None

    def __new__(cls, models_dir: Path):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self, models_dir: Path):
        if hasattr(self, '_initialized'):
            return
        self._initialized = True
        self.models_dir = models_dir
        self._pipeline = None

    def load(self):
        try:
            pipeline_file = self.models_dir / 'prediction_pipeline.py'
            if not pipeline_file.exists():
                raise FileNotFoundError(f'Pipeline file not found: {pipeline_file}')

            spec = importlib.util.spec_from_file_location('prediction_pipeline', str(pipeline_file))
            module = importlib.util.module_from_spec(spec)
            sys.modules['prediction_pipeline'] = module
            spec.loader.exec_module(module)
            PredictionPipeline = module.PredictionPipeline

            self._pipeline = PredictionPipeline(models_dir=str(self.models_dir))
            logger.info('Models and pipeline loaded successfully')
            return self._pipeline
        except Exception as e:
            logger.error(f'Failed to load models: {e}')
            raise

    @property
    def pipeline(self):
        return self._pipeline

    @property
    def is_loaded(self):
        return self._pipeline is not None
