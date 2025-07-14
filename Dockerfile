# 베이스 이미지
FROM python:3.10-slim

# 작업 디렉토리 생성 및 이동
WORKDIR /app

RUN apt-get update && apt-get install -y libpq-dev gcc && rm -rf /var/lib/apt/lists/*
# requirements.txt 복사 및 패키지 설치
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# 소스 코드 전체 복사
COPY . .

# 환경변수 (Flask 실행용)
ENV FLASK_APP=app.py
ENV FLASK_RUN_HOST=0.0.0.0
ENV FLASK_RUN_PORT=5000

# 컨테이너 시작 시 실행할 명령
CMD ["flask", "run"] 
