"""HTTP contract tests with isolated DB doubles; no Postgres or email provider required."""
import unittest
from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.database import get_db
from app.main import app
from app.models import User, UserRole, UserStatus
from app.security import create_access_token, token_hash


class MobileAuthTests(unittest.TestCase):
    def setUp(self):
        self.user = User(
            id=7, username="learner", email="learner@example.com", display_name="Learner",
            password_hash="hash", role=UserRole.USER, status=UserStatus.ACTIVE,
            email_verified_at=datetime.now(UTC), created_at=datetime.now(UTC),
            refresh_token_expires_at=datetime.now(UTC) + timedelta(days=1),
        )
        self.db = MagicMock()
        self.db.scalar.return_value = self.user
        self.db.get.return_value = self.user
        app.dependency_overrides[get_db] = lambda: self.db
        self.client = TestClient(app)
        self.password_patch = patch("app.main.verify_password", return_value=True)
        self.password_patch.start()

    def tearDown(self):
        self.password_patch.stop()
        self.client.close()
        app.dependency_overrides.clear()

    def login(self, native=True):
        return self.client.post("/api/v1/auth/login", json={"username": "learner", "password": "password123"}, headers={"X-Client-Platform": "android"} if native else {})

    def test_native_login_returns_refresh_token_but_browser_uses_cookie(self):
        native = self.login()
        self.assertEqual(native.status_code, 200)
        self.assertTrue(native.json()["refreshToken"])
        self.assertEqual(native.json()["user"]["role"], "USER")
        self.assertEqual(self.user.refresh_token_hash, token_hash(native.json()["refreshToken"]))
        browser = self.login(native=False)
        self.assertNotIn("refreshToken", browser.json())
        self.assertIn("HttpOnly", browser.headers["set-cookie"])

    def test_native_refresh_rotates_and_prioritizes_body_over_cookie(self):
        old = self.login().json()["refreshToken"]
        with patch("app.main.token_hash", wraps=token_hash) as hashing:
            response = self.client.post("/api/v1/auth/refresh", json={"refreshToken": "body-token"}, headers={"X-Client-Platform": "android"})
        self.assertEqual(response.status_code, 200)
        self.assertNotEqual(response.json()["refreshToken"], old)
        self.assertEqual(hashing.call_args_list[0].args, ("body-token",))

    def test_unverified_and_suspended_users_cannot_sign_in(self):
        self.user.status = UserStatus.PENDING_VERIFICATION
        self.assertEqual(self.login().json()["error"]["code"], "EMAIL_NOT_VERIFIED")
        self.user.status = UserStatus.SUSPENDED
        self.assertEqual(self.login().status_code, 403)

    def test_logout_clears_refresh_token(self):
        response = self.client.post("/api/v1/auth/logout", json={"refreshToken": "token"})
        self.assertEqual(response.status_code, 204)
        self.assertIsNone(self.user.refresh_token_hash)
        self.assertIsNone(self.user.refresh_token_expires_at)

    def test_profile_requires_valid_token(self):
        self.assertEqual(self.client.get("/api/v1/users/me").status_code, 401)
        response = self.client.get("/api/v1/users/me", headers={"Authorization": "Bearer " + create_access_token(self.user)})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["id"], 7)

    def test_admin_tools_reject_regular_user(self):
        headers = {"Authorization": "Bearer " + create_access_token(self.user)}
        self.assertEqual(self.client.get("/api/v1/users/8", headers=headers).status_code, 403)
        self.assertEqual(self.client.delete("/api/v1/users/8", headers=headers).status_code, 403)

    def test_admin_can_lookup_and_delete(self):
        self.user.role = UserRole.ADMIN
        headers = {"Authorization": "Bearer " + create_access_token(self.user)}
        self.assertEqual(self.client.get("/api/v1/users/7", headers=headers).status_code, 200)
        self.assertEqual(self.client.delete("/api/v1/users/7", headers=headers).status_code, 200)
        self.db.delete.assert_called_once_with(self.user)

    def test_email_verification_activates_account(self):
        verification = MagicMock(expires_at=datetime.now(UTC) + timedelta(minutes=5), token_hash=token_hash("123456"))
        self.user.status = UserStatus.PENDING_VERIFICATION
        self.db.scalar.side_effect = [self.user, verification]
        result = self.client.post("/api/v1/auth/verify-email", json={"email": self.user.email, "code": "123456"})
        self.assertEqual(result.status_code, 200)
        self.assertEqual(self.user.status, UserStatus.ACTIVE)

    def test_password_recovery_sends_email_and_reset_revokes_sessions(self):
        with patch("app.main.send_email") as send:
            self.assertEqual(self.client.post("/api/v1/auth/forgot-password", json={"email": self.user.email}).status_code, 202)
            send.assert_called_once()
        verification = MagicMock(expires_at=datetime.now(UTC) + timedelta(minutes=5), token_hash=token_hash("123456"))
        self.db.scalar.side_effect = [self.user, verification]
        with patch("app.main.hash_password", return_value="new-hash"):
            response = self.client.post("/api/v1/auth/reset-password", json={"email": self.user.email, "code": "123456", "newPassword": "newpassword123"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.user.password_hash, "new-hash")
        self.assertIsNone(self.user.refresh_token_hash)

    def test_google_id_token_is_verified_on_the_server(self):
        from app.config import settings
        with patch.object(settings, "google_client_id", "test-client"), patch("app.main.id_token.verify_oauth2_token", return_value={"sub": "google-123", "email": self.user.email, "email_verified": True}) as verify:
            response = self.client.post("/api/v1/auth/google", json={"idToken": "signed-google-token"}, headers={"X-Client-Platform": "android"})
        self.assertEqual(response.status_code, 200)
        self.assertIn("refreshToken", response.json())
        self.assertEqual(verify.call_args.args[0], "signed-google-token")


if __name__ == "__main__":
    unittest.main()
