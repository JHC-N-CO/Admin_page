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
    console.log('=== EXCEL DOWNLOAD START ===');
    
    const formData = new FormData(this);
    console.log('Form action:', this.action);
    console.log('Form data entries:');
    for (let [key, value] of formData.entries()) {
        console.log(`  ${key}: ${value}`);
    }
    
    fetch(this.action, {
        method: 'POST',
        body: formData
    })
    .then(response => {
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        
        if (!response.ok) {
            console.error('Response not OK:', response.status, response.statusText);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.blob();
    })
    .then(blob => {
        console.log('Blob received, size:', blob.size, 'type:', blob.type);
        
        if (blob.size === 0) {
            throw new Error('Received empty file');
        }
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'participants.xlsx';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        
        console.log('Download completed successfully');
    })
    .catch(error => {
        console.error('Download Error:', error);
        alert('Failed to download the file: ' + error.message);
    });
});

// QR Export 버튼 (경로 선택 UI 표시)
document.getElementById('qrExportBtn').addEventListener('click', function() {
    const pathSelection = document.querySelector('.path-selection');
    if (pathSelection.style.display === 'none') {
        pathSelection.style.display = 'block';
        this.textContent = 'Excel 다운로드 (QR 코드) - 경로 설정 ▲';
    } else {
        pathSelection.style.display = 'none';
        this.textContent = 'Excel 다운로드 (QR 코드) ▼';
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

// QR Excel 저장 버튼 (로컬: 서버가 경로에 저장 / 웹: showSaveFilePicker로 저장 위치 선택)
document.getElementById('qrExportWithPathBtn').addEventListener('click', async function() {
    const pathInput = document.getElementById('customPath');
    const isLocalMode = !!pathInput;  // 경로 입력란 있음 = 로컬 (서버가 경로에 저장)
    const customPath = (pathInput && pathInput.value.trim()) || '';
    
    if (isLocalMode && !customPath) {
        alert('저장할 폴더 경로를 입력해주세요.\n\n예: /Users/jhc/Downloads/QR');
        return;
    }
    
    const formData = new FormData(document.getElementById('exportForm'));
    formData.append('custom_path', customPath || '/Users/jhc/Downloads/Excel_QR_Code');
    
    try {
        const response = await fetch(`/download_qr_participants_excel_with_path_zip/${eventId}`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) throw new Error('Network response was not ok');
        
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            if (data.success && data.saved_to) {
                alert(`저장 완료!\n\n${data.saved_to}\n\n압축을 풀면 Excel @Image 경로와 일치합니다.`);
                return;
            }
        }
        
        const blob = await response.blob();
        
        // 웹: showSaveFilePicker로 저장 위치 선택 (Chrome, Edge 지원). 미지원 시 기본 다운로드
        if (typeof window.showSaveFilePicker === 'function') {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: 'Excel_QR_Code.zip',
                    types: [{ description: 'ZIP 파일', accept: { 'application/zip': ['.zip'] } }]
                });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
                alert('저장 완료!\n\n선택한 위치에 Excel_QR_Code.zip이 저장되었습니다.');
                return;
            } catch (pickerErr) {
                if (pickerErr.name === 'AbortError') return; // 사용자가 취소
            }
        }
        
        // showSaveFilePicker 미지원 시 기본 다운로드 (Downloads 폴더)
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Excel_QR_Code.zip';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Download Error:', error);
        alert('저장에 실패했습니다: ' + error.message);
    }
});
