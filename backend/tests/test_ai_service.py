import pytest
from fastapi import HTTPException

from app.core.config import settings
from app.services.ai_service import AIService


@pytest.mark.asyncio
async def test_missing_gemini_key_returns_configuration_error(monkeypatch):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")

    with pytest.raises(HTTPException) as error:
        await AIService().answer_question("hi")

    assert error.value.status_code == 503
    assert error.value.detail == "Gemini AI is not configured"


def test_invalid_key_error_is_clear_and_does_not_echo_provider_message():
    class ProviderError(Exception):
        code = 400
        message = "API key not valid: never-echo-this-value"

    error = AIService._provider_error(ProviderError())

    assert error.status_code == 503
    assert "invalid" in error.detail.lower()
    assert "never-echo-this-value" not in error.detail


def test_quota_error_uses_rate_limit_status():
    class ProviderError(Exception):
        code = 429
        message = "Resource exhausted"

    error = AIService._provider_error(ProviderError())

    assert error.status_code == 429
    assert "quota" in error.detail.lower() or "rate limit" in error.detail.lower()