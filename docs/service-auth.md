# Service authentication

All business APIs in Gateway, Content, Analytics and AI require a User Service bearer access token.
Each service validates the token using GET /api/v1/users/me, including direct calls that bypass Gateway.
This checks JWT signature, expiry, issuer/audience and the current account status. Identity-service failures
return 503; invalid/missing tokens return 401. No shared JWT signing secret is copied to other services.

- Set USER_SERVICE_URL for Content, Analytics and AI (local default http://localhost:8001; Docker http://user-service:8000).
- Gateway uses its existing USER_SERVICE_URL. Login, registration, email verification/reset and refresh remain public auth operations.
- GET health endpoints remain public; they do not expose account data.
- Content authentication is always enabled. CONTENT_REQUIRE_AUTH no longer disables it.
- Content lists and CRUD are restricted to the verified owner, including folders, cards, questions and legacy lesson routes.
- Legacy decks/folders without an owner are not automatically assigned or exposed as private account content.
- Analytics ignores request userId in query/body, including nested batch reviews, and always reads/writes the verified account.
- AI ignores x-user-id. Conversation ownership is checked against the verified account. All generation routes,
  including root aliases and /internal/questions/generate, require the same bearer token.
- Content forwards the caller token to AI only when generating a new deck test. Retrying saved questions needs no AI call.
- Web private API calls send the current haru-account accessToken; mobile already sends bearer tokens.
- Web refreshes an expired access token once using the HttpOnly refresh cookie, shares concurrent refreshes,
  and returns to login when the refresh token is invalid. A temporary User Service outage does not delete the session.
- The optional AI demo accepts an access token instead of a free-form user ID.

Tokens continue to follow User Service expiry rules. A valid token does not grant access to another account's content.
No existing account/content ownership is changed by this update.
