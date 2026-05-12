from __future__ import annotations

import json
import logging
from html import escape
from dataclasses import dataclass
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class EmailDeliveryError(Exception):
    message: str


def build_email_otp_html(name: str, otp: str) -> str:
    safe_name = escape(name)
    safe_otp = escape(otp)
    login_url = f"{settings.frontend_app_url.rstrip('/')}/login"
    return f"""
<!doctype html>
<html>
  <body style="margin:0;background:#f4f7fb;font-family:Inter,Segoe UI,Arial,sans-serif;color:#1f2937;">
    <div style="max-width:640px;margin:0 auto;padding:32px 16px;">
      <div style="background:linear-gradient(135deg,#0f172a 0%,#1d4ed8 100%);border-radius:24px;padding:32px;color:#fff;">
        <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;opacity:.85;margin-bottom:12px;">Parkely</div>
        <h1 style="margin:0 0 12px;font-size:28px;line-height:1.2;">Verify your email address</h1>
        <p style="margin:0;font-size:16px;line-height:1.7;opacity:.95;">Hi {safe_name}, use the verification code below to activate your Parkely account.</p>
      </div>
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:24px;margin-top:20px;padding:28px;box-shadow:0 10px 30px rgba(15,23,42,.06);">
        <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#4b5563;">Enter this one-time code in the app. It expires soon for your security.</p>
        <div style="background:#eff6ff;border:1px dashed #3b82f6;border-radius:18px;padding:20px;text-align:center;margin:24px 0;">
          <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#2563eb;margin-bottom:10px;">Verification Code</div>
          <div style="font-size:36px;font-weight:800;letter-spacing:.28em;color:#0f172a;font-family:ui-monospace,SFMono-Regular,Consolas,Monaco,monospace;">{safe_otp}</div>
        </div>
        <div style="text-align:center;margin:28px 0 12px;">
          <a href="{login_url}" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:14px 22px;border-radius:999px;font-weight:700;font-size:14px;">Open Parkely</a>
        </div>
        <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#6b7280;">If you did not create this account, you can ignore this email.</p>
        <p style="margin:0;font-size:14px;line-height:1.6;color:#6b7280;">Need help? Contact support or request a new code from the sign-in page.</p>
      </div>
      <div style="text-align:center;color:#94a3b8;font-size:12px;line-height:1.6;padding:18px 10px;">
        Parkely smart parking system
      </div>
    </div>
  </body>
</html>
"""


def build_email_otp_text(name: str, otp: str) -> str:
    return (
        f"Hi {name},\n\n"
        "Use the following code to verify your Parkely account:\n\n"
        f"{otp}\n\n"
        f"This code expires in {settings.email_otp_expire_minutes} minutes.\n\n"
        "If you did not create this account, you can ignore this email."
    )


def build_password_reset_email_html(name: str, reset_url: str) -> str:
    safe_name = escape(name)
    safe_url = escape(reset_url)
    return f"""
<!doctype html>
<html>
  <body style="margin:0;background:#f4f7fb;font-family:Inter,Segoe UI,Arial,sans-serif;color:#1f2937;">
    <div style="max-width:640px;margin:0 auto;padding:32px 16px;">
      <div style="background:linear-gradient(135deg,#111827 0%,#7c3aed 100%);border-radius:24px;padding:32px;color:#fff;">
        <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;opacity:.85;margin-bottom:12px;">Parkely</div>
        <h1 style="margin:0 0 12px;font-size:28px;line-height:1.2;">Reset your password</h1>
        <p style="margin:0;font-size:16px;line-height:1.7;opacity:.95;">Hi {safe_name}, we received a request to reset your Parkely password.</p>
      </div>
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:24px;margin-top:20px;padding:28px;box-shadow:0 10px 30px rgba(15,23,42,.06);">
        <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#4b5563;">Click the secure link below to choose a new password. The link expires soon for safety.</p>
        <div style="text-align:center;margin:28px 0 12px;">
          <a href="{safe_url}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:14px 22px;border-radius:999px;font-weight:700;font-size:14px;">Reset Password</a>
        </div>
        <p style="margin:18px 0 8px;font-size:14px;line-height:1.6;color:#6b7280;">If the button does not work, paste this link into your browser:</p>
        <p style="word-break:break-all;margin:0;font-size:13px;line-height:1.7;color:#2563eb;">{safe_url}</p>
        <p style="margin:20px 0 0;font-size:14px;line-height:1.6;color:#6b7280;">If you did not request this, you can safely ignore this email.</p>
      </div>
    </div>
  </body>
</html>
"""


def build_password_reset_email_text(name: str, reset_url: str) -> str:
    return (
        f"Hi {name},\n\n"
        "We received a request to reset your Parkely password.\n\n"
        f"Reset your password here: {reset_url}\n\n"
        "If you did not request this, you can ignore this email."
    )


def send_resend_email(
    *,
    api_key: str | None = None,
    from_email: str | None = None,
    to_email: str,
    subject: str,
    html: str,
    text: str | None = None,
) -> dict:
    resolved_api_key = api_key or settings.resend_api_key
    resolved_from_email = from_email or settings.resend_from_email
    if not resolved_api_key:
        raise EmailDeliveryError("Resend API key is not configured")
    if not resolved_from_email:
        raise EmailDeliveryError("Resend from email is not configured")

    payload = json.dumps(
        {
            "from": resolved_from_email,
            "to": [to_email],
            "subject": subject,
            "html": html,
            **({"text": text} if text else {}),
        }
    ).encode("utf-8")

    req = Request(
        "https://api.resend.com/emails",
        data=payload,
        headers={
            "Authorization": f"Bearer {resolved_api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "parkely-backend/1.0",
        },
        method="POST",
    )

    try:
        with urlopen(req, timeout=15) as response:
            body = response.read().decode("utf-8")
            logger.info("Resend email response for %s: %s", to_email, body)
            return json.loads(body) if body else {}
    except HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="ignore")
        try:
            details = json.loads(raw)
        except Exception:
            details = raw
        logger.error(
            "Resend HTTP error %s while sending email from %s to %s: %s",
            exc.code,
            resolved_from_email,
            to_email,
            details,
        )
        raise EmailDeliveryError(f"Failed to send email via Resend: {details}") from exc
    except URLError as exc:
        logger.exception("Unexpected error while sending email from %s to %s via Resend", resolved_from_email, to_email)
        raise EmailDeliveryError(f"Failed to send email via Resend: {exc.reason}") from exc
