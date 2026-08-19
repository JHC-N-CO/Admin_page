function escapeAbstractHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function abstractSessionLabel(session) {
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
    const tracks = data.tracks || [];
    const html = ['<option value="">세션 선택</option>'];
    let hasSession = false;
    tracks.forEach((track) => {
        if (!track.sessions || !track.sessions.length) return;
        html.push(`<optgroup label="${escapeAbstractHtml(track.label)} (${escapeAbstractHtml(track.abbrev)})">`);
        track.sessions.forEach((session) => {
            hasSession = true;
            html.push(`<option value="${session.index}">${escapeAbstractHtml(abstractSessionLabel(session))}</option>`);
        });
        html.push('</optgroup>');
    });
    sessionSelect.innerHTML = hasSession
        ? html.join('')
        : '<option value="">Datablitz / Oral / Poster 세션 없음</option>';
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
        const assigned = person.assigned_session
            ? `<span class="assigned-pill">${escapeAbstractHtml(person.assigned_abbrev || '')} ${escapeAbstractHtml(person.assigned_session)}</span>`
            : '<span class="assigned-empty">미배정</span>';
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
            if (!confirm(`선택한 ${ids.length}명을 ${sessionName} 연자로 등분 배정할까요?`)) {
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
