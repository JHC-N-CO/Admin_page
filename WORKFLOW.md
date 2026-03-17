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
