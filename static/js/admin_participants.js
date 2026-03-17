document.addEventListener('DOMContentLoaded', function() {
    // Initialize sidebar toggle
    initSidebarToggle();
    
    // Initialize column selector
    initColumnSelector();
    
    // Initialize table sorting
    initTableSorting();

    // 기본적으로 code 컬럼 오름차순 정렬 적용
    sortTable('code', 'asc');
    const codeHeader = document.querySelector('th[data-column="code"]');
    if (codeHeader) {
        codeHeader.classList.add('asc');
    }
    
    // Initialize other functionality
    initTableFunctionality();
    initSearchFunctionality();
    initBulkActions();
    initTooltips();

    // 5초마다 체크인/체크아웃 정보 polling
    if (!window._participantPollingStarted) {
        setInterval(updateParticipantStatus, 5000);
        updateParticipantStatus();
        window._participantPollingStarted = true;
    }
});

// Form 밖에서 Delete Selected 버튼 클릭 시 form 제출
function submitDeleteForm() {
    const checkboxes = document.getElementsByName('selected_participants');
    const selectedParticipants = Array.from(checkboxes)
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.value);
    
    if (selectedParticipants.length === 0) {
        alert('삭제할 참가자를 선택해 주세요');
        return;
    }
    
    if (confirm('선택한 참가자를 삭제하시겠습니까?')) {
        document.getElementById('deleteForm').submit();
    }
}

// 날짜를 년-월-일 시:분 형식으로 변환하는 함수
function formatDateTimeSimple(dtStr) {
    if (!dtStr || dtStr === 'None' || dtStr === null || dtStr === undefined) return '-';
    if (typeof dtStr === 'string' && dtStr.length >= 16) {
        return dtStr.slice(0, 16);
    }
    const dt = new Date(dtStr);
    if (isNaN(dt.getTime())) return '-';
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    const h = String(dt.getHours()).padStart(2, '0');
    const min = String(dt.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d} ${h}:${min}`;
}

function formatDateTimeWithBreak(dtStr) {
    if (!dtStr || dtStr === 'None' || dtStr === null || dtStr === undefined) return '-';
    if (typeof dtStr === 'string' && dtStr.length >= 16) {
        // YYYY-MM-DD HH:MM → YYYY-MM-DD<br>HH:MM
        return dtStr.slice(0, 10) + '<br>' + dtStr.slice(11, 16);
    }
    return dtStr;
}

async function updateParticipantStatus() {
    try {
        const eventId = document.body.getAttribute('data-event-id');
        const response = await fetch(`/get_participant_status?event_id=${eventId}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const participants = await response.json();
        participants.forEach(participant => {
            const row = document.querySelector(`tr[data-event-id='${participant.event_id}'][data-code='${participant.code}']`);
            if (row) {
                const checkInCell = row.querySelector('.check-in-time');
                const checkOutCell = row.querySelector('.check-out-time');
                if (checkInCell) checkInCell.innerHTML = participant.check_in_time ? formatDateTimeWithBreak(participant.check_in_time) : '-';
                if (checkOutCell) checkOutCell.innerHTML = participant.check_out_time ? formatDateTimeWithBreak(participant.check_out_time) : '-';

                // Remark (User) 갱신
                const remarkUserCell = row.querySelector('[data-column="remark_user"]');
                if (remarkUserCell) remarkUserCell.textContent = participant.remark_user || '';

                // Remark (Admin) 갱신
                const remarkAdminCell = row.querySelector('[data-column="remark_admin"]');
                if (remarkAdminCell) remarkAdminCell.textContent = participant.remark_admin || '';

                // 승인/거절 상태 갱신
                const acceptDeclineCell = row.querySelector('[data-column="accept_decline"]');
                if (acceptDeclineCell) {
                    updateAcceptDeclineCell(acceptDeclineCell, participant);
                }
            }
        });
    } catch (error) {
        console.error('Failed to update participant status:', error);
    }
}

