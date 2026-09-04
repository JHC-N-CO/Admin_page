// --- Extracted from member_list.html inline <script> ---
// 검색 기능
document.addEventListener('DOMContentLoaded', function() {
    // Initialize sidebar toggle
    initSidebarToggle();
    
    // Initialize column selector
    initColumnSelector();
    
    // Initialize table sorting
    initTableSorting();
    
    // Initialize other functionality
    initTableFunctionality();
    initSearchFunctionality();
    initPagination();
    initBulkActions();
    initTooltips();
    refreshRowNumbers();
});

function initColumnSelector() {
    const selectorBtn = document.querySelector('.column-selector-btn');
    const dropdown = document.querySelector('.column-selector-dropdown');
    const checkboxes = dropdown.querySelectorAll('input[type="checkbox"]');
    const selectAllBtn = document.querySelector('.select-all-columns');
    const deselectAllBtn = document.querySelector('.deselect-all-columns');
    const applyBtn = document.querySelector('.apply-columns');
    
    if (!selectorBtn || !dropdown) return;
    
    // Load saved preferences
    loadColumnPreferences();
    
    // Toggle dropdown
    selectorBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        dropdown.classList.toggle('show');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!dropdown.contains(e.target) && !selectorBtn.contains(e.target)) {
            dropdown.classList.remove('show');
        }
    });
    
    // Prevent dropdown from closing when clicking inside
    dropdown.addEventListener('click', function(e) {
        e.stopPropagation();
    });
    
    // Select all columns
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', function() {
            checkboxes.forEach(checkbox => {
                checkbox.checked = true;
            });
        });
    }
    
    // Deselect all columns
    if (deselectAllBtn) {
        deselectAllBtn.addEventListener('click', function() {
            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
        });
    }
    
    // Apply column selection
    if (applyBtn) {
        applyBtn.addEventListener('click', function() {
            applyColumnSelection();
            dropdown.classList.remove('show');
        });
    }
    
    // Handle individual checkbox changes
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            // Ensure at least one column is selected
            const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
            if (checkedCount === 0) {
                this.checked = true;
                alert('최소 하나의 컬럼은 선택되어야 합니다.');
            }
        });
    });
}

function loadColumnPreferences() {
    const savedPreferences = localStorage.getItem('adminMembersColumnPreferences');
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
    localStorage.setItem('adminMembersColumnPreferences', JSON.stringify(preferences));
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

function refreshRowNumbers() {
    const rows = document.querySelectorAll('#members-table tbody tr');
    let number = 1;
    rows.forEach(row => {
        if (row.style.display === 'none') {
            return;
        }
        const cell = row.querySelector('.row-number');
        if (cell) {
            cell.textContent = number;
            number += 1;
        }
    });
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
            refreshRowNumbers();
        });
    }
}

function initPagination() {
    const paginationLinks = document.querySelectorAll('.pagination a');
    paginationLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('href').split('=')[1];
            window.location.href = `?page=${page}`;
        });
    });
}

function initBulkActions() {
    const deleteSelectedBtn = document.getElementById('delete-selected');
    if (deleteSelectedBtn) {
        deleteSelectedBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            const selectedRows = document.querySelectorAll('.row-checkbox:checked');
            if (selectedRows.length === 0) {
                alert('삭제할 항목을 선택해주세요.');
                return;
            }
            
            if (confirm(`선택된 ${selectedRows.length}개 항목을 삭제하시겠습니까?`)) {
                const form = document.getElementById('bulk-delete-form');
                if (form) {
                    form.submit();
                }
            }
        });
    }
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

// Table sorting functionality
function initTableSorting() {
    const sortableHeaders = document.querySelectorAll('.sortable');
    
    sortableHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const sortKey = this.getAttribute('data-sort');
            const currentDirection = this.classList.contains('asc') ? 'asc' : 
                                   this.classList.contains('desc') ? 'desc' : 'none';
            
            // Clear other headers
            sortableHeaders.forEach(h => {
                h.classList.remove('asc', 'desc');
            });
            
            // Set new direction
            const newDirection = currentDirection === 'asc' ? 'desc' : 'asc';
            this.classList.add(newDirection);
            
            // Sort table
            sortTable(sortKey, newDirection);
        });
    });
}

