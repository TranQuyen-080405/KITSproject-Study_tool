import asyncio
import json
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import httpx
from fastapi import FastAPI
from fastapi.testclient import TestClient
from openai import RateLimitError

from app.api import router
from app.auth import authenticate
from app.ai_errors import ai_http_error
from app.config import Settings
from app.deck_questions import generate_deck_questions
from app.llm import create_llm, invoke_model
from app.schemas import WordInput


def quota_error():
    response = httpx.Response(429, request=httpx.Request("POST", "https://provider.invalid"))
    return RateLimitError("GenerateRequestsPerDay quota exceeded", response=response, body={})


class GenerationTests(unittest.IsolatedAsyncioTestCase):
    async def test_maps_one_question_per_id_even_for_duplicate_words(self):
        words = [WordInput(word="말", meaning="horse", vocabulary_id="a"), WordInput(word="말", meaning="speech", vocabulary_id="b")]
        questions = [{"vocabulary_id": identity, "prompt": identity, "options": ["a", "b", "c", "d"], "correct_option_index": 2} for identity in ("b", "a")]
        model = SimpleNamespace(ainvoke=AsyncMock(return_value=SimpleNamespace(content=json.dumps({"questions": questions}))))
        settings = SimpleNamespace(llm_model="test", llm_total_timeout_seconds=1)
        with patch("app.deck_questions.create_llm", return_value=model):
            result = await generate_deck_questions(settings, words)
        self.assertEqual([row["vocabulary_id"] for row in result], ["a", "b"])
        self.assertEqual([row["prompt"] for row in result], ["a", "b"])
        model.ainvoke.assert_awaited_once()

    async def test_rejects_duplicate_or_missing_question_ids(self):
        words = [WordInput(word="말", vocabulary_id="a"), WordInput(word="말", vocabulary_id="b")]
        item = {"vocabulary_id": "a", "prompt": "Meaning?", "options": ["a", "b", "c", "d"], "correct_option_index": 0}
        for questions in ([item], [item, item]):
            model = SimpleNamespace(ainvoke=AsyncMock(return_value=SimpleNamespace(content=json.dumps({"questions": questions}))))
            with patch("app.deck_questions.create_llm", return_value=model):
                with self.assertRaises(ValueError):
                    await generate_deck_questions(SimpleNamespace(llm_model="test", llm_total_timeout_seconds=1), words)

    async def test_total_deadline_cancels_the_model_operation(self):
        cancelled = []
        async def never_finish(_messages):
            try:
                await asyncio.Event().wait()
            finally:
                cancelled.append(True)
        model = SimpleNamespace(ainvoke=AsyncMock(side_effect=never_finish))
        with self.assertRaises(asyncio.TimeoutError):
            await invoke_model(SimpleNamespace(llm_model="test", llm_total_timeout_seconds=0.01), model, [], "test")
        self.assertEqual(cancelled, [True])


class GenerationErrorApiTests(unittest.TestCase):
    def setUp(self):
        app = FastAPI(); app.middleware("http")(authenticate); app.include_router(router, prefix="/api/v1/ai")
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()

    def test_quota_is_not_hidden_behind_502(self):
        with patch("app.auth.resolve_user", new=AsyncMock(return_value="7")), patch("app.api.generate_deck_questions", new=AsyncMock(side_effect=quota_error())) as generate:
            result = self.client.post("/api/v1/ai/questions/generate", headers={"Authorization": "Bearer signed"}, json={
                "words": [{"word": "도서관", "vocabulary_id": "a"}], "question_count": 1, "one_per_word": True,
            })
            self.assertEqual(result.status_code, 429)
            self.assertEqual(result.json()["detail"]["code"], "AI_QUOTA_EXCEEDED")
            generate.assert_awaited_once()

    def test_rejects_a_batch_without_stable_card_ids(self):
        with patch("app.auth.resolve_user", new=AsyncMock(return_value="7")):
            result = self.client.post("/api/v1/ai/questions/generate", headers={"Authorization": "Bearer signed"}, json={
                "words": ["도서관"], "question_count": 1, "one_per_word": True,
            })
            self.assertEqual(result.status_code, 422)

    def test_sdk_does_not_retry_or_fallback_for_quota_errors(self):
        settings = Settings(database_url="postgresql+asyncpg://localhost/test", llm_provider="google",
            llm_model="gemini-3.8-flash", llm_api_key="test", llm_base_url="https://provider.invalid/v1/")
        model = create_llm(settings)
        self.assertEqual(model.runnable.max_retries, 0)
        self.assertTrue(all(fallback.max_retries == 0 for fallback in model.fallbacks))
        self.assertFalse(isinstance(quota_error(), model.exceptions_to_handle))
        self.assertEqual(ai_http_error(asyncio.TimeoutError()).status_code, 504)