function updateAcceptDeclineCell(cell, participant) {
    const currentStatus = participant.accept_or_decline;
    const declineReason = participant.decline_reason || '';
    
    // 현재 셀의 내용과 비교하여 변경이 있을 때만 업데이트
    const currentText = cell.textContent.trim();
    const expectedText = currentStatus === 'Decline' ? '거절' : (currentStatus === 'Accept' ? '승인' : currentStatus);
    if (currentText === expectedText) return;
    
    // 셀 내용 업데이트
    if (currentStatus === 'Decline') {
        const participantName = participant.name_kor || (participant.first_name + ' ' + participant.family_name) || '참가자';
        const fullReason = declineReason || '거절 사유 없음';
        const shortReason = fullReason.length > 5 ? fullReason.substring(0, 5) + '...' : fullReason;
        
        cell.innerHTML = `
            <span class="decline-status" 
                  data-decline-reason="${shortReason}"
                  data-full-reason="${fullReason}"
                  data-participant-name="${participantName}"
                  onclick="showDeclineReason(this)">
                거절
            </span>
        `;
    } else if (currentStatus === 'Accept') {
        cell.innerHTML = `<span class="accept-status">승인</span>`;
    } else {
        cell.textContent = currentStatus || '';
    }
}

function openPopup(url) {
    window.open(url, '_blank', 'width=500,height=800,scrollbars=yes,resizable=yes');
}

function openPopupAttn(url) {
    window.open(url, '_blank', 'width=1600,height=1200,scrollbars=yes,resizable=yes');
}

function openEmailPopup() {
    const checkboxes = document.getElementsByName('selected_participants');
    const selectedParticipants = Array.from(checkboxes)
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.value);
    if (selectedParticipants.length === 0) {
        alert('적어도 한명의 참가자를 선택해 주세요');
        return;
    }
    
    // 통합된 이메일 모달 사용
    if (typeof openEmailComposeModalForParticipants === 'function') {
        openEmailComposeModalForParticipants(selectedParticipants);
    } else {
        // 폴백: 기존 방식 사용
        const popupUrl = `/compose_email?participants=${encodeURIComponent(selectedParticipants.join(','))}`;
        window.open(popupUrl, '_blank', 'width=600,height=400');
    }
}

async function deleteParticipants(event) {
    event.preventDefault();
    const response = await fetch(event.target.action, {
        method: 'POST',
        body: new FormData(event.target)
    });
    if (response.ok) {
        location.reload();
    } else {
        alert("Error deleting participants.");
    }
}

async function downloadFile(filepath, event) {
    event.preventDefault();
    try {
        const response = await fetch(`/download_file_path/${encodeURIComponent(filepath)}`, {
            method: 'GET',
        });
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const filename = filepath.split('/').pop() || 'downloaded_file';
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } else {
            alert("Error downloading file.");
        }
    } catch (error) {
        console.error("Error during file download:", error);
        alert("An error occurred while downloading the file.");
    }
}

function downloadExcel() {
    const eventId = document.body.getAttribute('data-event-id');
    const checkboxes = document.getElementsByName('selected_participants');
    const selected = Array.from(checkboxes)
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.value);
    if (selected.length === 0) {
        alert("Please select at least one participant to download.");
        return;
    }
    const popupUrl = `/select_columns?event_id=${eventId}&participants=${encodeURIComponent(selected.join(','))}`;
    // 창 크기를 넉넉하게 지정 (내용이 한 번에 보이도록)
    window.open(popupUrl, '_blank', 'width=600,height=800,scrollbars=yes,resizable=yes');
}

