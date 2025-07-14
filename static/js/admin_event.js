// --- Extracted from admin_event.html inline <script> ---
function toggleSelectAll(checkbox, name) {
    const checkboxes = document.getElementsByName(name);
    checkboxes.forEach(cb => cb.checked = checkbox.checked);
}

// 이벤트 생성 폼 제출 처리
document.addEventListener('DOMContentLoaded', function() {
    const eventForm = document.querySelector('.event-form form');
    if (eventForm) {
        eventForm.addEventListener('submit', function(e) {
            const name = document.querySelector('input[name="name"]').value;
            const startDate = document.querySelector('input[name="start_date"]').value;
            const endDate = document.querySelector('input[name="end_date"]').value;
            
            if (!name || !startDate || !endDate) {
                e.preventDefault();
                alert('모든 필드를 입력해주세요.');
                return false;
            }
        });
    }
    
    // 이벤트 삭제 폼 처리
    const deleteForm = document.querySelector('form[action="/delete_events"]');
    if (deleteForm) {
        deleteForm.addEventListener('submit', function(e) {
            const selectedEvents = document.querySelectorAll('input[name="selected_events"]:checked');
            if (selectedEvents.length === 0) {
                e.preventDefault();
                alert('삭제할 이벤트를 선택해주세요.');
                return false;
            }
            
            if (!confirm('선택한 이벤트를 삭제하시겠습니까?')) {
                e.preventDefault();
                return false;
            }
        });
    }

    // 사이드바 토글 기능
    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    const sidebar = document.getElementById('sidebar');
    if (sidebarToggleBtn && sidebar) {
        sidebarToggleBtn.addEventListener('click', function() {
            sidebar.classList.toggle('collapsed');
    });
    }

    if (typeof flatpickr !== 'undefined') {
        flatpickr('#start_date', {
            dateFormat: 'Y/m/d',
            locale: 'ko',
            allowInput: true,
            disableMobile: true,
        });
        flatpickr('#end_date', {
            dateFormat: 'Y/m/d',
            locale: 'ko',
            allowInput: true,
            disableMobile: true,
        });
    }
});

