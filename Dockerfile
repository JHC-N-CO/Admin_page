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

# 환경변수
ENV FLASK_APP=app.py

# Gunicorn으로 실행 (프로덕션)
# --timeout: /send_email 등 동기 처리 시 워커 타임아웃 방지
CMD ["gunicorn", "-b", "0.0.0.0:5000", "-w", "4", "--timeout", "120", "--graceful-timeout", "30", "app:app"] 
