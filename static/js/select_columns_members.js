// 전체 선택 버튼
document.getElementById('selectAll').addEventListener('click', function() {
    const checkboxes = document.querySelectorAll('input[name="selected_columns"]');
    checkboxes.forEach(checkbox => checkbox.checked = true);
});

// 전체 해제 버튼
document.getElementById('clear').addEventListener('click', function() {
    const checkboxes = document.querySelectorAll('input[name="selected_columns"]');
    checkboxes.forEach(checkbox => checkbox.checked = false);
});

// 폼 제출 처리
document.getElementById('exportForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const selectedColumns = Array.from(document.querySelectorAll('input[name="selected_columns"]:checked'))
        .map(checkbox => checkbox.value);
    
    if (selectedColumns.length === 0) {
        alert('다운로드할 컬럼을 최소 1개 이상 선택해주세요.');
        return;
    }
    
    // FormData 생성
    const formData = new FormData(this);
    
    // POST 요청으로 Excel 다운로드
    fetch(this.action, {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.blob();
    })
    .then(blob => {
        // 다운로드 링크 생성
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        a.download = `회원목록_${timestamp}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // 다운로드 완료 후 창 닫기
        setTimeout(() => {
            window.close();
        }, 1000);
    })
    .catch(error => {
        console.error('Download Error:', error);
        alert('다운로드 중 오류가 발생했습니다.');
    });
});