function sortTable(sortKey, direction) {
    const table = document.getElementById('members-table');
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
        if (sortKey === 'birth_date' || sortKey === 'created_at') {
            // Date sorting
            aValue = new Date(aValue || '1900-01-01');
            bValue = new Date(bValue || '1900-01-01');
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
    refreshRowNumbers();
}

// Export members function
function exportMembers() {
    const checkboxes = document.getElementsByName('selected_members');
    const selected = Array.from(checkboxes)
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.value);
    
    if (selected.length === 0) {
        alert("다운로드할 회원을 최소 1명 이상 선택해주세요.");
        return;
    }
    
    // 컬럼 선택 팝업 열기
    const popupUrl = `/select_columns_members?members=${encodeURIComponent(selected.join(','))}`;
    window.open(popupUrl, '_blank', 'width=600,height=800,scrollbars=yes,resizable=yes');
}

// Open popup function
function openPopup(url) {
    window.open(url, '_blank', 'width=680,height=860,scrollbars=yes,resizable=yes');
}

(function initMemberApproval() {
    const modal = document.getElementById('memberApproveModal');
    if (!modal) return;

    let pendingMemberId = null;
    let pendingCell = null;

    const nameEl = document.getElementById('approveName');
    const usernameEl = document.getElementById('approveUsername');
    const emailEl = document.getElementById('approveEmail');
    const confirmBtn = modal.querySelector('.btn-approve-confirm');
    const typeRadios = () => Array.from(modal.querySelectorAll('input[name="approve_member_type"]'));

    function openApproveModal(link) {
        pendingMemberId = link.dataset.memberId;
        pendingCell = link.closest('td[data-column="workplace_type"]');
        nameEl.textContent = link.dataset.name || '-';
        usernameEl.textContent = link.dataset.username || '-';
        emailEl.textContent = link.dataset.email || '-';
        const currentType = link.dataset.memberType || '';
        typeRadios().forEach((radio) => {
            radio.checked = radio.value === currentType;
        });
        confirmBtn.disabled = false;
        modal.hidden = false;
        document.body.style.overflow = 'hidden';
    }

    function closeApproveModal() {
        modal.hidden = true;
        document.body.style.overflow = '';
        pendingMemberId = null;
        pendingCell = null;
    }

    document.getElementById('members-table')?.addEventListener('click', (e) => {
        const link = e.target.closest('.approval-pending-link');
        if (!link) return;
        e.preventDefault();
        openApproveModal(link);
    });

    modal.querySelector('.member-approve-backdrop')?.addEventListener('click', closeApproveModal);
    modal.querySelector('.member-approve-close')?.addEventListener('click', closeApproveModal);
    modal.querySelector('.btn-approve-cancel')?.addEventListener('click', closeApproveModal);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.hidden) {
            closeApproveModal();
        }
    });

    confirmBtn?.addEventListener('click', async () => {
        if (!pendingMemberId) return;
        const selected = typeRadios().find((radio) => radio.checked);
        if (!selected) {
            alert('회원구분을 선택해 주세요.');
            return;
        }
        confirmBtn.disabled = true;
        try {
            const res = await fetch(`/members/approve/${pendingMemberId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ member_type: selected.value }),
            });
            const data = await res.json();
            if (!data.success) {
                throw new Error(data.message || '승인 실패');
            }
            if (pendingCell) {
                pendingCell.dataset.isActive = '1';
                pendingCell.dataset.memberType = data.member_type || selected.value;
                pendingCell.textContent = data.workplace_type_label || data.member_type || selected.value;
            }
            closeApproveModal();
        } catch (err) {
            alert(err.message || '승인 중 오류가 발생했습니다.');
            confirmBtn.disabled = false;
        }
    });
})();
 