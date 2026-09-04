function escapeAbstractHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

const ABSTRACT_ASSIGN_PILL_COLORS = [
    { bg: '#dbeafe', fg: '#1d4ed8' },
    { bg: '#dcfce7', fg: '#166534' },
    { bg: '#ffedd5', fg: '#c2410c' },
    { bg: '#fce7f3', fg: '#be185d' },
    { bg: '#e0e7ff', fg: '#3730a3' },
    { bg: '#fef3c7', fg: '#a16207' },
    { bg: '#ccfbf1', fg: '#0f766e' },
    { bg: '#fee2e2', fg: '#b91c1c' },
    { bg: '#ede9fe', fg: '#6d28d9' },
    { bg: '#ecfccb', fg: '#4d7c0f' },
];

function abstractAssignPillColor(key) {
    const text = String(key || '');
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) {
        hash = ((hash << 5) - hash) + text.charCodeAt(i);
        hash |= 0;
    }
    return ABSTRACT_ASSIGN_PILL_COLORS[Math.abs(hash) % ABSTRACT_ASSIGN_PILL_COLORS.length];
}

function abstractAssignedPill(person) {
    const abbrev = (person.assigned_abbrev || '').trim();
    const session = (person.assigned_session || '').trim();
    if (!abbrev && !session) {
        return '<span class="assigned-empty">미배정</span>';
    }
    const label = abbrev || session;
    const color = abstractAssignPillColor(label);
    const title = [abbrev, session].filter(Boolean).join(' · ');
    return (
        `<span class="assigned-pill" title="${escapeAbstractHtml(title)}" `
        + `style="background:${color.bg};color:${color.fg};border-color:${color.fg}33;">`
        + `${escapeAbstractHtml(label)}`
        + `</span>`
    );
}

function abstractSessionLabel(session) {
    if (session.untimed || session.poster_exhibition) {
        return [session.title, session.venue].filter(Boolean).join(' · ');
    }
    const time = session.start_time && session.end_time
        ? `${session.start_time}-${session.end_time}`
        : '';
    return [session.title, time, session.venue].filter(Boolean).join(' · ');
}

function selectedAbstractIds() {
    return Array.from(document.querySelectorAll('#abstractSubmittersModal input[name="submitter"]:checked'))
        .map((el) => el.value);
}

async function loadAbstractAssignSessions() {
    const eventId = document.body.getAttribute('data-event-id');
    const sessionSelect = document.getElementById('abstractSessionSelect');
    const assignBtn = document.getElementById('abstractAssignBtn');
    if (!eventId || !sessionSelect || !assignBtn) return;

    const response = await fetch(`/api/event/${eventId}/abstract_assign_sessions`);
    const data = await response.json();
    const sessions = data.sessions || [];
    const html = ['<option value="">세션 선택</option>'];
    let hasSession = false;
    let currentGroup = null;

    sessions.forEach((session) => {
        const groupKey = (session.untimed || session.poster_exhibition)
            ? (session.group_label || '포스터 전시')
            : (session.date || '날짜 없음');
        if (groupKey !== currentGroup) {
            if (currentGroup !== null) html.push('</optgroup>');
            currentGroup = groupKey;
            html.push(`<optgroup label="${escapeAbstractHtml(groupKey)}">`);
        }
        hasSession = true;
        html.push(
            `<option value="${session.index}" data-track-id="${escapeAbstractHtml(session.track_id || '')}" data-untimed="${session.untimed || session.poster_exhibition ? '1' : '0'}">`
            + `${escapeAbstractHtml(abstractSessionLabel(session))}`
            + `</option>`
        );
    });
    if (currentGroup !== null) html.push('</optgroup>');

    sessionSelect.innerHTML = hasSession
        ? html.join('')
        : '<option value="">초록 연자 배정 대상 세션 없음 (세션 편집에서 체크)</option>';
    assignBtn.disabled = !hasSession;
}

