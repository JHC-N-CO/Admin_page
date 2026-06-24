#!/usr/bin/env python3
"""Gmail API OAuth refresh token 발급 (최초 1회, 브라우저 필요).

사전 준비:
  1. https://console.cloud.google.com/ 에서 프로젝트 생성
  2. Gmail API 활성화
  3. OAuth 동의 화면 설정 (User type: Internal — Workspace 조직 내부용)
  4. 사용자 인증 정보 → OAuth 클라이언트 ID → 데스크톱 앱 → JSON 다운로드

사용:
  python3 scripts/gmail_oauth_setup.py credentials.json

koreaepilepsy@kes.or.kr 계정으로 브라우저 로그인 후,
출력된 값을 서버 config.env 에 붙여넣으세요.
"""

import sys

from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = ['https://www.googleapis.com/auth/gmail.send']


def main():
    creds_file = sys.argv[1] if len(sys.argv) > 1 else 'credentials.json'
    flow = InstalledAppFlow.from_client_secrets_file(creds_file, SCOPES)
    creds = flow.run_local_server(port=0)

    print('\n=== config.env 에 추가 ===\n')
    print('MAIL_TRANSPORT=gmail_api')
    print(f'MAIL_DEFAULT_SENDER=koreaepilepsy@kes.or.kr')
    print(f'MAIL_REPLY_TO=koreaepilepsy@kes.or.kr')
    print(f'GMAIL_CLIENT_ID={creds.client_id}')
    print(f'GMAIL_CLIENT_SECRET={creds.client_secret}')
    print(f'GMAIL_REFRESH_TOKEN={creds.refresh_token}')
    print('\n※ 반드시 koreaepilepsy@kes.or.kr 로 로그인했는지 확인하세요.')


if __name__ == '__main__':
    main()
