import time
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from ..core.logger import logger


class TimingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.time()
        response: Response = await call_next(request)
        elapsed = (time.time() - start) * 1000
        response.headers['X-Processing-Time-Ms'] = str(round(elapsed, 2))
        if elapsed > 100:
            logger.warning(f'Slow request: {request.method} {request.url.path} ({elapsed:.2f}ms)')
        return response
