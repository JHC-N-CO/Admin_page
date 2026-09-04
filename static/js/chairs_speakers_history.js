const PERSON_COLUMNS = [
    '성명(KOR)', '성명(ENG)', '이메일', '전화',
    '소속(KOR)', '과(KOR)', '소속(ENG)', '과(ENG)',
    '직위', '면허번호', '생년월일', '회원구분',
    '국가', '국가약어', '연자비', '은행정보',
];

const DETAIL_COLUMN_LABELS = {
    profile: '프로필',
    years: '참여 연도',
    titles: '세션/발표 제목',
};

const TABLE_COLSPAN = PERSON_COLUMNS.length + 6; // checkbox + 번호 + profile + 참여연도 + 세션/발표 + 관리

let allPeople = [];
let displayedPeople = [];
let duplicateCandidates = [];

document.addEventListener('DOMContentLoaded', () => {
    loadHistory();
    bindFilters();
    bindUploads();
    bindDelete();
    bindMerge();
    bindTitleModal();
    bindSidebarToggle();
});

function bindSidebarToggle() {
    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    const sidebar = document.getElementById('sidebar');
    if (sidebarToggleBtn && sidebar) {
        sidebarToggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }
}

async function loadHistory() {
    const tbody = document.getElementById('historyTableBody');
    tbody.innerHTML = `<tr><td colspan="${TABLE_COLSPAN}" class="empty-state">불러오는 중...</td></tr>`;
    try {
        const res = await fetch('/api/chairs_speakers_history');
        const data = await res.json();
        if (data.status !== 'success') {
            throw new Error(data.message || '데이터 로드 실패');
        }
        applyHistoryResponse(data);
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

function bindMerge() {
    document.getElementById('mergeSelectedBtn').addEventListener('click', () => {
        mergePeople(getSelectedKeys());
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
        duplicateCandidates = data.duplicates || [];
        document.getElementById('historyCount').textContent = `${allPeople.length}명`;
        renderDuplicatePanel();
        applyFilters();
        statusEl.textContent = data.message;
        statusEl.className = 'upload-status';
        fileInput.value = '';
    } catch (err) {
        statusEl.textContent = err.message;
        statusEl.className = 'upload-status error';
    }
}

function applyHistoryResponse(data) {
    allPeople = data.people || [];
    duplicateCandidates = data.duplicates || [];
    document.getElementById('historyCount').textContent = `${allPeople.length}명`;
    renderDuplicatePanel();
    applyFilters();
}

function renderDuplicatePanel() {
    const panel = document.getElementById('duplicateReviewPanel');
    const list = document.getElementById('duplicateList');
    const countEl = document.getElementById('duplicateCount');
    if (!panel || !list) {
        return;
    }

    countEl.textContent = String(duplicateCandidates.length);
    if (!duplicateCandidates.length) {
        panel.hidden = true;
        list.innerHTML = '';
        return;
    }

    panel.hidden = false;
    list.innerHTML = duplicateCandidates.map((group) => {
        const keysAttr = encodeURIComponent(JSON.stringify(group.people.map((p) => p.person_key)));
        const peopleHtml = group.people.map((p) => `
            <div class="duplicate-person">
                <strong>${escapeHtml(p['성명(KOR)'] || p['성명(ENG)'] || '이름 없음')}</strong>
                이메일: ${escapeHtml(p['이메일'] || '-')}<br>
                면허번호: ${escapeHtml(p['면허번호'] || '-')}<br>
                과: ${escapeHtml(p['과(KOR)'] || '-')}<br>
                연자: ${escapeHtml(p.speaker_years || '-')}<br>
                좌장: ${escapeHtml(p.chair_years || '-')}
            </div>
        `).join('');
        return `
            <div class="duplicate-card" data-person-keys="${keysAttr}">
                <p class="duplicate-card-title">${escapeHtml(group.label)} — ${group.people.length}건</p>
                <div class="duplicate-people">${peopleHtml}</div>
                <div class="duplicate-actions">
                    <button type="button" class="btn btn-warning btn-sm duplicate-merge-btn">
                        <i class="fas fa-compress-alt"></i> 동일 인물로 병합
                    </button>
                    <button type="button" class="btn btn-secondary btn-sm duplicate-dismiss-btn">
                        다른 사람 (무시)
                    </button>
                </div>
            </div>
        `;
    }).join('');

    list.querySelectorAll('.duplicate-merge-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            const card = e.target.closest('.duplicate-card');
            const keys = JSON.parse(decodeURIComponent(card.dataset.personKeys));
            mergePeople(keys);
        });
    });
    list.querySelectorAll('.duplicate-dismiss-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            const card = e.target.closest('.duplicate-card');
            const keys = JSON.parse(decodeURIComponent(card.dataset.personKeys));
            dismissDuplicate(keys, card.querySelector('.duplicate-card-title')?.textContent || '');
        });
    });
}

