import logging
import smtplib
from email.message import EmailMessage

from .config import settings

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, body: str) -> None:
    """Send mail through configured SMTP (Mailpit locally, or Gmail in .env)."""
    if not settings.smtp_from:
        logger.error("SMTP_FROM is empty; cannot send email to %s", to)
        raise RuntimeError("SMTP_FROM is not configured")

    message = EmailMessage()
    message["From"] = settings.smtp_from
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body)

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
            if settings.smtp_use_tls:
                smtp.starttls()
            if settings.smtp_username and settings.smtp_password:
                smtp.login(settings.smtp_username, settings.smtp_password)
            smtp.send_message(message)
        logger.info("Email sent to %s (%s)", to, subject)
    except Exception:
        # BackgroundTasks still finish the HTTP response; log clearly for local debug.
        logger.exception(
            "Failed to send email to %s via %s:%s",
            to,
            settings.smtp_host,
            settings.smtp_port,
        )
        raise
