import time
import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from ..core.logger import logger


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())[:8]
        start = time.time()

        body = None
        if request.method in ('POST', 'PUT', 'PATCH'):
            try:
                body = await request.json()
            except Exception:
                pass

        logger.info(
            '--> %s | %s %s | Body: %s',
            request_id, request.method, request.url.path,
            str(body)[:200] if body else 'none'
        )

        response = await call_next(request)

        elapsed = (time.time() - start) * 1000
        response.headers['X-Request-ID'] = request_id

        logger.info(
            '<-- %s | %s %s | %s | %.2fms',
            request_id, request.method, request.url.path,
            response.status_code, elapsed
        )

        return response