async function mergePeople(personKeys) {
    const keys = [...new Set((personKeys || []).filter(Boolean))];
    if (keys.length < 2) {
        alert('병합할 인물을 2명 이상 선택하세요.');
        return;
    }

    const summaries = keys.map((key) => {
        const p = allPeople.find((person) => person.person_key === key);
        if (!p) {
            return key;
        }
        const name = p['성명(KOR)'] || p['성명(ENG)'] || '이름 없음';
        return `${name} (${p['이메일'] || '이메일 없음'})`;
    });
    const message = `아래 ${keys.length}건을 동일 인물로 병합합니다.\n\n${summaries.join('\n')}\n\n계속하시겠습니까?`;
    if (!window.confirm(message)) {
        return;
    }

    try {
        const res = await fetch('/api/chairs_speakers_history/merge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ person_keys: keys }),
        });
        const data = await res.json();
        if (data.status !== 'success') {
            throw new Error(data.message || '병합 실패');
        }
        applyHistoryResponse(data);
        alert(data.message);
    } catch (err) {
        alert(err.message);
    }
}

async function dismissDuplicate(personKeys, label) {
    const message = `「${label || '선택한 그룹'}」을 동명이인(다른 사람)으로 확인하고 목록에서 제외합니다.\n\n계속하시겠습니까?`;
    if (!window.confirm(message)) {
        return;
    }

    try {
        const res = await fetch('/api/chairs_speakers_history/dismiss_duplicate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ person_keys: personKeys }),
        });
        const data = await res.json();
        if (data.status !== 'success') {
            throw new Error(data.message || '처리 실패');
        }
        applyHistoryResponse(data);
    } catch (err) {
        alert(err.message);
    }
}

