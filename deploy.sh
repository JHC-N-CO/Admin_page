#!/bin/bash

echo "🚀 Admin Page 배포 시작..."

# 서버 정보 (필요시 수정)
SERVER_IP="your_server_ip"
SERVER_USER="jhc"

echo "📤 코드를 서버에 업로드 중..."
scp -r . $SERVER_USER@$SERVER_IP:~/Admin_page/

echo "🔧 서버에서 컨테이너 재시작 중..."
ssh $SERVER_USER@$SERVER_IP << 'EOF'
cd ~/Admin_page
docker stop admin-page-new || true
docker rm admin-page-new || true
docker build -t admin-page-new .
docker run -d --name admin-page-new \
  --network host \
  -v ~/Downloads:/app/downloads \
  --env-file config.env \
  admin-page-new
echo "✅ 배포 완료!"
EOF

echo "🎉 배포가 완료되었습니다!" 