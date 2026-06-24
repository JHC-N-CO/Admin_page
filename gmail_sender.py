"""Gmail API를 통한 이메일 발송 (HTTPS/443, SMTP 포트 불필요)."""

from __future__ import annotations

import base64
import logging

from flask import current_app
from flask_mail import Mail, Message
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send'


def is_gmail_api_configured() -> bool:
    cfg = current_app.config
    return bool(
        cfg.get('GMAIL_CLIENT_ID')
        and cfg.get('GMAIL_CLIENT_SECRET')
        and cfg.get('GMAIL_REFRESH_TOKEN')
    )


def _get_gmail_credentials() -> Credentials:
    cfg = current_app.config
    client_id = cfg['GMAIL_CLIENT_ID']
    client_secret = cfg['GMAIL_CLIENT_SECRET']
    refresh_token = cfg['GMAIL_REFRESH_TOKEN']

    creds = Credentials(
        token=None,
        refresh_token=refresh_token,
        token_uri='https://oauth2.googleapis.com/token',
        client_id=client_id,
        client_secret=client_secret,
        scopes=[GMAIL_SEND_SCOPE],
    )
    if not creds.valid:
        creds.refresh(Request())
    return creds


def _get_gmail_service():
    return build('gmail', 'v1', credentials=_get_gmail_credentials(), cache_discovery=False)


def send_via_gmail_api(message: Message) -> dict:
    """Flask-Mail Message를 Gmail API로 발송."""
    if not is_gmail_api_configured():
        raise RuntimeError(
            'Gmail API 설정이 없습니다. GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, '
            'GMAIL_REFRESH_TOKEN을 config.env에 설정하거나 '
            'scripts/gmail_oauth_setup.py 로 발급하세요.'
        )

    raw = base64.urlsafe_b64encode(message.as_bytes()).decode('ascii')
    try:
        return _get_gmail_service().users().messages().send(
            userId='me',
            body={'raw': raw},
        ).execute()
    except HttpError as exc:
        logging.error('Gmail API send failed: %s', exc)
        raise RuntimeError(f'Gmail API 발송 실패: {exc}') from exc


def send_outbound_email(mail: Mail, message: Message) -> None:
    """MAIL_TRANSPORT 설정에 따라 Gmail API 또는 SMTP로 발송."""
    transport = (current_app.config.get('MAIL_TRANSPORT') or 'gmail_api').lower()
    if transport == 'smtp':
        mail.send(message)
        return
    if transport == 'gmail_api':
        send_via_gmail_api(message)
        return
    raise ValueError(f'지원하지 않는 MAIL_TRANSPORT: {transport}')
