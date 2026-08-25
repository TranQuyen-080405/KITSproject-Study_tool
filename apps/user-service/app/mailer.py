import logging

import requests

from .config import settings

logger = logging.getLogger(__name__)

BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email"


def send_email(to: str, subject: str, body: str) -> None:
    """Send transactional email through Brevo HTTPS API."""
    if not settings.brevo_api_key:
        raise RuntimeError("BREVO_API_KEY is not configured")

    if not settings.email_from:
        raise RuntimeError("EMAIL_FROM is not configured")

    payload = {
        "sender": {
            "name": settings.email_from_name,
            "email": settings.email_from,
        },
        "to": [{"email": to}],
        "subject": subject,
        "textContent": body,
    }

    headers = {
        "accept": "application/json",
        "api-key": settings.brevo_api_key,
        "content-type": "application/json",
    }

    try:
        response = requests.post(
            BREVO_SEND_URL,
            json=payload,
            headers=headers,
            timeout=10,
        )
        response.raise_for_status()

        logger.info("Email sent to %s via Brevo", to)

    except requests.RequestException:
        logger.exception("Failed to send email to %s via Brevo", to)
        raise
