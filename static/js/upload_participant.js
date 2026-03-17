// 참가자 업로드 JavaScript

let selectedFile = null;
const eventId = window.location.pathname.split('/').pop();

console.log('upload_participant.js 로드됨, Event ID:', eventId);

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded 이벤트 발생');
    
    const fileInput = document.getElementById('fileInput');
    const fileInputArea = document.getElementById('fileInputArea');
    
    // 드래그 앤 드롭 이벤트
    if (fileInputArea) {
        fileInputArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.stopPropagation();
            this.style.borderColor = '#764ba2';
            this.style.backgroundColor = '#f0f1f7';
        });
        
        fileInputArea.addEventListener('dragleave', function(e) {
            e.preventDefault();
            e.stopPropagation();
            this.style.borderColor = '#667eea';
            this.style.backgroundColor = '#f8f9fa';
        });
        
        fileInputArea.addEventListener('drop', function(e) {
            e.preventDefault();
            e.stopPropagation();
            this.style.borderColor = '#667eea';
            this.style.backgroundColor = '#f8f9fa';
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFileSelect({ target: { files: files } });
            }
        });
    }
});

// 파일 선택 처리
function handleFileSelect(event) {
    console.log('handleFileSelect 호출됨');
    const file = event.target.files[0];
    
    if (!file) {
        console.log('파일이 선택되지 않음');
        return;
    }
    
    console.log('선택된 파일:', file.name, file.type, file.size);
    
    // 파일 확장자 검증
    const fileName = file.name;
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
        alert('Excel (.xlsx, .xls) 또는 CSV 파일만 업로드 가능합니다.');
        resetFileInput();
        return;
    }
    
    selectedFile = file;
    
    // UI 업데이트
    const fileInfo = document.getElementById('fileInfo');
    const fileNameElement = document.getElementById('fileName');
    const uploadBtn = document.getElementById('uploadBtn');
    const fileInputArea = document.getElementById('fileInputArea');
    
    if (fileNameElement) fileNameElement.textContent = fileName;
    if (fileInfo) fileInfo.style.display = 'flex';
    if (uploadBtn) uploadBtn.disabled = false;
    if (fileInputArea) fileInputArea.style.display = 'none';
    
    console.log('파일 선택 완료, UI 업데이트됨');
}

// 파일 제거
function removeFile() {
    console.log('removeFile 호출됨');
    resetFileInput();
}

// 파일 입력 초기화
function resetFileInput() {
    console.log('resetFileInput 호출됨');
    
    selectedFile = null;
    
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const uploadBtn = document.getElementById('uploadBtn');
    const fileInputArea = document.getElementById('fileInputArea');
    
    if (fileInput) fileInput.value = '';
    if (fileInfo) fileInfo.style.display = 'none';
    if (uploadBtn) uploadBtn.disabled = true;
    if (fileInputArea) fileInputArea.style.display = 'block';
    
    console.log('파일 입력 초기화 완료');
}

// 샘플 Excel 파일 다운로드
function downloadSample() {
    console.log('downloadSample 호출됨');
    
    // 31개 컬럼 데이터 (새로운 순서)
    const sampleData = [
        [
            '이벤트 ID', '코드', '역할', '국가', '국가약어',
            '성명(KOR)', '성명(ENG)', '이름(First Name)', '성(Last Name)', '이메일', '전화',
            '소속(ENG)', '과(ENG)', '소속(KOR)', '과(KOR)', '직위', '면허번호',
            '생년월일', '회원구분', '등록구분', '승인/거절',
            'CV', '사진', 'PPT', 'Script', '동의여부',
            '비고(사용자)', '비고(관리자)', '체크인', '체크아웃', '거절 사유'
        ],
        [
            '', '', 'Speaker', '대한민국', 'KR',
            '홍길동', 'Hong Gildong', 'Gildong', 'Hong', 'hong@example.com', '010-1234-5678',
            'Seoul National University Hospital', 'Neurology', '서울대학교병원', '신경과', '교수', '12345',
            '1980-05-15', '정회원', '일반등록', 'Accept',
            '', '', '', '', 'Y',
            '', '', '', '', ''
        ],
        [
            '', '', 'Chairperson', '미국', 'US',
            '김철수', 'Kim Cheolsu', 'Cheolsu', 'Kim', 'kim@example.com', '010-9876-5432',
            'Harvard Medical School', 'Pediatrics', '하버드 의과대학', '소아과', '전문의', '67890',
            '1975-12-20', '종신회원', 'VIP등록', 'Accept',
            '', '', '', '', 'Y',
            '', '', '', '', ''
        ]
    ];
    
    // SheetJS를 사용한 Excel 파일 생성
    const ws = XLSX.utils.aoa_to_sheet(sampleData);
    
    // 컬럼 너비 설정
    const colWidths = [
        {wch: 12}, {wch: 8}, {wch: 12}, {wch: 10}, {wch: 10},
        {wch: 12}, {wch: 15}, {wch: 15}, {wch: 12}, {wch: 20}, {wch: 15},
        {wch: 30}, {wch: 15}, {wch: 20}, {wch: 12}, {wch: 10}, {wch: 12},
        {wch: 12}, {wch: 10}, {wch: 12}, {wch: 12},
        {wch: 10}, {wch: 10}, {wch: 10}, {wch: 10}, {wch: 10},
        {wch: 15}, {wch: 15}, {wch: 12}, {wch: 12}, {wch: 20}
    ];
    ws['!cols'] = colWidths;
    
    // 헤더 스타일 (첫 번째 행)
    const headerCells = ['A1', 'B1', 'C1', 'D1', 'E1', 'F1', 'G1', 'H1', 'I1', 'J1', 'K1',
                         'L1', 'M1', 'N1', 'O1', 'P1', 'Q1', 'R1', 'S1', 'T1', 'U1',
                         'V1', 'W1', 'X1', 'Y1', 'Z1', 'AA1', 'AB1', 'AC1', 'AD1', 'AE1'];
    
    headerCells.forEach(cell => {
        if (ws[cell]) {
            ws[cell].s = {
                font: { bold: true, color: { rgb: 'FFFFFF' } },
                fill: { fgColor: { rgb: '667EEA' } },
                alignment: { horizontal: 'center', vertical: 'center' }
            };
        }
    });
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Participants');
    
    // 파일 다운로드
    XLSX.writeFile(wb, '참가자_업로드_샘플_표준31개컬럼.xlsx');
    
    console.log('샘플 파일 다운로드 완료');
}

