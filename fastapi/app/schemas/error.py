from pydantic import BaseModel
from typing import Any


class ErrorResponse(BaseModel):
    status: str = 'error'
    message: str
    details: Any = None


class ValidationErrorResponse(BaseModel):
    status: str = 'error'
    message: str = 'Validation failed'
    errors: list[str]