async function loadAbstractSubmitters() {
    const eventId = document.body.getAttribute('data-event-id');
    const peopleBody = document.getElementById('abstractPeopleBody');
    const selectAll = document.getElementById('abstractSelectAll');
    if (!eventId || !peopleBody) return;

    peopleBody.innerHTML = '<tr><td colspan="6" class="empty-state">불러오는 중...</td></tr>';
    const response = await fetch(`/api/event/${eventId}/abstract_submitters`);
    const data = await response.json();
    const people = data.people || [];
    if (!people.length) {
        peopleBody.innerHTML = '<tr><td colspan="6" class="empty-state">제출된 초록이 없습니다.</td></tr>';
        return;
    }
    peopleBody.innerHTML = people.map((person) => {
        const assigned = abstractAssignedPill(person);
        return `
            <tr>
                <td><input type="checkbox" name="submitter" value="${person.id}"></td>
                <td>${escapeAbstractHtml(person.name)}</td>
                <td>${escapeAbstractHtml(person.email)}</td>
                <td>${escapeAbstractHtml(person.affiliation)}</td>
                <td>${escapeAbstractHtml(person.department)}</td>
                <td>${assigned}</td>
            </tr>
        `;
    }).join('');
    if (selectAll) selectAll.checked = false;
}

function openAbstractSubmittersModal() {
    const modal = document.getElementById('abstractSubmittersModal');
    if (!modal) return;
    modal.style.display = 'block';
    loadAbstractAssignSessions();
    loadAbstractSubmitters();
}

function closeAbstractSubmittersModal() {
    const modal = document.getElementById('abstractSubmittersModal');
    if (modal) modal.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('abstractSubmittersModal');
    const selectAll = document.getElementById('abstractSelectAll');
    const assignBtn = document.getElementById('abstractAssignBtn');
    if (!modal) return;

    modal.addEventListener('click', (event) => {
        if (event.target === modal) closeAbstractSubmittersModal();
    });

    if (selectAll) {
        selectAll.addEventListener('change', () => {
            document.querySelectorAll('#abstractSubmittersModal input[name="submitter"]').forEach((el) => {
                el.checked = selectAll.checked;
            });
        });
    }

    if (assignBtn) {
        assignBtn.addEventListener('click', async () => {
            const eventId = document.body.getAttribute('data-event-id');
            const sessionSelect = document.getElementById('abstractSessionSelect');
            const ids = selectedAbstractIds();
            const sessionIndex = sessionSelect ? sessionSelect.value : '';
            if (!ids.length) {
                alert('배정할 사람을 선택해주세요.');
                return;
            }
            if (!sessionIndex) {
                alert('세션을 선택해주세요.');
                return;
            }
            const sessionName = sessionSelect.options[sessionSelect.selectedIndex].text;
            const trackId = sessionSelect.options[sessionSelect.selectedIndex].dataset.trackId || '';
            const untimed = sessionSelect.options[sessionSelect.selectedIndex].dataset.untimed === '1';
            const confirmMsg = (trackId === 'poster' || untimed)
                ? `선택한 ${ids.length}명을 ${sessionName} 포스터 발표자로 배정할까요?\n(개인 시간 배정 없이 이름만 등록됩니다.)`
                : `선택한 ${ids.length}명을 ${sessionName} 연자로 등분 배정할까요?`;
            if (!confirm(confirmMsg)) {
                return;
            }
            assignBtn.disabled = true;
            try {
                const response = await fetch(`/api/event/${eventId}/abstract_assign`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        participant_ids: ids,
                        session_index: Number(sessionIndex),
                    }),
                });
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || '배정에 실패했습니다.');
                }
                await Promise.all([loadAbstractSubmitters(), loadAbstractAssignSessions()]);
                if (typeof loadProgram === 'function') {
                    loadProgram();
                }
            } catch (error) {
                alert(error.message || '배정에 실패했습니다.');
            } finally {
                assignBtn.disabled = false;
            }
        });
    }
});
