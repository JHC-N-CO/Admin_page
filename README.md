# Admin Page

Flask 기반 관리자 페이지 애플리케이션

## 환경 설정

### 로컬 개발 (Mac에서 코드 수정)

1. `config.env` — 서버용(또는 공통) 설정
2. **`config.env.local`** — 로컬 DB로 덮어쓰기 (필수)

```bash
cp config.env.local.example config.env.local
python3 scripts/setup_local_db.py   # 로컬 DB·테이블 생성
python3 app.py
```

로컬 DB: `postgresql://<mac사용자>@127.0.0.1:5432/admin_page` (Homebrew Postgres 기본 사용자는 `postgres`가 아님)

### 서버 배포

1. 서버에 `config.env` 만 두고 (`config.env.local` 없음)
2. `config.env.server` 참고해 프로덕션 `DATABASE_URL` 설정
3. Docker:

```bash
docker compose up -d --build
```

자세한 흐름은 [WORKFLOW.md](WORKFLOW.md) 참고.

## 주의사항
- `config.env.local` 없이 로컬 실행 시 **프로덕션 DB에 연결**될 수 있음
- 환경 변수 파일들은 Git에 포함되지 않습니다
- 데이터베이스 비밀번호는 안전하게 관리하세요 