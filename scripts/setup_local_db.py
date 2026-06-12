#!/usr/bin/env python3
"""로컬 PostgreSQL에 admin_page DB와 테이블을 생성합니다."""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv

load_dotenv('config.env')
if os.path.isfile('config.env.local'):
    load_dotenv('config.env.local', override=True)

from app import app, init_db  # noqa: E402


def main():
    url = os.environ.get('DATABASE_URL', '')
    if not url:
        print('ERROR: DATABASE_URL이 없습니다. config.env.local 을 설정하세요.')
        sys.exit(1)
    if '146.190.96.68' in url or 'jhc_conference_db' in url:
        print('ERROR: 프로덕션 DB URL입니다. config.env.local 에 로컬 URL을 사용하세요.')
        sys.exit(1)

    print(f'Using: {url.split("@")[-1] if "@" in url else url}')
    init_db()
    print('Done. Local tables are ready.')


if __name__ == '__main__':
    main()
