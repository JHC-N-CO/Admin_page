#!/usr/bin/env python3
"""Gmail API 연결·테스트 발송."""

import os
import sys

from dotenv import load_dotenv

load_dotenv('config.env')
if os.path.isfile('config.env.local'):
    load_dotenv('config.env.local', override=True)

from flask import Flask
from flask_mail import Message

from config import config
from gmail_sender import send_via_gmail_api, is_gmail_api_configured

app = Flask(__name__)
config_name = os.environ.get('FLASK_ENV', 'development')
app.config.from_object(config[config_name])


def main():
    with app.app_context():
        print(f'MAIL_TRANSPORT={app.config.get("MAIL_TRANSPORT")}')
        print(f'MAIL_DEFAULT_SENDER={app.config.get("MAIL_DEFAULT_SENDER")}')
        print(f'Gmail API configured={is_gmail_api_configured()}')
        print()

        if not is_gmail_api_configured():
            print('FAIL: GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET / GMAIL_REFRESH_TOKEN 필요')
            print('→ python3 scripts/gmail_oauth_setup.py credentials.json')
            sys.exit(1)

        test_to = os.environ.get('GMAIL_TEST_RECIPIENT') or app.config.get('MAIL_DEFAULT_SENDER')
        if not test_to:
            print('FAIL: MAIL_DEFAULT_SENDER 또는 GMAIL_TEST_RECIPIENT 설정 필요')
            sys.exit(1)

        sender = app.config.get('MAIL_DEFAULT_SENDER')
        reply_to = app.config.get('MAIL_REPLY_TO') or sender

        print(f'1) Gmail API 테스트 발송 → {test_to} ...')
        msg = Message(
            subject='[테스트] Gmail API 발송 확인',
            recipients=[test_to],
            html='<p>Gmail API 연동 테스트 메일입니다.</p>',
            sender=sender,
            reply_to=reply_to,
        )
        try:
            result = send_via_gmail_api(msg)
            print(f'   OK — message id: {result.get("id")}')
        except Exception as exc:
            print(f'   FAIL: {exc}')
            sys.exit(1)


if __name__ == '__main__':
    main()
