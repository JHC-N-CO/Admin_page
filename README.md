# Admin Page

Flask 기반 관리자 페이지 애플리케이션

## 환경 설정

### 로컬 환경
1. `config.env` 파일에서 데이터베이스 연결 정보 확인
2. Docker 컨테이너 실행:
```bash
docker run -d --name admin-page-local -p 5000:5000 --env-file config.env admin-page-new
```

### 서버 환경
1. `config.env.server` 파일을 `config.env`로 복사
2. Docker 컨테이너 실행:
```bash
docker run -d --name admin-page-new --network host --env-file config.env admin-page-new
```

## 주의사항
- 환경 변수 파일들은 Git에 포함되지 않습니다
- 각 환경에 맞는 설정 파일을 사용하세요
- 데이터베이스 비밀번호는 안전하게 관리하세요 