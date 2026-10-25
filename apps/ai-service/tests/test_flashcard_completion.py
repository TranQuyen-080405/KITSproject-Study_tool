import json
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import router
from app.auth import authenticate
from app.flashcard_completion import complete_flashcards
from app.schemas import PartialFlashcard


class CompletionTests(unittest.IsolatedAsyncioTestCase):
    async def test_fills_both_directions_by_index_and_preserves_existing_text(self):
        cards = [PartialFlashcard(index=10, front="사과"), PartialFlashcard(index=20, back="Con mèo"),
                 PartialFlashcard(index=30, front="물", back="Nước")]
        llm = SimpleNamespace(ainvoke=AsyncMock(return_value=SimpleNamespace(content=json.dumps({"cards": [
            {"index": 20, "value": "고양이"}, {"index": 10, "value": "Quả táo"},
        ]}))))
        with patch("app.flashcard_completion.create_llm", return_value=llm):
            result = await complete_flashcards(SimpleNamespace(llm_total_timeout_seconds=45, llm_model="test"), cards)
        self.assertEqual(result, [
            {"index": 10, "front": "사과", "back": "Quả táo"},
            {"index": 20, "front": "고양이", "back": "Con mèo"},
            {"index": 30, "front": "물", "back": "Nước"},
        ])
        sent = json.loads(llm.ainvoke.call_args.args[0][1].content)
        self.assertEqual([item["field"] for item in sent], ["back", "front"])
        llm.ainvoke.assert_awaited_once()

    async def test_batches_twenty_rows_per_call_instead_of_per_word(self):
        cards = [PartialFlashcard(index=index, front="물") for index in range(21)]
        responses = [SimpleNamespace(content=json.dumps({"cards": [
            {"index": index, "value": "Nước"} for index in indexes
        ]})) for indexes in (range(20), range(20, 21))]
        llm = SimpleNamespace(ainvoke=AsyncMock(side_effect=responses))
        with patch("app.flashcard_completion.create_llm", return_value=llm):
            result = await complete_flashcards(SimpleNamespace(llm_total_timeout_seconds=45, llm_model="test"), cards)
        self.assertEqual(len(result), 21)
        self.assertEqual(llm.ainvoke.await_count, 2)

    async def test_complete_cards_do_not_call_llm(self):
        with patch("app.flashcard_completion.create_llm") as create:
            result = await complete_flashcards(SimpleNamespace(llm_total_timeout_seconds=45, llm_model="test"), [PartialFlashcard(index=0, front="물", back="Nước")])
        create.assert_not_called()
        self.assertEqual(result[0]["front"], "물")

    async def test_rejects_missing_duplicate_extra_and_empty_completions(self):
        for entries in ([], [{"index": 0, "value": ""}], [{"index": 1, "value": "Nước"}],
                        [{"index": 0, "value": "Nước"}, {"index": 0, "value": "Nước"}],
                        [{"index": "0", "value": "Nước"}]):
            llm = SimpleNamespace(ainvoke=AsyncMock(return_value=SimpleNamespace(content=json.dumps({"cards": entries}))))
            with self.subTest(entries=entries), patch("app.flashcard_completion.create_llm", return_value=llm):
                with self.assertRaises(ValueError):
                    await complete_flashcards(SimpleNamespace(llm_total_timeout_seconds=45, llm_model="test"), [PartialFlashcard(index=0, front="물")])


class CompletionApiTests(unittest.TestCase):
    def setUp(self):
        app = FastAPI()
        app.middleware("http")(authenticate)
        app.include_router(router, prefix="/api/v1/ai")
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()

    def test_requires_authentication(self):
        self.assertEqual(self.client.post("/api/v1/ai/flashcards/complete", json={"cards": [{"index": 0, "front": "물"}]}).status_code, 401)

    def test_validates_input_and_returns_completed_cards(self):
        with patch("app.auth.resolve_user", new=AsyncMock(return_value="7")), patch("app.api.complete_flashcards", new=AsyncMock(return_value=[
            {"index": 0, "front": "물", "back": "Nước"},
        ])) as complete:
            headers = {"Authorization": "Bearer signed"}
            response = self.client.post("/api/v1/ai/flashcards/complete", headers=headers, json={"cards": [{"index": 0, "front": "물"}]})
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()["cards"][0]["back"], "Nước")
            for cards in ([{"index": 0, "front": " "}], [{"index": 0, "front": "물"}] * 2,
                          [{"index": i, "front": "물"} for i in range(201)]):
                self.assertEqual(self.client.post("/api/v1/ai/flashcards/complete", headers=headers, json={"cards": cards}).status_code, 422)
            complete.assert_awaited_once()

    def test_ai_failure_returns_502_without_partial_results(self):
        with patch("app.auth.resolve_user", new=AsyncMock(return_value="7")), patch("app.api.complete_flashcards", new=AsyncMock(side_effect=ValueError("provider details"))):
            response = self.client.post("/api/v1/ai/flashcards/complete", headers={"Authorization": "Bearer signed"}, json={"cards": [{"index": 0, "front": "물"}]})
            self.assertEqual(response.status_code, 502)
            self.assertNotIn("provider details", response.text)
            self.assertNotIn("cards", response.json())
