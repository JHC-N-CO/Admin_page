# 웹서버 배포 가이드

## 1. 웹서버 SSH 접속

```bash
ssh 사용자명@서버IP
```

---

## 2. 코드 가져오기

### 처음 배포하는 경우

```bash
cd /home/사용자명   # 또는 원하는 경로
git clone https://github.com/JHC-N-CO/Admin_page.git
cd Admin_page
```

### 이미 배포된 경우 (업데이트)

```bash
cd /path/to/Admin_page   # 실제 앱 경로
git pull origin main
```

---

## 3. config.env 설정

**config.env 파일이 없으면** 로컬에서 복사해 서버에 생성:

```bash
nano config.env
```

로컬 `config.env` 내용을 붙여넣고 저장 (Ctrl+O, Enter, Ctrl+X)

---

## 4. Docker로 실행

```bash
docker-compose down
docker-compose up -d --build
```

---

## 5. 확인

- 브라우저에서 `http://서버IP:5000` 접속
- 또는 Nginx 리버스 프록시 사용 시 설정된 도메인으로 접속

---

## 업로드 파일 (uploads/) 보존

- `docker-compose.yml`에서 `./uploads`를 volume으로 마운트
- 컨테이너 재빌드해도 uploads 폴더 내용 유지됨