function showDeclineReason(element) {
    const reason = element.getAttribute('data-full-reason');
    const participantName = element.getAttribute('data-participant-name');
    
    console.log('Debug - reason:', reason);
    console.log('Debug - participantName:', participantName);
    
    if (!reason || reason.trim() === '') {
        alert(`${participantName}님의 거절 사유가 등록되지 않았습니다.`);
        return;
    }
    
    const popupUrl = `/decline_reason?participant_name=${encodeURIComponent(participantName)}&reason=${encodeURIComponent(reason)}`;
    console.log('Debug - popupUrl:', popupUrl);
    
    window.open(popupUrl, '_blank', 'width=500,height=400,scrollbars=yes,resizable=yes');
}

// Sidebar toggle functionality
function initSidebarToggle() {
    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    const sidebar = document.getElementById('sidebar');
    
    if (sidebarToggleBtn && sidebar) {
        sidebarToggleBtn.addEventListener('click', function() {
            sidebar.classList.toggle('collapsed');
        });
    }
}

// Column selector functionality
function initColumnSelector() {
    const columnSelectorBtn = document.querySelector('.column-selector-btn');
    const columnSelectorDropdown = document.querySelector('.column-selector-dropdown');
    const selectAllBtn = document.querySelector('.select-all-columns');
    const deselectAllBtn = document.querySelector('.deselect-all-columns');
    const applyBtn = document.querySelector('.apply-columns');
    
    if (columnSelectorBtn && columnSelectorDropdown) {
        columnSelectorBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            columnSelectorDropdown.classList.toggle('show');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!columnSelectorDropdown.contains(e.target) && !columnSelectorBtn.contains(e.target)) {
                columnSelectorDropdown.classList.remove('show');
            }
        });
    }
    
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', function() {
            const checkboxes = document.querySelectorAll('.column-selector-dropdown input[type="checkbox"]');
            checkboxes.forEach(checkbox => checkbox.checked = true);
        });
    }
    
    if (deselectAllBtn) {
        deselectAllBtn.addEventListener('click', function() {
            const checkboxes = document.querySelectorAll('.column-selector-dropdown input[type="checkbox"]');
            checkboxes.forEach(checkbox => checkbox.checked = false);
        });
    }
    
    if (applyBtn) {
        applyBtn.addEventListener('click', function() {
            applyColumnSelection();
            columnSelectorDropdown.classList.remove('show');
        });
    }
    
    // Load saved preferences
    loadColumnPreferences();
    
    // Ensure at least one column is selected
    const checkboxes = document.querySelectorAll('.column-selector-dropdown input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
            if (checkedCount === 0) {
                this.checked = true;
                alert('최소 하나의 컬럼은 선택되어야 합니다.');
            }
        });
    });
}

function loadColumnPreferences() {
    const savedPreferences = localStorage.getItem('participantsColumnPreferences');
    if (savedPreferences) {
        const preferences = JSON.parse(savedPreferences);
        const checkboxes = document.querySelectorAll('.column-selector-dropdown input[type="checkbox"]');
        
        checkboxes.forEach(checkbox => {
            const columnName = checkbox.getAttribute('data-column');
            if (preferences.hasOwnProperty(columnName)) {
                checkbox.checked = preferences[columnName];
            }
        });
        
        applyColumnSelection();
    }
}

function applyColumnSelection() {
    const checkboxes = document.querySelectorAll('.column-selector-dropdown input[type="checkbox"]');
    const preferences = {};
    
    checkboxes.forEach(checkbox => {
        const columnName = checkbox.getAttribute('data-column');
        const isVisible = checkbox.checked;
        preferences[columnName] = isVisible;
        
        // Apply to table
        const tableHeaders = document.querySelectorAll(`th[data-column="${columnName}"]`);
        const tableCells = document.querySelectorAll(`td[data-column="${columnName}"]`);
        
        tableHeaders.forEach(header => {
            header.classList.toggle('hidden-column', !isVisible);
        });
        
        tableCells.forEach(cell => {
            cell.classList.toggle('hidden-column', !isVisible);
        });
    });
    
    // Save preferences
    localStorage.setItem('participantsColumnPreferences', JSON.stringify(preferences));
}

