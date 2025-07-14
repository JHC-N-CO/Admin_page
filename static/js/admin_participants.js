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
            }
        });
    } catch (error) {
        console.error('Failed to update participant status:', error);
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
    const popupUrl = `/compose_email?participants=${encodeURIComponent(selectedParticipants.join(','))}`;
    window.open(popupUrl, '_blank', 'width=600,height=400');
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
    const reason = element.getAttribute('data-decline-reason');
    const participantName = element.getAttribute('data-participant-name');
    
    if (!reason || reason.trim() === '') {
        alert(`${participantName}님의 거절 사유가 등록되지 않았습니다.`);
        return;
    }
    
    const popupUrl = `/decline_reason?participant_name=${encodeURIComponent(participantName)}&reason=${encodeURIComponent(reason)}`;
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
