class PredictionError(Exception):
    def __init__(self, detail: str, status_code: int = 500):
        self.detail = detail
        self.status_code = status_code
        super().__init__(self.detail)


class ModelNotLoadedError(PredictionError):
    def __init__(self, model_name: str = ''):
        msg = f'Model not loaded: {model_name}' if model_name else 'Models not loaded'
        super().__init__(msg, status_code=503)


class ValidationError(Exception):
    def __init__(self, errors: list[str]):
        self.errors = errors
        self.detail = {'errors': errors}
        super().__init__(str(errors))