// 파일 업로드
async function uploadFile() {
    console.log('uploadFile 함수 호출됨');
    
    if (!selectedFile) {
        alert('파일을 선택해주세요.');
        return;
    }
    
    const uploadBtn = document.getElementById('uploadBtn');
    const originalBtnText = uploadBtn.innerHTML;
    
    // 버튼 비활성화 및 텍스트 변경
    uploadBtn.disabled = true;
    uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 업로드 중...';
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    try {
        console.log('서버로 업로드 요청 전송 중...');
        
        const response = await fetch(`/upload_participants/${eventId}`, {
            method: 'POST',
            body: formData
        });
        
        console.log('서버 응답 수신:', response.status);
        
        // 응답 본문 파싱 시도
        let responseData;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            responseData = await response.json();
        } else {
            // JSON이 아닌 경우 텍스트로 읽기
            const text = await response.text();
            try {
                responseData = JSON.parse(text);
            } catch (e) {
                // JSON 파싱 실패 시 텍스트를 메시지로 사용
                responseData = { message: text };
            }
        }
        
        if (response.ok && responseData.success) {
            console.log('업로드 성공!', responseData);
            
            // 성공 메시지 표시
            const resultSection = document.getElementById('resultSection');
            const resultStats = document.getElementById('resultStats');
            
            if (resultSection) {
                resultSection.style.display = 'block';
                
                // 통계 정보 표시
                if (resultStats) {
                    let statsHtml = `<div class="stats-info">`;
                    statsHtml += `<p><strong>추가:</strong> ${responseData.added || 0}명</p>`;
                    statsHtml += `<p><strong>업데이트:</strong> ${responseData.updated || 0}명</p>`;
                    if (responseData.missing_columns && responseData.missing_columns.length > 0) {
                        statsHtml += `<p class="warning"><strong>누락 컬럼:</strong> ${responseData.missing_columns.join(', ')}</p>`;
                    }
                    statsHtml += `</div>`;
                    resultStats.innerHTML = statsHtml;
                }
            }
            
            // 파일 입력 영역 숨기기
            const uploadSection = document.querySelector('.upload-section');
            if (uploadSection) {
                uploadSection.style.display = 'none';
            }
            
            // 즉시 부모 창 새로고침 및 창 닫기
            if (window.opener && !window.opener.closed) {
                try {
                    window.opener.location.reload();
                } catch (e) {
                    console.error('부모 창 새로고침 실패:', e);
                }
            }
            
            // 2초 후 창 닫기
            setTimeout(() => {
                window.close();
            }, 2000);
            
        } else {
            // 에러 처리
            const errorMessage = responseData.error || responseData.message || '업로드 실패';
            throw new Error(errorMessage);
        }
        
    } catch (error) {
        console.error('Upload error:', error);
        
        // 에러 메시지 표시
        const errorSection = document.getElementById('errorSection');
        const errorMessage = document.getElementById('errorMessage');
        
        if (errorSection && errorMessage) {
            errorMessage.textContent = `업로드 중 오류가 발생했습니다: ${error.message}`;
            errorSection.style.display = 'block';
        } else {
            alert(`업로드 중 오류가 발생했습니다: ${error.message}`);
        }
        
        // 버튼 복원
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = originalBtnText;
        
        // 파일 입력 초기화
        resetFileInput();
    }
}
