# 코드 수정 후 해야 할 일

## 1. GitHub에 올리기 (로컬)

```bash
cd /Users/jhc/Downloads/Coding/Admin_page

git add .
git commit -m "변경 내용 요약"
git push origin main
```

---

## 2. 웹서버에 배포

```bash
# SSH 접속
ssh jhc@Webserver

# 앱 폴더로 이동
cd ~/Admin_page

# 최신 코드 가져오기
git pull origin main

# Docker 재시작
docker compose down
docker compose up -d --build
```

---

## 요약

| 단계 | 위치 | 명령어 |
|------|------|--------|
| 1. Push | 로컬 (Mac) | `git add .` → `git commit -m "..."` → `git push origin main` |
| 2. Pull | 웹서버 | `cd ~/Admin_page` → `git pull origin main` |
| 3. 재시작 | 웹서버 | `docker compose down` → `docker compose up -d --build` |

---

## 참고

- **config.env**: GitHub에 없음. 서버에 이미 있으면 수정할 필요 없음.
- **uploads/**: Docker volume으로 유지됨. 재배포해도 파일 유지.

---

## 로컬 개발 vs 서버 DB (중요)

| 환경 | 설정 파일 | 데이터베이스 |
|------|-----------|--------------|
| **로컬 (Mac)** | `config.env` + **`config.env.local`** (덮어씀) | `127.0.0.1` / `admin_page` |
| **서버** | `config.env` 만 | `146.190.96.68` / `jhc_conference_db` |

로컬에서 `config.env.local` 이 없으면 **프로덕션 DB에 직접 연결**됩니다. 반드시 로컬 파일을 두세요.

### 로컬 DB 최초 설정

```bash
cp config.env.local.example config.env.local
# 필요 시 DATABASE_URL 의 사용자명을 Mac Postgres 사용자로 수정 (보통 whoami 결과)

python3 scripts/setup_local_db.py   # 테이블 생성
python3 app.py                      # 또는 flask run
```

### 로컬에서 앱 실행 전 체크

```bash
pg_isready -h 127.0.0.1 -p 5432
python3 -c "from config import config; import os; print(os.environ.get('DATABASE_URL','').split('@')[-1])"
# → 127.0.0.1:5432/admin_page 이어야 함 (로컬)
```
