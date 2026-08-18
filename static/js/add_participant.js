async function submitForm(event) {
    event.preventDefault();

    const formData = new FormData(event.target);

    try {
        const response = await fetch(event.target.action, {
            method: 'POST',
            body: formData,
        });

        if (response.redirected) {
            alert('참가자가 추가되었습니다.');
            window.close();
            if (window.opener) {
                window.opener.location.reload();
            }
        } else if (response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const result = await response.json();
                if (result.status === 'success') {
                    alert('참가자가 추가되었습니다.');
                    window.close();
                    if (window.opener) {
                        window.opener.location.reload();
                    }
                } else {
                    alert(result.message);
                }
            } else {
                const html = await response.text();
                document.body.innerHTML = html;
            }
        } else {
            alert('참가자 추가 중 오류가 발생했습니다.');
        }
    } catch (error) {
        console.error('Error during submission:', error);
        alert('참가자 추가 중 오류가 발생했습니다.');
    }
}

const PERSON_FORM_FIELDS = [
    'name_kor', 'first_name', 'family_name', 'email', 'phone',
    'country', 'country_code',
    'affiliation_kor', 'affiliation_eng', 'department_kor', 'department_eng',
    'position', 'license_number', 'birth_date', 'workplace_type',
];

function setPersonLookupStatus(message, type) {
    const el = document.getElementById('personLookupStatus');
    if (!el) return;
    if (!message) {
        el.style.display = 'none';
        el.textContent = '';
        el.className = 'person-lookup-status';
        return;
    }
    el.style.display = 'block';
    el.textContent = message;
    el.className = `person-lookup-status ${type || ''}`;
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function applyPersonToForm(person) {
    const setValue = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value || '';
    };

    setValue('name_kor', person.name_kor);
    setValue('first_name', person.first_name);
    setValue('family_name', person.family_name);
    setValue('email', person.email);
    setValue('phone', person.phone);
    setValue('country', person.country);
    setValue('country_code', person.country_code);
    setValue('affiliation_kor', person.affiliation_kor);
    setValue('affiliation_eng', person.affiliation_eng);
    setValue('department_kor', person.department_kor);
    setValue('department_eng', person.department_eng);
    setValue('position', person.position);
    setValue('license_number', person.license_number);
    setValue('birth_date', person.birth_date);
    setValue('workplace_type', person.workplace_type);

    const sourceBadge = document.getElementById('selectedPersonSource');
    const sourceLabel = document.getElementById('selectedPersonSourceLabel');
    if (sourceBadge && sourceLabel) {
        sourceLabel.textContent = person.source_label || '';
        sourceBadge.style.display = 'flex';
        sourceBadge.className = `person-source-badge source-${person.source || 'unknown'}`;
    }

    const resultsEl = document.getElementById('personLookupResults');
    if (resultsEl) resultsEl.style.display = 'none';
    setPersonLookupStatus(`${person.display_name} — ${person.source_label} 데이터를 불러왔습니다.`, 'success');
}

function clearPersonSelection() {
    PERSON_FORM_FIELDS.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const sourceBadge = document.getElementById('selectedPersonSource');
    if (sourceBadge) sourceBadge.style.display = 'none';
    setPersonLookupStatus('', '');
}

function renderPersonLookupResults(results) {
    const container = document.getElementById('personLookupResults');
    if (!container) return;

    if (!results.length) {
        container.style.display = 'none';
        container.innerHTML = '';
        setPersonLookupStatus('검색 결과가 없습니다.', 'empty');
        return;
    }

    container.style.display = 'block';
    container.innerHTML = results.map((person, index) => `
        <button type="button" class="person-lookup-item" data-index="${index}">
            <div class="person-lookup-item-main">
                <span class="person-lookup-name">${escapeHtml(person.display_name)}</span>
                <span class="person-source-tag source-${escapeHtml(person.source)}">${escapeHtml(person.source_label)}</span>
            </div>
            ${person.subtitle ? `<div class="person-lookup-sub">${escapeHtml(person.subtitle)}</div>` : ''}
        </button>
    `).join('');

    container._results = results;
    container.querySelectorAll('.person-lookup-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = Number(btn.getAttribute('data-index'));
            const person = container._results[idx];
            if (person) applyPersonToForm(person);
        });
    });

    setPersonLookupStatus(`${results.length}건의 검색 결과 — 항목을 클릭하면 폼에 채워집니다.`, '');
}

let personLookupTimer = null;
let personLookupRequestId = 0;

function clearPersonLookupResults() {
    const container = document.getElementById('personLookupResults');
    if (container) {
        container.style.display = 'none';
        container.innerHTML = '';
        container._results = [];
    }
}

async function searchPersonLookup(options = {}) {
    const { showShortHint = false } = options;
    const input = document.getElementById('personLookupQuery');
    const query = (input?.value || '').trim();

    if (query.length < 2) {
        clearPersonLookupResults();
        if (showShortHint && query.length > 0) {
            setPersonLookupStatus('2글자 이상 입력해 주세요.', 'error');
        } else {
            setPersonLookupStatus('', '');
        }
        return;
    }

    const requestId = ++personLookupRequestId;
    setPersonLookupStatus('검색 중...', '');

    try {
        const res = await fetch(`/api/person_lookup?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (requestId !== personLookupRequestId) return;
        if (!data.success) {
            throw new Error(data.message || '검색 실패');
        }
        renderPersonLookupResults(data.results || []);
    } catch (err) {
        if (requestId !== personLookupRequestId) return;
        console.error(err);
        setPersonLookupStatus('검색 중 오류가 발생했습니다.', 'error');
    }
}

function schedulePersonLookup() {
    clearTimeout(personLookupTimer);
    personLookupTimer = setTimeout(() => {
        searchPersonLookup({ showShortHint: true });
    }, 250);
}

document.addEventListener('DOMContentLoaded', function () {
    const lookupInput = document.getElementById('personLookupQuery');
    const clearBtn = document.getElementById('clearPersonLookup');

    if (lookupInput) {
        lookupInput.addEventListener('input', schedulePersonLookup);
        lookupInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                clearTimeout(personLookupTimer);
                searchPersonLookup({ showShortHint: true });
            }
        });
    }
    if (clearBtn) {
        clearBtn.addEventListener('click', clearPersonSelection);
    }

    const textareas = document.querySelectorAll('.auto-resize');
    textareas.forEach(textarea => {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
        textarea.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = `${this.scrollHeight}px`;
        });
    });
});
