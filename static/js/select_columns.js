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
        const qrResponse = await fetch(`/get_participants_for_qr/${eventId}`, {
            method: 'POST',
            body: formData
        });
        
        if (!qrResponse.ok) {
            throw new Error('Failed to get participants data');
        }
        
        const data = await qrResponse.json();
        const participants = data.participants;
        const eventName = data.event_name;
        
        // ZIP 파일 생성
        const zip = new JSZip();
        const qrFolder = zip.folder("QR Codes");
        const eventFolder = qrFolder.folder(eventName);
        
        // 각 참가자의 QR 코드를 ZIP에 추가
        for (const participant of participants) {
            if (participant.code) {
                try {
                    const qrImageResponse = await fetch(`/generate_qr_image/${participant.code}/${eventName}`);
                    if (qrImageResponse.ok) {
                        const qrBlob = await qrImageResponse.blob();
                        eventFolder.file(`${participant.code}.png`, qrBlob);
                    }
                } catch (error) {
                    console.error(`Failed to add QR for participant ${participant.code}:`, error);
                }
            }
        }
        
        // Excel 파일을 ZIP에 추가
        const excelResponse = await fetch(`/download_qr_participants_excel/${eventId}`, {
            method: 'POST',
            body: formData
        });
        
        if (excelResponse.ok) {
            const excelBlob = await excelResponse.blob();
            zip.file(`participants_qr_${eventId}.xlsx`, excelBlob);
        }
        
        // ZIP 파일 다운로드
        const zipBlob = await zip.generateAsync({type: 'blob'});
        saveAs(zipBlob, `participants_qr_${eventId}.zip`);
        
        window.close();
        
    } catch (error) {
        console.error('QR Export Error:', error);
        alert(`Failed to download QR file: ${error.message}`);
    }
});



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