// Table sorting functionality
function initTableSorting() {
    const table = document.getElementById('participants-table');
    if (!table) return;
    const headers = table.querySelectorAll('th.sortable');
    headers.forEach(header => {
        // check_in_time, check_out_time 컬럼은 정렬 이벤트 바인딩하지 않음
        const sortKey = header.getAttribute('data-column');
        if (sortKey === 'check_in_time' || sortKey === 'check_out_time') return;
        header.addEventListener('click', function() {
            const direction = header.classList.contains('asc') ? 'desc' : 'asc';
            sortTable(sortKey, direction);
            headers.forEach(h => h.classList.remove('asc', 'desc'));
            header.classList.add(direction);
        });
    });
}

function sortTable(sortKey, direction) {
    const table = document.getElementById('participants-table');
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    
    // Get the column index
    const headerRow = table.querySelector('thead tr');
    const headers = Array.from(headerRow.querySelectorAll('th'));
    const columnIndex = headers.findIndex(header => header.getAttribute('data-sort') === sortKey);
    
    if (columnIndex === -1) return;
    
    // Sort rows
    rows.sort((a, b) => {
        const aCell = a.querySelector(`td[data-column="${sortKey}"]`);
        const bCell = b.querySelector(`td[data-column="${sortKey}"]`);
        
        if (!aCell || !bCell) return 0;
        
        let aValue = aCell.textContent.trim();
        let bValue = bCell.textContent.trim();
        
        // Handle different data types
        if (sortKey === 'check_in_time' || sortKey === 'check_out_time') {
            // Date/time sorting - remove <br> tags for comparison
            aValue = aValue.replace(/<br>/g, ' ');
            bValue = bValue.replace(/<br>/g, ' ');
            aValue = new Date(aValue || '1900-01-01');
            bValue = new Date(bValue || '1900-01-01');
        } else if (sortKey === 'code') {
            // Number sorting for code
            aValue = parseInt(aValue) || 0;
            bValue = parseInt(bValue) || 0;
        } else if (sortKey === 'license_number') {
            // Number sorting for license
            aValue = parseInt(aValue.replace(/\D/g, '')) || 0;
            bValue = parseInt(bValue.replace(/\D/g, '')) || 0;
        } else {
            // String sorting
            aValue = aValue.toLowerCase();
            bValue = bValue.toLowerCase();
        }
        
        if (direction === 'asc') {
            return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        } else {
            return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
        }
    });
    
    // Reorder rows in the table
    rows.forEach(row => tbody.appendChild(row));
}

function initTableFunctionality() {
    // Table row selection
    const selectAllCheckbox = document.getElementById('select-all');
    const rowCheckboxes = document.querySelectorAll('.row-checkbox');
    
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            rowCheckboxes.forEach(checkbox => {
                checkbox.checked = this.checked;
            });
            updateBulkActions();
        });
    }
    
    rowCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            updateBulkActions();
            
            // Update select all checkbox
            const allChecked = Array.from(rowCheckboxes).every(cb => cb.checked);
            const someChecked = Array.from(rowCheckboxes).some(cb => cb.checked);
            
            if (selectAllCheckbox) {
                selectAllCheckbox.checked = allChecked;
                selectAllCheckbox.indeterminate = someChecked && !allChecked;
            }
        });
    });
}

function updateBulkActions() {
    const selectedRows = document.querySelectorAll('.row-checkbox:checked');
    const bulkActions = document.querySelector('.bulk-actions');
    
    if (bulkActions) {
        if (selectedRows.length > 0) {
            bulkActions.style.display = 'flex';
        } else {
            bulkActions.style.display = 'none';
        }
    }
}

function initSearchFunctionality() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const tableRows = document.querySelectorAll('tbody tr');
            
            tableRows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        });
    }
}

function initBulkActions() {
    // Bulk actions functionality is already implemented in existing functions
}

function initTooltips() {
    // Initialize tooltips for decline reasons
    const declineCells = document.querySelectorAll('.decline-reason');
    declineCells.forEach(cell => {
        const reason = cell.getAttribute('data-reason');
        if (reason) {
            cell.title = reason;
        }
    });
}

