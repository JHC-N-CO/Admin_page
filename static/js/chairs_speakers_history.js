const PERSON_COLUMNS = [
    '성명(KOR)', '성명(ENG)', '이메일', '전화',
    '소속(KOR)', '과(KOR)', '소속(ENG)', '과(ENG)',
    '직위', '면허번호', '생년월일', '회원구분',
    '국가', '국가약어', '연자비', '은행정보', '프로필',
];

const TABLE_COLSPAN = PERSON_COLUMNS.length + 6; // checkbox + year cols + session/presentation

let allPeople = [];
let displayedPeople = [];

document.addEventListener('DOMContentLoaded', () => {
    loadHistory();
    bindFilters();
    bindUploads();
    bindDelete();
    bindTitleModal();
});

async function loadHistory() {
    const tbody = document.getElementById('historyTableBody');
    tbody.innerHTML = `<tr><td colspan="${TABLE_COLSPAN}" class="empty-state">불러오는 중...</td></tr>`;
    try {
        const res = await fetch('/api/chairs_speakers_history');
        const data = await res.json();
        if (data.status !== 'success') {
            throw new Error(data.message || '데이터 로드 실패');
        }
        allPeople = data.people || [];
        document.getElementById('historyCount').textContent = `${allPeople.length}명`;
        applyFilters();
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="${TABLE_COLSPAN}" class="empty-state">${escapeHtml(err.message)}</td></tr>`;
    }
}

function bindFilters() {
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('roleFilter').addEventListener('change', applyFilters);
    document.getElementById('regionFilter').addEventListener('change', applyFilters);
    document.getElementById('deptFilter').addEventListener('change', applyFilters);
}

function bindUploads() {
    document.getElementById('historyUploadForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await uploadCsv('historyUploadForm', 'history', 'historyUploadStatus');
    });
    document.getElementById('sessionsUploadForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await uploadCsv('sessionsUploadForm', 'sessions', 'sessionsUploadStatus');
    });
}

function bindDelete() {
    document.getElementById('selectAllCheckbox').addEventListener('change', (e) => {
        const checked = e.target.checked;
        document.querySelectorAll('.history-row-checkbox').forEach((cb) => {
            cb.checked = checked;
        });
        updateSelectedCount();
    });

    document.getElementById('deleteSelectedBtn').addEventListener('click', deleteSelected);
}

async function uploadCsv(formId, type, statusId) {
    const form = document.getElementById(formId);
    const statusEl = document.getElementById(statusId);
    const fileInput = form.querySelector('input[type="file"]');
    if (!fileInput.files.length) {
        statusEl.textContent = '파일을 선택하세요.';
        statusEl.className = 'upload-status error';
        return;
    }
    const fd = new FormData();
    fd.append('type', type);
    fd.append('file', fileInput.files[0]);
    statusEl.textContent = '업로드 중...';
    statusEl.className = 'upload-status';
    try {
        const res = await fetch('/api/chairs_speakers_history/upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (data.status !== 'success') {
            throw new Error(data.message || '업로드 실패');
        }
        allPeople = data.people || [];
        document.getElementById('historyCount').textContent = `${allPeople.length}명`;
        applyFilters();
        statusEl.textContent = data.message;
        statusEl.className = 'upload-status';
        fileInput.value = '';
    } catch (err) {
        statusEl.textContent = err.message;
        statusEl.className = 'upload-status error';
    }
}

function applyFilters() {
    const q = document.getElementById('searchInput').value.trim().toLowerCase();
    const role = document.getElementById('roleFilter').value;
    const region = document.getElementById('regionFilter').value;
    const dept = document.getElementById('deptFilter').value;

    displayedPeople = allPeople.filter((person) => {
        if (q) {
            const haystack = PERSON_COLUMNS.map((c) => person[c] || '').join(' ').toLowerCase();
            const years = `${person.chair_years} ${person.speaker_years} ${person.panel_years}`.toLowerCase();
            const titles = `${person.session_titles || ''} ${person.presentation_titles || ''}`.toLowerCase();
            if (!haystack.includes(q) && !years.includes(q) && !titles.includes(q)) {
                return false;
            }
        }
        if (role === '좌장' && !person.chair_years) return false;
        if (role === '연자' && !person.speaker_years) return false;
        if (role === '패널' && !person.panel_years) return false;
        if (region) {
            const blob = `${person.chair_years} ${person.speaker_years} ${person.panel_years}`;
            if (!blob.includes(region)) return false;
        }
        if (dept) {
            const blob = `${person.chair_years} ${person.speaker_years} ${person.panel_years}`;
            if (!blob.includes(dept)) return false;
        }
        return true;
    });
    renderTable(displayedPeople);
}

function renderTable(people) {
    const tbody = document.getElementById('historyTableBody');
    const selectAll = document.getElementById('selectAllCheckbox');
    selectAll.checked = false;

    if (!people.length) {
        tbody.innerHTML = `<tr><td colspan="${TABLE_COLSPAN}" class="empty-state">표시할 데이터가 없습니다.</td></tr>`;
        updateSelectedCount();
        return;
    }

    tbody.innerHTML = people.map((person) => {
        const sessionTitles = person.session_titles || '';
        const presentationTitles = person.presentation_titles || '';
        const personKey = escapeHtml(person.person_key || '');
        const nameLabel = escapeHtml(person['성명(KOR)'] || person['성명(ENG)'] || '이름 없음');
        const personCells = PERSON_COLUMNS.map((col) => {
            const val = person[col] || '';
            return `<td title="${escapeHtml(val)}">${escapeHtml(val)}</td>`;
        }).join('');
        return `<tr>
            <td class="col-check">
                <input type="checkbox" class="history-row-checkbox" value="${personKey}" data-name="${nameLabel}" onchange="updateSelectedCount()">
            </td>
            ${personCells}
            <td class="year-col" title="${escapeHtml(person.chair_years || '')}">${escapeHtml(person.chair_years || '')}</td>
            <td class="year-col" title="${escapeHtml(person.speaker_years || '')}">${escapeHtml(person.speaker_years || '')}</td>
            <td class="year-col" title="${escapeHtml(person.panel_years || '')}">${escapeHtml(person.panel_years || '')}</td>
            ${renderTitleCell(sessionTitles, personKey, nameLabel, 'session', person.sessions)}
            ${renderTitleCell(presentationTitles, personKey, nameLabel, 'presentation', person.sessions)}
        </tr>`;
    }).join('');
    updateSelectedCount();
}

function renderTitleCell(text, personKey, nameLabel, type, sessions) {
    if (!text) {
        return '<td class="session-cell"></td>';
    }
    const hasDetail = (sessions || []).some((s) => s[type === 'session' ? 'session_title' : 'presentation_title']);
    if (!hasDetail) {
        return `<td class="session-cell" title="${escapeHtml(text)}">${escapeHtml(text)}</td>`;
    }
    const label = type === 'session' ? '세션 제목' : '발표 제목';
    return `<td class="session-cell session-cell-clickable"
        data-person-key="${personKey}"
        data-person-name="${nameLabel}"
        data-title-type="${type}"
        title="클릭하여 ${label} 전체 보기">${escapeHtml(text)}</td>`;
}

function bindTitleModal() {
    const modal = document.getElementById('titleDetailModal');
    if (!modal) {
        return;
    }

    document.getElementById('historyTableBody').addEventListener('click', (e) => {
        const cell = e.target.closest('.session-cell-clickable');
        if (!cell) {
            return;
        }
        openTitleModal(cell.dataset.personKey, cell.dataset.personName, cell.dataset.titleType);
    });

    modal.querySelector('.title-modal-backdrop').addEventListener('click', closeTitleModal);
    modal.querySelector('.title-modal-close').addEventListener('click', closeTitleModal);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.hidden) {
            closeTitleModal();
        }
    });
}

function openTitleModal(personKey, personName, type) {
    const person = allPeople.find((p) => p.person_key === personKey);
    const modal = document.getElementById('titleDetailModal');
    const heading = document.getElementById('titleModalHeading');
    const subtitle = document.getElementById('titleModalPersonName');
    const body = document.getElementById('titleModalBody');

    const isSession = type === 'session';
    heading.textContent = isSession ? '세션 제목' : '발표 제목';
    subtitle.textContent = personName || '';
    body.innerHTML = buildTitleModalHtml(person ? person.sessions : [], type);

    modal.hidden = false;
    document.body.style.overflow = 'hidden';
}

function closeTitleModal() {
    const modal = document.getElementById('titleDetailModal');
    if (!modal || modal.hidden) {
        return;
    }
    modal.hidden = true;
    document.body.style.overflow = '';
}

function buildTitleModalHtml(sessions, type) {
    const field = type === 'session' ? 'session_title' : 'presentation_title';
    const items = (sessions || []).filter((s) => s[field]);

    if (!items.length) {
        return '<p class="title-modal-empty">표시할 내용이 없습니다.</p>';
    }

    return items.map((s) => `
        <div class="title-modal-item">
            <div class="title-modal-meta">
                <span class="title-modal-year">${escapeHtml(s.year || '')}</span>
                <span class="title-modal-role">${escapeHtml(s.role_type || '')} (${escapeHtml(s.region || '')}·${escapeHtml(s.dept || '')})</span>
            </div>
            <div class="title-modal-text">${escapeHtml(s[field])}</div>
        </div>
    `).join('');
}

function getSelectedKeys() {
    return Array.from(document.querySelectorAll('.history-row-checkbox:checked')).map((cb) => cb.value);
}

function updateSelectedCount() {
    const selected = getSelectedKeys();
    const countEl = document.getElementById('selectedCount');
    const deleteBtn = document.getElementById('deleteSelectedBtn');
    const selectAll = document.getElementById('selectAllCheckbox');
    const visible = document.querySelectorAll('.history-row-checkbox');

    countEl.textContent = String(selected.length);
    deleteBtn.disabled = selected.length === 0;

    if (visible.length > 0) {
        selectAll.checked = selected.length === visible.length;
        selectAll.indeterminate = selected.length > 0 && selected.length < visible.length;
    } else {
        selectAll.checked = false;
        selectAll.indeterminate = false;
    }
}

async function deleteSelected() {
    const checkboxes = Array.from(document.querySelectorAll('.history-row-checkbox:checked'));
    if (!checkboxes.length) {
        return;
    }

    const names = checkboxes.map((cb) => cb.dataset.name || cb.value).slice(0, 5);
    const more = checkboxes.length > 5 ? ` 외 ${checkboxes.length - 5}명` : '';
    const message = `선택한 ${checkboxes.length}명을 역대 명단에서 삭제합니다.\n\n${names.join(', ')}${more}\n\n계속하시겠습니까?`;
    if (!window.confirm(message)) {
        return;
    }

    const personKeys = checkboxes.map((cb) => cb.value);
    const deleteBtn = document.getElementById('deleteSelectedBtn');
    deleteBtn.disabled = true;

    try {
        const res = await fetch('/api/chairs_speakers_history/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ person_keys: personKeys }),
        });
        const data = await res.json();
        if (data.status !== 'success') {
            throw new Error(data.message || '삭제 실패');
        }
        allPeople = data.people || [];
        document.getElementById('historyCount').textContent = `${allPeople.length}명`;
        applyFilters();
        alert(data.message);
    } catch (err) {
        alert(err.message);
        updateSelectedCount();
    }
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// inline handler from checkbox
window.updateSelectedCount = updateSelectedCount;
