// 통합 출석 업데이트 함수 (첫 번째는 체크인, 그 다음부터는 체크아웃)
async function updateAttendance(eventId, code) {
    const response = await fetch(`/participant/check_attendance_by_code?event_id=${eventId}&code=${code}`, { method: 'POST' });
    if (response.ok) {
        localStorage.setItem('updateFlag', 'true');
    }
    return response.json();
}

// 날짜/시간 포맷팅 함수 (한국 시간 직접 표시)
function formatDateTime(dateTimeStr) {
    if (!dateTimeStr || dateTimeStr === 'None' || dateTimeStr === null || dateTimeStr === undefined) return '-';
    
    try {
        // 한국 시간을 그대로 파싱
        const date = new Date(dateTimeStr);
        
        if (isNaN(date.getTime())) {
            console.error('Invalid date:', dateTimeStr);
            return '-';
        }
        
        // 한국 시간을 그대로 표시
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const dateStr = `${year}. ${month}. ${day}.`;
        
        // 시간 포맷팅 (오전/오후)
        const hour = date.getHours();
        const minute = date.getMinutes().toString().padStart(2, '0');
        const second = date.getSeconds().toString().padStart(2, '0');
        const ampm = hour < 12 ? '오전' : '오후';
        const displayHour = hour < 12 ? hour : (hour === 12 ? 12 : hour - 12);
        const timeStr = `${ampm} ${displayHour.toString().padStart(2, '0')}:${minute}:${second}`;
        
        return `${dateStr}<br>${timeStr}`;
    } catch (error) {
        console.error('Date parsing error:', error, 'Input:', dateTimeStr);
        return '-';
    }
}

// 참가자 정보 표시 함수
function displayParticipantInfo(participantName, checkInTime, checkOutTime, action) {
    const resultSection = document.getElementById('resultSection');
    
    // 참가자 정보 업데이트
    document.getElementById('participantName').textContent = participantName;
    document.getElementById('checkInTime').innerHTML = checkInTime ? formatDateTime(checkInTime) : '-';
    
    // 체크인인 경우 체크아웃은 비워두기
    if (action === 'check_in') {
        document.getElementById('checkOutTime').innerHTML = '-';
    } else {
        // 체크아웃인 경우에만 체크아웃 시간 표시
        document.getElementById('checkOutTime').innerHTML = checkOutTime ? formatDateTime(checkOutTime) : '-';
    }
    
    // 결과 섹션 표시
    resultSection.style.display = 'block';
    
    // 5초 후 결과 숨기기
    setTimeout(() => {
        resultSection.style.display = 'none';
    }, 5000);
}

// 입력 핸들러
document.addEventListener('DOMContentLoaded', () => {
    const eventId = document.body.getAttribute('data-event-id');
    const barcodeInput = document.getElementById('barcodeInput');

    // 입력 필드 이벤트 리스너 (change 제거, keydown(Enter)에서만 처리)
    barcodeInput.addEventListener('keydown', async function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const scannedCode = this.value.trim();
            if (!scannedCode) {
                alert('참가자 코드를 입력해주세요');
                this.value = '';
                return;
            }
            try {
                // 통합 출석 처리 API 호출
                const updateResponse = await updateAttendance(eventId, scannedCode);
                if (updateResponse.status === "success") {
                    displayParticipantInfo(
                        updateResponse.participant_name, 
                        updateResponse.check_in_time, 
                        updateResponse.check_out_time,
                        updateResponse.action
                    );
                } else {
                    alert(updateResponse.message);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('오류가 발생했습니다. 다시 시도해주세요.');
            }
            this.value = '';
            this.focus();
        }
    });

    // 입력 필드 자동 포커스
    barcodeInput.focus();
});
