import asyncio
from fastapi import HTTPException
from openai import APITimeoutError


def ai_http_error(error: Exception) -> HTTPException:
    status = getattr(error, "status_code", None)
    if status == 429:
        daily = any(marker in str(error).lower() for marker in ("per day", "perday", "requests_per_day"))
        return HTTPException(429, detail={
            "code": "AI_QUOTA_EXCEEDED" if daily else "AI_RATE_LIMITED",
            "message": "Model AI đã hết quota trong ngày. Vui lòng chờ quota được cấp lại hoặc kiểm tra hạn mức trong Google AI Studio."
                if daily else "AI đang chạm giới hạn request. Vui lòng thử lại sau ít phút.",
        })
    if isinstance(error, (asyncio.TimeoutError, APITimeoutError)):
        return HTTPException(504, detail={"code": "AI_TIMEOUT", "message": "AI phản hồi quá lâu. Vui lòng thử lại sau."})
    if status in (401, 403):
        return HTTPException(503, detail={"code": "AI_PROVIDER_AUTH_FAILED", "message": "API key của nhà cung cấp AI không hợp lệ hoặc chưa có quyền dùng model."})
    return HTTPException(502, detail={"code": "AI_GENERATION_FAILED", "message": "AI chưa tạo được nội dung hợp lệ. Vui lòng thử lại."})
