import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import httpx
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import router
from app.auth import authenticate, resolve_user
from app.db import get_db


class AuthTests(unittest.TestCase):
    def setUp(self):
        self.app = FastAPI()
        self.app.middleware("http")(authenticate)
        self.app.include_router(router)
        self.app.include_router(router, prefix="/api/v1/ai")
        self.app.dependency_overrides[get_db] = lambda: AsyncMock()
        self.client = TestClient(self.app)

    def tearDown(self):
        self.client.close()

    def test_all_business_routes_and_aliases_require_bearer_token(self):
        for prefix in ("", "/api/v1/ai"):
            for method, path, body in (
                ("get", "/conversations", None),
                ("post", "/conversations", {"title": "test"}),
                ("post", "/flashcards/generate", {"prompt": "test"}),
                ("post", "/flashcards/complete", {"cards": [{"index": 0, "front": "test"}]}),
                ("post", "/questions/generate", {"words": ["test"]}),
                ("post", "/internal/questions/generate", {"words": ["test"]}),
                ("delete", "/conversations/" + str(uuid4()), None),
                ("post", "/conversations/" + str(uuid4()) + "/messages", {"content": "test"}),
            ):
                with self.subTest(prefix=prefix, path=path):
                    result = self.client.request(method, prefix + path, json=body, headers={"x-user-id": "7"})
                    self.assertEqual(result.status_code, 401)

    def test_uses_verified_identity_and_ignores_spoofed_header(self):
        with patch("app.auth.resolve_user", new=AsyncMock(return_value="7")), patch("app.api.ConversationRepository") as repository:
            repository.return_value.list_by_user = AsyncMock(return_value=[])
            result = self.client.get("/api/v1/ai/conversations", headers={"Authorization": "Bearer signed", "x-user-id": "8"})
            self.assertEqual(result.status_code, 200)
            repository.return_value.list_by_user.assert_awaited_once_with("7")

    def test_cannot_read_or_delete_another_users_conversation(self):
        with patch("app.auth.resolve_user", new=AsyncMock(return_value="7")), patch("app.services.ConversationRepository") as repository:
            repository.return_value.get = AsyncMock(return_value=SimpleNamespace(user_id="8"))
            for method in ("get", "delete"):
                result = self.client.request(method, "/conversations/" + str(uuid4()), headers={"Authorization": "Bearer signed", "x-user-id": "8"})
                self.assertEqual(result.status_code, 404)
            repository.return_value.delete.assert_not_called()

    def test_authenticated_generation_works_without_a_user_id_header(self):
        with patch("app.auth.resolve_user", new=AsyncMock(return_value="7")), patch("app.api.generate_flashcards", new=AsyncMock(return_value=[])) as generate:
            result = self.client.post("/flashcards/generate", headers={"Authorization": "Bearer signed"}, json={"prompt": "create 1 word"})
            self.assertEqual(result.status_code, 200)
            generate.assert_awaited_once()

    def test_health_is_public(self):
        result = self.client.get("/health")
        self.assertEqual(result.status_code, 200)


class IdentityResolverTests(unittest.IsolatedAsyncioTestCase):
    async def test_validates_token_with_user_service(self):
        with patch("app.auth.httpx.AsyncClient") as client:
            client.return_value.__aenter__.return_value.get = AsyncMock(return_value=httpx.Response(200, json={"id": 7}))
            self.assertEqual(await resolve_user("Bearer signed"), "7")
            call = client.return_value.__aenter__.return_value.get.call_args
            self.assertEqual(call.kwargs["headers"]["Authorization"], "Bearer signed")

    async def test_rejects_invalid_expired_or_disabled_user_tokens(self):
        for status in (401, 403):
            with patch("app.auth.httpx.AsyncClient") as client:
                client.return_value.__aenter__.return_value.get = AsyncMock(return_value=httpx.Response(status))
                with self.assertRaises(Exception) as caught:
                    await resolve_user("Bearer invalid")
                self.assertEqual(caught.exception.status_code, 401)

    async def test_fails_closed_for_identity_service_errors(self):
        for result in (httpx.Response(503), httpx.Response(200, json={"id": "7"}), httpx.Response(200, text="invalid")):
            with patch("app.auth.httpx.AsyncClient") as client:
                client.return_value.__aenter__.return_value.get = AsyncMock(return_value=result)
                with self.assertRaises(Exception) as caught:
                    await resolve_user("Bearer signed")
                self.assertEqual(caught.exception.status_code, 503)

    async def test_missing_token_is_unauthorized_without_network_access(self):
        for token in (None, "", "Basic fake", "Bearer"):
            with self.assertRaises(Exception) as caught:
                await resolve_user(token)
            self.assertEqual(caught.exception.status_code, 401)
