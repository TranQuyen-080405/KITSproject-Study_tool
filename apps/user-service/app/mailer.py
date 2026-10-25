import logging
import smtplib
from email.message import EmailMessage

import requests

from .config import settings

logger = logging.getLogger(__name__)

BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email"


def send_email(to: str, subject: str, body: str) -> None:
    """Use Brevo when configured; otherwise send through the configured SMTP server."""
    if not settings.brevo_api_key:
        message = EmailMessage()
        message["From"] = settings.smtp_from or settings.email_from or "haru@local.test"
        message["To"] = to
        message["Subject"] = subject
        message.set_content(body)
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
            if settings.smtp_use_tls:
                smtp.starttls()
            if settings.smtp_username:
                smtp.login(settings.smtp_username, settings.smtp_password)
            smtp.send_message(message)
        return

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
