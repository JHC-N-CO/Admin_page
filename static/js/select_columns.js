// --- Extracted from select_columns.html inline <script> ---
// Note: This variable should be set by the server-side template
// const eventId = "{{ event_id }}";  // Flask에서 event_id를 JavaScript 변수로 전달

// Select All 버튼
document.getElementById('selectAll').addEventListener('click', function() {
    document.querySelectorAll('input[name="selected_columns"]').forEach(cb => cb.checked = true);
});

// Clear 버튼
document.getElementById('clear').addEventListener('click', function() {
    document.querySelectorAll('input[name="selected_columns"]').forEach(cb => cb.checked = false);
});

// Download Excel 버튼
document.getElementById('exportForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    fetch(this.action, {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.blob();
    })
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'participants.xlsx';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    })
    .catch(error => {
        console.error('Download Error:', error);
        alert('Failed to download the file.');
    });
});

// QR Export 버튼 (경로 선택 UI 표시)
document.getElementById('qrExportBtn').addEventListener('click', function() {
    const pathSelection = document.querySelector('.path-selection');
    if (pathSelection.style.display === 'none') {
        pathSelection.style.display = 'block';
        this.textContent = 'Excel 다운로드 (QR 코드) - 경로 설정';
    } else {
        pathSelection.style.display = 'none';
        this.textContent = 'Excel 다운로드 (QR 코드)';
    }
});

// 평점 선택 관련 요소들
const customExportBtn = document.getElementById('customExportBtn');
const ratingSelection = document.querySelector('.rating-selection');
const confirmRatingBtn = document.getElementById('confirmRatingBtn');
const ratingCriteriaSelect = document.getElementById('ratingCriteria');

// 평점신고 버튼 클릭 시 섹션 토글
if (customExportBtn) {
    customExportBtn.addEventListener('click', function() {
        if (ratingSelection) {
            const isVisible = ratingSelection.style.display !== 'none';
            ratingSelection.style.display = isVisible ? 'none' : 'block';
        }
    });
}

// 확인 버튼 클릭 시 다운로드 실행
if (confirmRatingBtn) {
    confirmRatingBtn.addEventListener('click', function() {
    const selectedParticipants = document.querySelector('input[name="selected_participants"]').value;
    const ratingCriteria = ratingCriteriaSelect.value;
    
    fetch(`/download_custom_excel/${eventId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `selected_participants=${encodeURIComponent(selectedParticipants)}&rating_criteria=${ratingCriteria}`
    })
    .then(response => {
        if (response.ok) {
            return response.blob();
        }
        throw new Error('Network response was not ok');
    })
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
                        a.download = `평점신고_${ratingCriteria}평점.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        // 다운로드 후 섹션 숨기기
        if (ratingSelection) {
            ratingSelection.style.display = 'none';
        }
    })
    .catch(error => {
        console.error('Custom Export Error:', error);
        alert('Failed to download Custom Excel file: ' + error.message);
    });
    });
}

// 폴더 선택 버튼 (브라우저 제한으로 인해 입력만 가능)
document.getElementById('browsePathBtn').addEventListener('click', function() {
    const pathInput = document.getElementById('customPath');
    const currentPath = pathInput.value || '/Users/jhc/Downloads/Excel_QR_Code';
    const newPath = prompt('저장할 폴더 경로를 입력하세요:', currentPath);
    if (newPath) {
        pathInput.value = newPath;
    }
});

// 실제 경로로 다운로드 버튼 (ZIP 파일로 다운로드)
document.getElementById('qrExportWithPathBtn').addEventListener('click', function() {
    const customPath = document.getElementById('customPath').value.trim();
    if (!customPath) {
        alert('저장할 폴더 경로를 입력해주세요.');
        return;
    }
    
    const formData = new FormData(document.getElementById('exportForm'));
    formData.append('custom_path', customPath);
    
    fetch(`/download_qr_participants_excel_with_path_zip/${eventId}`, {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.blob();
    })
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Excel_QR_Code.zip';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    })
    .catch(error => {
        console.error('Download Error:', error);
        alert('Failed to download the file.');
    });
});
