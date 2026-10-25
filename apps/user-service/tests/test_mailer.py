import unittest
from unittest.mock import patch

from app.config import settings
from app.mailer import send_email


class LocalMailTests(unittest.TestCase):
    def test_local_smtp_delivery_supports_the_verification_inbox(self):
        with patch.object(settings, "brevo_api_key", ""), patch.object(settings, "smtp_host", "mailpit"), patch.object(settings, "smtp_port", 1025), patch.object(settings, "smtp_use_tls", False), patch.object(settings, "smtp_username", ""), patch("app.mailer.smtplib.SMTP") as smtp:
            send_email("learner@example.com", "Verify", "Your code is 123456")
        smtp.assert_called_once_with("mailpit", 1025, timeout=10)
        message = smtp.return_value.__enter__.return_value.send_message.call_args.args[0]
        self.assertEqual(message["To"], "learner@example.com")
        self.assertIn("123456", message.get_content())


if __name__ == "__main__":
    unittest.main()
