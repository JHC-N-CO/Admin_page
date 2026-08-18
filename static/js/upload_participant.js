let selectedFile = null;
const eventId = window.location.pathname.split('/').pop();

const STANDARD_COLUMNS = [
    '국가', '국가약어', '성명(KOR)', '성명(ENG)', '이름(First Name)', '성(Last Name)',
    '이메일', '전화', '소속(ENG)', '과(ENG)', '소속(KOR)', '과(KOR)',
    '직위', '면허번호', '생년월일'
];

document.addEventListener('DOMContentLoaded', function () {
    const fileInputArea = document.getElementById('fileInputArea');
    if (!fileInputArea) return;

    fileInputArea.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.add('dragover');
    });

    fileInputArea.addEventListener('dragleave', function (e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.remove('dragover');
    });

    fileInputArea.addEventListener('drop', function (e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect({ target: { files } });
        }
    });
});

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const fileName = file.name;
    const fileExtension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
    if (!['.xlsx', '.xls', '.csv'].includes(fileExtension)) {
        alert('Excel (.xlsx, .xls) 또는 CSV 파일만 업로드 가능합니다.');
        resetFileInput();
        return;
    }

    selectedFile = file;

    const fileInfo = document.getElementById('fileInfo');
    const fileNameElement = document.getElementById('fileName');
    const uploadBtn = document.getElementById('uploadBtn');
    const fileInputArea = document.getElementById('fileInputArea');

    if (fileNameElement) fileNameElement.textContent = fileName;
    if (fileInfo) fileInfo.style.display = 'flex';
    if (uploadBtn) uploadBtn.disabled = false;
    if (fileInputArea) fileInputArea.style.display = 'none';
}

function removeFile() {
    resetFileInput();
}

function resetFileInput() {
    selectedFile = null;
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const uploadBtn = document.getElementById('uploadBtn');
    const fileInputArea = document.getElementById('fileInputArea');

    if (fileInput) fileInput.value = '';
    if (fileInfo) fileInfo.style.display = 'none';
    if (uploadBtn) uploadBtn.disabled = true;
    if (fileInputArea) fileInputArea.style.display = 'block';
}

function downloadSample() {
    const sampleData = [
        STANDARD_COLUMNS,
        [
            '대한민국', 'KR', '홍길동', 'Hong Gildong', 'Gildong', 'Hong',
            'hong@example.com', '010-1234-5678',
            'Seoul National University Hospital', 'Neurology',
            '서울대학교병원', '신경과', '교수', '12345', '1980-05-15'
        ],
        [
            '미국', 'US', '김철수', 'Kim Cheolsu', 'Cheolsu', 'Kim',
            'kim@example.com', '010-9876-5432',
            'Harvard Medical School', 'Pediatrics',
            '하버드 의과대학', '소아과', '전문의', '67890', '1975-12-20'
        ]
    ];

    const ws = XLSX.utils.aoa_to_sheet(sampleData);
    ws['!cols'] = [
        { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 12 },
        { wch: 22 }, { wch: 15 }, { wch: 28 }, { wch: 14 }, { wch: 16 }, { wch: 12 },
        { wch: 10 }, { wch: 12 }, { wch: 12 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Participants');
    XLSX.writeFile(wb, '참가자_업로드_샘플.xlsx');
}

async function uploadFile() {
    if (!selectedFile) {
        alert('파일을 선택해주세요.');
        return;
    }

    const uploadBtn = document.getElementById('uploadBtn');
    const originalBtnText = uploadBtn.innerHTML;
    uploadBtn.disabled = true;
    uploadBtn.textContent = '업로드 중...';

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
        const response = await fetch(`/upload_participants/${eventId}`, {
            method: 'POST',
            body: formData
        });

        let responseData;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            responseData = await response.json();
        } else {
            const text = await response.text();
            try {
                responseData = JSON.parse(text);
            } catch (e) {
                responseData = { message: text };
            }
        }

        if (response.ok && responseData.success) {
            const resultSection = document.getElementById('resultSection');
            const resultStats = document.getElementById('resultStats');
            const errorSection = document.getElementById('errorSection');

            if (errorSection) errorSection.style.display = 'none';
            if (resultSection) {
                resultSection.style.display = 'block';
                if (resultStats) {
                    resultStats.innerHTML =
                        `<p>추가: ${responseData.added || 0}명</p>` +
                        `<p>업데이트: ${responseData.updated || 0}명</p>`;
                }
            }

            const uploadSections = document.querySelectorAll('.upload-section');
            uploadSections.forEach(section => { section.style.display = 'none'; });

            if (window.opener && !window.opener.closed) {
                try { window.opener.location.reload(); } catch (e) {}
            }

            setTimeout(() => window.close(), 2000);
        } else {
            throw new Error(responseData.error || responseData.message || '업로드 실패');
        }
    } catch (error) {
        const errorSection = document.getElementById('errorSection');
        const errorMessage = document.getElementById('errorMessage');
        if (errorSection && errorMessage) {
            errorMessage.textContent = `업로드 중 오류가 발생했습니다: ${error.message}`;
            errorSection.style.display = 'block';
        } else {
            alert(`업로드 중 오류가 발생했습니다: ${error.message}`);
        }
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = originalBtnText;
        resetFileInput();
    }
}
