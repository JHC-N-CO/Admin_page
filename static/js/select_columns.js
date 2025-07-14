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
        window.close();
    })
    .catch(error => {
        console.error('Download Error:', error);
        alert('Failed to download the file.');
    });
});

// QR Export 버튼
document.getElementById('qrExportBtn').addEventListener('click', async function() {
    try {
        // 참가자 데이터 가져오기
        const formData = new FormData(document.getElementById('exportForm'));
        const response = await fetch(`/get_participants_for_qr/${eventId}`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Failed to get participants data');
        }
        
        const data = await response.json();
        const participants = data.participants;
        const eventName = data.event_name;
        
        // QR 코드 이미지들을 개별적으로 다운로드
        for (const participant of participants) {
            if (participant.code) {
                try {
                    const qrDataURL = await QRCode.toDataURL(participant.code.toString(), {
                        width: 256,
                        margin: 2
                    });
                    
                    // Data URL을 Blob으로 변환
                    const qrResponse = await fetch(qrDataURL);
                    const qrBlob = await qrResponse.blob();
                    
                    // QR 코드 이미지를 개별 파일로 다운로드
                    const qrUrl = window.URL.createObjectURL(qrBlob);
                    const qrLink = document.createElement('a');
                    qrLink.href = qrUrl;
                    qrLink.download = `QR Codes/${eventName}/${participant.code}.png`;
                    document.body.appendChild(qrLink);
                    qrLink.click();
                    document.body.removeChild(qrLink);
                    window.URL.revokeObjectURL(qrUrl);
                    
                    // 다운로드 간격을 두어 브라우저가 처리할 시간을 줌
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                } catch (error) {
                    console.error(`Failed to generate QR for participant ${participant.code}:`, error);
                }
            }
        }
        
        // Excel 파일 생성 (QR 코드 경로 포함)
        const excelData = participants.map(p => ({
            'Event ID': p.event_id,
            'Code': p.code,
            'QR Code': p.code ? `QR Codes/${eventName}/${p.code}.png` : '',
            'Name (KOR)': p.name_kor,
            'Name (ENG)': `${p.first_name} ${p.family_name}`.trim(),
            'Affiliation': p.affiliation_kor || p.affiliation_eng,
            'Email': p.email,
            'Accept/Decline': p.accept_or_decline
        }));
        
        // Excel 파일 다운로드
        const excelBlob = await generateExcelBlob(excelData);
        const excelUrl = window.URL.createObjectURL(excelBlob);
        const excelLink = document.createElement('a');
        excelLink.href = excelUrl;
        excelLink.download = `participants_qr_${eventId}.xlsx`;
        document.body.appendChild(excelLink);
        excelLink.click();
        document.body.removeChild(excelLink);
        window.URL.revokeObjectURL(excelUrl);
        
        window.close();
        
    } catch (error) {
        console.error('QR Export Error:', error);
        alert(`Failed to download QR file: ${error.message}`);
    }
});

// Excel 파일 생성 함수
async function generateExcelBlob(data) {
    const XLSX = await import('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Participants");
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// Custom Excel Export 버튼
document.getElementById('customExportBtn').addEventListener('click', function() {
    const formData = new FormData(document.getElementById('exportForm'));
    fetch(`/download_custom_excel/${eventId}`, {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => { throw new Error(err.message || 'Unknown error'); });
        }
        return response.blob();
    })
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'custom_participants.xlsx';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        window.close();
    })
    .catch(error => {
        console.error('Custom Export Error:', error);
        alert(`Failed to download Custom Excel file: ${error.message}`);
    });
});