function applyFilters() {
    const q = document.getElementById('searchInput').value.trim().toLowerCase();
    const role = document.getElementById('roleFilter').value;
    const region = document.getElementById('regionFilter').value;
    const dept = document.getElementById('deptFilter').value;

    displayedPeople = allPeople.filter((person) => {
        if (q) {
            const haystack = [
                ...PERSON_COLUMNS.map((c) => person[c] || ''),
                person['프로필'] || '',
            ].join(' ').toLowerCase();
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

function hasParticipationYears(person) {
    return Boolean(person.chair_years || person.speaker_years || person.panel_years);
}

function formatParticipationYearsSummary(person) {
    const parts = [];
    if (person.chair_years) parts.push(`좌장 ${person.chair_years}`);
    if (person.speaker_years) parts.push(`연자 ${person.speaker_years}`);
    if (person.panel_years) parts.push(`패널 ${person.panel_years}`);
    return parts.join(' / ');
}

function roleYearClass(roleType) {
    if (roleType === '좌장') return 'title-modal-year-chair';
    if (roleType === '패널') return 'title-modal-year-panel';
    return 'title-modal-year-speaker';
}

function formatYearTagsHtml(text, roleType) {
    if (!text) return '';
    const yearClass = roleYearClass(roleType);
    return text.split(',')
        .map((part) => part.trim())
        .filter(Boolean)
        .map((tag) => `<span class="title-modal-year ${yearClass}">${escapeHtml(tag)}</span>`)
        .join(' ');
}

function hasTitles(person) {
    return Boolean(person.session_titles || person.presentation_titles);
}

function formatPresentationTitlesByRole(person, roleType) {
    const items = (person.sessions || []).filter(
        (s) => s.role_type === roleType && s.presentation_title
    );
    if (items.length) {
        return items.map((s) => {
            const title = s.presentation_title || '';
            return s.year ? `${s.year}: ${title}` : title;
        }).join(' | ');
    }
    return '';
}

function formatTitlesSummary(person) {
    const parts = [];
    if (person.session_titles) {
        parts.push(`좌장 ${person.session_titles}`);
    }
    const speakerTitles = formatPresentationTitlesByRole(person, '연자');
    const panelTitles = formatPresentationTitlesByRole(person, '패널');
    if (speakerTitles) {
        parts.push(`연자 ${speakerTitles}`);
    }
    if (panelTitles) {
        parts.push(`패널 ${panelTitles}`);
    }
    if (!speakerTitles && !panelTitles && person.presentation_titles) {
        parts.push(`연자 ${person.presentation_titles}`);
    }
    return parts.join(' / ');
}

function roleSectionClass(roleType) {
    if (roleType === '좌장') return 'title-modal-section-chair';
    if (roleType === '패널') return 'title-modal-section-panel';
    return 'title-modal-section-speaker';
}

function buildYearsModalHtml(person) {
    if (!person) {
        return '<p class="title-modal-empty">표시할 내용이 없습니다.</p>';
    }

    const sections = [
        { label: '좌장', roleType: '좌장', text: person.chair_years || '' },
        { label: '연자', roleType: '연자', text: person.speaker_years || '' },
        { label: '패널', roleType: '패널', text: person.panel_years || '' },
    ].filter((section) => section.text);

    if (!sections.length) {
        return '<p class="title-modal-empty">표시할 내용이 없습니다.</p>';
    }

    return sections.map((section) => `
        <div class="title-modal-section">
            <div class="title-modal-section-heading ${roleSectionClass(section.roleType)}">${escapeHtml(section.label)}</div>
            <div class="title-modal-year-tags">${formatYearTagsHtml(section.text, section.roleType)}</div>
        </div>
    `).join('');
}

function buildTitlesModalHtml(person) {
    if (!person) {
        return '<p class="title-modal-empty">표시할 내용이 없습니다.</p>';
    }

    const sessions = person.sessions || [];
    const sections = [
        {
            label: '좌장 · 세션 제목',
            roleType: '좌장',
            field: 'session_title',
            items: sessions.filter((s) => s.session_title),
        },
        {
            label: '연자 · 발표 제목',
            roleType: '연자',
            field: 'presentation_title',
            items: sessions.filter((s) => s.presentation_title && s.role_type === '연자'),
        },
        {
            label: '패널 · 발표 제목',
            roleType: '패널',
            field: 'presentation_title',
            items: sessions.filter((s) => s.presentation_title && s.role_type === '패널'),
        },
    ].filter((section) => section.items.length);

    if (!sections.length) {
        const fallback = [];
        if (person.session_titles) {
            fallback.push(`
                <div class="title-modal-section">
                    <div class="title-modal-section-heading title-modal-section-chair">좌장 · 세션 제목</div>
                    <div class="title-modal-text">${escapeHtml(person.session_titles)}</div>
                </div>
            `);
        }
        if (person.presentation_titles) {
            fallback.push(`
                <div class="title-modal-section">
                    <div class="title-modal-section-heading title-modal-section-speaker">연자 · 발표 제목</div>
                    <div class="title-modal-text">${escapeHtml(person.presentation_titles)}</div>
                </div>
            `);
        }
        if (fallback.length) {
            return fallback.join('');
        }
        return '<p class="title-modal-empty">표시할 내용이 없습니다.</p>';
    }

    return sections.map((section) => `
        <div class="title-modal-section">
            <div class="title-modal-section-heading ${roleSectionClass(section.roleType)}">${escapeHtml(section.label)}</div>
            ${section.items.map((s) => `
                <div class="title-modal-item">
                    <div class="title-modal-meta">
                        <span class="title-modal-year ${roleYearClass(s.role_type)}">${escapeHtml(s.year || '')}</span>
                        <span class="title-modal-role">${escapeHtml(s.role_type || '')}${formatRoleContext(s)}</span>
                    </div>
                    <div class="title-modal-text">${escapeHtml(s[section.field])}</div>
                </div>
            `).join('')}
        </div>
    `).join('');
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

    tbody.innerHTML = people.map((person, index) => {
        const personKey = escapeHtml(person.person_key || '');
        const nameLabel = escapeHtml(person['성명(KOR)'] || person['성명(ENG)'] || '이름 없음');
        const personCells = PERSON_COLUMNS.map((col) => {
            const val = person[col] || '';
            let cellClass = '';
            if (col === '성명(KOR)') cellClass = ' class="col-name-kor col-sticky-name"';
            else if (col === '성명(ENG)') cellClass = ' class="col-name-eng col-sticky-name"';
            else if (col === '전화') cellClass = ' class="col-phone"';
            else if (col === '국가') cellClass = ' class="col-country"';
            return `<td${cellClass} title="${escapeHtml(val)}">${escapeHtml(val)}</td>`;
        }).join('');
        return `<tr>
            <td class="col-check">
                <input type="checkbox" class="history-row-checkbox" value="${personKey}" data-name="${nameLabel}" onchange="updateSelectedCount()">
            </td>
            <td class="col-num">${index + 1}</td>
            ${personCells}
            ${renderDetailCell(person['프로필'] || '', personKey, nameLabel, 'profile')}
            ${renderDetailCell(
                hasParticipationYears(person) ? formatParticipationYearsSummary(person) : '',
                personKey,
                nameLabel,
                'years'
            )}
            ${renderDetailCell(
                hasTitles(person) ? formatTitlesSummary(person) : '',
                personKey,
                nameLabel,
                'titles'
            )}
            <td class="col-actions">
                <a href="#" class="action-link history-edit-link" data-person-key="${personKey}">수정</a>
            </td>
        </tr>`;
    }).join('');

    tbody.querySelectorAll('.history-edit-link').forEach((link) => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            openHistoryEditPopup(link.dataset.personKey);
        });
    });
    updateSelectedCount();
}

function openHistoryEditPopup(personKey) {
    if (!personKey) return;
    const url = `/chairs_speakers_history/edit?key=${encodeURIComponent(personKey)}`;
    window.open(url, '_blank', 'width=680,height=860,scrollbars=yes,resizable=yes');
}

function renderDetailCell(text, personKey, nameLabel, type) {
    if (!text) {
        return '<td class="col-narrow-detail session-cell"></td>';
    }
    const label = DETAIL_COLUMN_LABELS[type] || '내용';
    const preview = String(text).replace(/\s+/g, ' ').trim();
    return `<td class="col-narrow-detail session-cell session-cell-clickable"
        data-person-key="${personKey}"
        data-person-name="${nameLabel}"
        data-title-type="${type}"
        title="클릭하여 ${label} 전체 보기"><div class="detail-cell-text">${escapeHtml(preview)}</div></td>`;
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

    heading.textContent = DETAIL_COLUMN_LABELS[type] || '상세 내용';
    subtitle.textContent = personName || '';

    if (type === 'profile') {
        const profileText = person ? (person['프로필'] || '') : '';
        body.innerHTML = profileText
            ? `<div class="title-modal-text">${escapeHtml(profileText)}</div>`
            : '<p class="title-modal-empty">표시할 내용이 없습니다.</p>';
    } else if (type === 'years') {
        body.innerHTML = buildYearsModalHtml(person);
    } else if (type === 'titles') {
        body.innerHTML = buildTitlesModalHtml(person);
    }

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

function formatRoleContext(session) {
    const parts = [];
    if (session.region) {
        parts.push(session.region);
    }
    if (session.dept) {
        parts.push(session.dept);
    }
    return parts.length ? ` (${parts.join('·')})` : '';
}

function getSelectedKeys() {
    return Array.from(document.querySelectorAll('.history-row-checkbox:checked')).map((cb) => cb.value);
}

function updateSelectedCount() {
    const selected = getSelectedKeys();
    const countEl = document.getElementById('selectedCount');
    const mergeCountEl = document.getElementById('mergeSelectedCount');
    const deleteBtn = document.getElementById('deleteSelectedBtn');
    const mergeBtn = document.getElementById('mergeSelectedBtn');
    const selectAll = document.getElementById('selectAllCheckbox');
    const visible = document.querySelectorAll('.history-row-checkbox');

    countEl.textContent = String(selected.length);
    if (mergeCountEl) {
        mergeCountEl.textContent = String(selected.length);
    }
    deleteBtn.disabled = selected.length === 0;
    if (mergeBtn) {
        mergeBtn.disabled = selected.length < 2;
    }

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
        applyHistoryResponse(data);
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