// 장소 편집 기능
function editLocation() {
    const locationSpan = document.getElementById('event-location');
    const currentLocation = locationSpan.textContent;
    const locationInput = document.getElementById('locationInput');
    const modal = document.getElementById('locationModal');
    const modalTitle = document.getElementById('modal-title');
    
    // 장소가 설정되지 않은 경우와 설정된 경우를 구분
    if (locationSpan.classList.contains('no-location')) {
        modalTitle.textContent = '행사 장소 추가';
        locationInput.value = '';
        locationInput.placeholder = '행사 장소를 입력하세요';
    } else {
        modalTitle.textContent = '행사 장소 편집';
        locationInput.value = currentLocation;
        locationInput.placeholder = '행사 장소를 입력하세요';
    }
    
    modal.style.display = 'block';
}

function closeLocationModal() {
    const modal = document.getElementById('locationModal');
    modal.style.display = 'none';
}

// 장소 저장 함수
async function saveLocation() {
    const eventId = document.body.getAttribute('data-event-id');
    const location = document.getElementById('locationInput').value.trim();
    
    console.log('=== saveLocation 함수 호출 ===');
    console.log('Event ID:', eventId);
    console.log('Location:', location);
    
    if (!location) {
        alert('장소를 입력해주세요.');
        return;
    }
    
    try {
        console.log('Sending request to:', `/update_event_location/${eventId}`);
        const response = await fetch(`/update_event_location/${eventId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ location: location })
        });
        
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        if (response.ok) {
            const result = await response.json();
            console.log('Response data:', result);
            
            // 성공 시 화면 업데이트
            const locationSpan = document.getElementById('event-location');
            locationSpan.textContent = location;
            locationSpan.classList.remove('no-location');
            
            // 버튼 텍스트 변경
            const button = document.querySelector('.add-location-btn, .edit-location-btn');
            if (button) {
                button.textContent = '편집';
                button.className = 'edit-location-btn';
            }
            
            closeLocationModal();
            alert('장소가 성공적으로 저장되었습니다.');
        } else {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            alert('장소 저장에 실패했습니다.');
        }
    } catch (error) {
        console.error('Error updating location:', error);
        alert('장소 업데이트 중 오류가 발생했습니다.');
    }
}

// 장소 저장 - 즉시 실행
(function() {
    const locationForm = document.getElementById('locationForm');
    if (locationForm) {
        locationForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const eventId = document.body.getAttribute('data-event-id');
            const location = document.getElementById('locationInput').value.trim();
            
            console.log('Form submitted:', { eventId, location });
            
            if (!location) {
                alert('장소를 입력해주세요.');
                return;
            }
            
            try {
                console.log('Sending request to:', `/update_event_location/${eventId}`);
                const response = await fetch(`/update_event_location/${eventId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ location: location })
                });
                
                console.log('Response status:', response.status);
                console.log('Response ok:', response.ok);
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('Response data:', result);
                    
                    // 성공 시 화면 업데이트
                    const locationSpan = document.getElementById('event-location');
                    locationSpan.textContent = location;
                    locationSpan.classList.remove('no-location');
                    
                    // 버튼 텍스트 변경
                    const button = document.querySelector('.add-location-btn, .edit-location-btn');
                    if (button) {
                        button.textContent = '편집';
                        button.className = 'edit-location-btn';
                    }
                    
                    closeLocationModal();
                    alert('장소가 성공적으로 저장되었습니다.');
                } else {
                    const errorText = await response.text();
                    console.error('Error response:', errorText);
                    alert('장소 저장에 실패했습니다.');
                }
            } catch (error) {
                console.error('Error updating location:', error);
                alert('장소 업데이트 중 오류가 발생했습니다.');
            }
        });
    }
    
    // 모달 외부 클릭 시 닫기
    const modal = document.getElementById('locationModal');
    if (modal) {
        window.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeLocationModal();
            }
        });
    }
})();

