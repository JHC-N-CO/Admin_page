#!/usr/bin/env python3
"""서버/로컬에서 SMTP 연결·로그인을 테스트합니다."""

import os
import socket
import smtplib
import sys

from dotenv import load_dotenv

load_dotenv('config.env')
if os.path.isfile('config.env.local'):
    load_dotenv('config.env.local', override=True)

server = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
port = int(os.environ.get('MAIL_PORT', 587))
username = os.environ.get('MAIL_USERNAME', '')
password = os.environ.get('MAIL_PASSWORD', '')
use_tls = os.environ.get('MAIL_USE_TLS', 'True').lower() == 'true'
use_ssl = os.environ.get('MAIL_USE_SSL', 'False').lower() == 'true'
timeout = int(os.environ.get('MAIL_TIMEOUT', '30'))


def main():
    print(f'MAIL_SERVER={server}:{port}')
    print(f'MAIL_USERNAME={username}')
    print(f'MAIL_USE_TLS={use_tls} MAIL_USE_SSL={use_ssl} timeout={timeout}s')
    print()

    try:
        print(f'1) TCP 연결 테스트 → {server}:{port} (IPv4) ...')
        infos = socket.getaddrinfo(server, port, socket.AF_INET, socket.SOCK_STREAM)
        addr = infos[0][4]
        sock = socket.create_connection(addr, timeout=timeout)
        sock.close()
        print('   OK')
    except OSError as e:
        print(f'   FAIL: {e}')
        print('   → Docker/방화벽에서 SMTP 아웃바운드가 막혔을 수 있습니다.')
        sys.exit(1)

    try:
        print('2) SMTP 로그인 테스트 ...')
        if use_ssl:
            smtp = smtplib.SMTP_SSL(server, port, timeout=timeout)
        else:
            _orig = socket.getaddrinfo
            socket.getaddrinfo = lambda h, p, family=0, type=0, proto=0, flags=0: _orig(
                h, p, socket.AF_INET, type or socket.SOCK_STREAM, proto, flags
            )
            try:
                smtp = smtplib.SMTP(server, port, timeout=timeout)
            finally:
                socket.getaddrinfo = _orig
        if use_tls:
            smtp.starttls()
        if username and password:
            smtp.login(username, password)
        smtp.quit()
        print('   OK — SMTP 설정이 정상입니다.')
    except smtplib.SMTPAuthenticationError as e:
        print(f'   FAIL (인증): {e}')
        print('   → 비밀번호/앱 비밀번호 또는 SMTP 서버 주소를 확인하세요.')
        sys.exit(1)
    except Exception as e:
        print(f'   FAIL: {type(e).__name__}: {e}')
        sys.exit(1)


if __name__ == '__main__':
    main()