// 행사 정보 편집 기능 (날짜 + 장소 통합)
let startDatePicker = null;
let endDatePicker = null;

function editEventInfo() {
    const modal = document.getElementById('eventInfoModal');
    const startDateInput = document.getElementById('startDateInput');
    const endDateInput = document.getElementById('endDateInput');
    const locationInput = document.getElementById('locationInput');
    
    // 현재 값 가져오기
    const currentStartDate = document.getElementById('event-start-date').textContent;
    const currentEndDate = document.getElementById('event-end-date').textContent;
    const locationSpan = document.getElementById('event-location');
    const currentLocation = locationSpan.classList.contains('no-location') ? '' : locationSpan.textContent;
    
    // 입력 필드에 현재 값 설정
    startDateInput.value = currentStartDate;
    endDateInput.value = currentEndDate;
    locationInput.value = currentLocation;
    
    // 기존 flatpickr 인스턴스 제거
    if (startDatePicker) {
        startDatePicker.destroy();
    }
    if (endDatePicker) {
        endDatePicker.destroy();
    }
    
    // flatpickr 초기화
    startDatePicker = flatpickr(startDateInput, {
        dateFormat: 'Y-m-d',
        locale: 'ko',
        allowInput: true,
        disableMobile: true
    });
    
    endDatePicker = flatpickr(endDateInput, {
        dateFormat: 'Y-m-d',
        locale: 'ko',
        allowInput: true,
        disableMobile: true
    });
    
    modal.style.display = 'block';
}

function closeEventInfoModal() {
    const modal = document.getElementById('eventInfoModal');
    modal.style.display = 'none';
    
    // flatpickr 인스턴스 정리
    if (startDatePicker) {
        startDatePicker.destroy();
        startDatePicker = null;
    }
    if (endDatePicker) {
        endDatePicker.destroy();
        endDatePicker = null;
    }
}

async function saveEventInfo() {
    const eventId = document.body.getAttribute('data-event-id');
    const newStartDate = document.getElementById('startDateInput').value.trim();
    const newEndDate = document.getElementById('endDateInput').value.trim();
    const newLocation = document.getElementById('locationInput').value.trim();
    
    // 변경사항 확인
    const currentStartDate = document.getElementById('event-start-date').textContent;
    const currentEndDate = document.getElementById('event-end-date').textContent;
    const locationSpan = document.getElementById('event-location');
    const currentLocation = locationSpan.classList.contains('no-location') ? '' : locationSpan.textContent;
    
    let hasChanges = false;
    const updates = {};
    
    // 날짜 변경 확인 및 저장
    if (newStartDate !== currentStartDate && newStartDate) {
        updates.start_date = newStartDate;
        hasChanges = true;
    }
    
    if (newEndDate !== currentEndDate && newEndDate) {
        updates.end_date = newEndDate;
        hasChanges = true;
    }
    
    // 장소 변경 확인
    if (newLocation !== currentLocation) {
        updates.location = newLocation;
        hasChanges = true;
    }
    
    if (!hasChanges) {
        alert('변경된 내용이 없습니다.');
        return;
    }
    
    try {
        // 날짜 업데이트
        if (updates.start_date) {
            await updateDate(eventId, 'start_date', updates.start_date);
        }
        if (updates.end_date) {
            await updateDate(eventId, 'end_date', updates.end_date);
        }
        
        // 장소 업데이트
        if (updates.location !== undefined) {
            await updateLocation(eventId, updates.location);
        }
        
        // 화면 업데이트
        if (updates.start_date) {
            document.getElementById('event-start-date').textContent = updates.start_date;
        }
        if (updates.end_date) {
            document.getElementById('event-end-date').textContent = updates.end_date;
        }
        if (updates.location !== undefined) {
            locationSpan.textContent = updates.location || '장소가 설정되지 않았습니다';
            if (updates.location) {
                locationSpan.classList.remove('no-location');
            } else {
                locationSpan.classList.add('no-location');
            }
        }
        
        closeEventInfoModal();
        alert('행사 정보가 성공적으로 저장되었습니다.');
    } catch (error) {
        console.error('Error updating event info:', error);
        alert('정보 업데이트 중 오류가 발생했습니다.');
    }
}

// 날짜 업데이트 헬퍼 함수
async function updateDate(eventId, field, value) {
    const response = await fetch(`/api/event/${eventId}/date`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            field: field,
            value: value
        })
    });
    
    const data = await response.json();
    
    if (!response.ok || !data.success) {
        throw new Error(data.error || '날짜 저장에 실패했습니다.');
    }
}

// 장소 업데이트 헬퍼 함수
async function updateLocation(eventId, location) {
    const response = await fetch(`/update_event_location/${eventId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ location: location })
    });
    
    if (!response.ok) {
        throw new Error('장소 저장에 실패했습니다.');
    }
}

// 모달 외부 클릭 시 닫기
window.addEventListener('click', function(e) {
    const eventInfoModal = document.getElementById('eventInfoModal');
    if (e.target === eventInfoModal) {
        closeEventInfoModal();
    }
});

// 회원 선택 모달 관련 함수들
let currentEventId = null;
let selectedMemberIds = [];

function openMemberSelector(eventId) {
    currentEventId = eventId;
    selectedMemberIds = [];
    document.getElementById('memberSelectorModal').style.display = 'block';
    loadMembers();
}

function closeMemberSelector() {
    document.getElementById('memberSelectorModal').style.display = 'none';
    selectedMemberIds = [];
}

function loadMembers() {
    const search = document.getElementById('member-search').value;
    const url = search ? `/api/members?search=${encodeURIComponent(search)}` : '/api/members';
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayMembers(data.members);
            } else {
                console.error('회원 목록 로드 실패:', data.message);
            }
        })
        .catch(error => {
            console.error('회원 목록 로드 오류:', error);
        });
}

function displayMembers(members) {
    const memberList = document.getElementById('memberList');
    memberList.innerHTML = '';
    
    members.forEach(member => {
        const memberItem = document.createElement('div');
        memberItem.className = 'member-item';
        memberItem.innerHTML = `
            <label class="member-checkbox">
                <input type="checkbox" value="${member.id}" onchange="toggleMemberSelection(${member.id})">
                <div class="member-info">
                    <div class="member-name">${member.name_kor} ${member.name_eng ? '(' + member.name_eng + ')' : ''}</div>
                    <div class="member-details">
                        ${member.email} | ${member.workplace_name || ''} | ${member.position || ''}
                    </div>
                </div>
            </label>
        `;
        memberList.appendChild(memberItem);
    });
}

function toggleMemberSelection(memberId) {
    const index = selectedMemberIds.indexOf(memberId);
    if (index > -1) {
        selectedMemberIds.splice(index, 1);
    } else {
        selectedMemberIds.push(memberId);
    }
}

function addSelectedMembers() {
    if (selectedMemberIds.length === 0) {
        alert('선택한 회원이 없습니다.');
        return;
    }
    
    fetch(`/add_member_as_participant/${currentEventId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            member_ids: selectedMemberIds
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert(data.message);
            closeMemberSelector();
            // 페이지 새로고침하여 업데이트된 참가자 목록 표시
            window.location.reload();
        } else {
            alert('오류: ' + data.message);
        }
    })
    .catch(error => {
        console.error('회원 추가 오류:', error);
        alert('회원 추가 중 오류가 발생했습니다.');
    });
}

// 회원 검색 기능
document.addEventListener('DOMContentLoaded', function() {
    const memberSearchInput = document.getElementById('member-search');
    if (memberSearchInput) {
        let searchTimeout;
        memberSearchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                loadMembers();
            }, 300);
        });
    }
});
