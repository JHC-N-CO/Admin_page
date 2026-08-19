let selectedFile = null;
let previewRows = [];
let previewFilter = 'all';
const eventId = window.location.pathname.split('/').pop();

const STANDARD_COLUMNS = [
    '국가', '국가약어', '성명(KOR)', '성명(ENG)', '이름(First Name)', '성(Last Name)',
    '이메일', '전화', '소속(ENG)', '과(ENG)', '소속(KOR)', '과(KOR)',
    '직위', '면허번호', '생년월일'
];

document.addEventListener('DOMContentLoaded', function () {
    const fileInputArea = document.getElementById('fileInputArea');
    if (!fileInputArea) return;

    fileInputArea.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.add('dragover');
    });

    fileInputArea.addEventListener('dragleave', function (e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.remove('dragover');
    });

    fileInputArea.addEventListener('drop', function (e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect({ target: { files } });
        }
    });
});

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const fileName = file.name;
    const fileExtension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
    if (!['.xlsx', '.xls', '.csv'].includes(fileExtension)) {
        alert('Excel (.xlsx, .xls) 또는 CSV 파일만 업로드 가능합니다.');
        resetFileInput();
        return;
    }

    selectedFile = file;

    const fileInfo = document.getElementById('fileInfo');
    const fileNameElement = document.getElementById('fileName');
    const uploadBtn = document.getElementById('uploadBtn');
    const fileInputArea = document.getElementById('fileInputArea');

    if (fileNameElement) fileNameElement.textContent = fileName;
    if (fileInfo) fileInfo.style.display = 'flex';
    if (uploadBtn) uploadBtn.disabled = false;
    if (fileInputArea) fileInputArea.style.display = 'none';
}

function removeFile() {
    resetFileInput();
}

function resetFileInput() {
    selectedFile = null;
    previewRows = [];
    previewFilter = 'all';
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const uploadBtn = document.getElementById('uploadBtn');
    const fileInputArea = document.getElementById('fileInputArea');
    const previewSection = document.getElementById('previewSection');

    if (fileInput) fileInput.value = '';
    if (fileInfo) fileInfo.style.display = 'none';
    if (uploadBtn) {
        uploadBtn.disabled = true;
        uploadBtn.textContent = '명단 확인';
    }
    if (fileInputArea) fileInputArea.style.display = 'block';
    if (previewSection) previewSection.style.display = 'none';
}

function resetPreview() {
    const errorSection = document.getElementById('errorSection');
    const resultSection = document.getElementById('resultSection');
    if (errorSection) errorSection.style.display = 'none';
    if (resultSection) resultSection.style.display = 'none';
    document.querySelectorAll('.upload-section').forEach((section) => {
        section.style.display = '';
    });
    resetFileInput();
}

function downloadSample() {
    const sampleData = [
        STANDARD_COLUMNS,
        [
            '대한민국', 'KR', '홍길동', 'Hong Gildong', 'Gildong', 'Hong',
            'hong@example.com', '010-1234-5678',
            'Seoul National University Hospital', 'Neurology',
            '서울대학교병원', '신경과', '교수', '12345', '1980-05-15'
        ],
        [
            '미국', 'US', '김철수', 'Kim Cheolsu', 'Cheolsu', 'Kim',
            'kim@example.com', '010-9876-5432',
            'Harvard Medical School', 'Pediatrics',
            '하버드 의과대학', '소아과', '전문의', '67890', '1975-12-20'
        ]
    ];

    const ws = XLSX.utils.aoa_to_sheet(sampleData);
    ws['!cols'] = [
        { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 12 },
        { wch: 22 }, { wch: 15 }, { wch: 28 }, { wch: 14 }, { wch: 16 }, { wch: 12 },
        { wch: 10 }, { wch: 12 }, { wch: 12 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Participants');
    XLSX.writeFile(wb, '참가자_업로드_샘플.xlsx');
}

function escapeHtml(text) {
    return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function showError(message) {
    const errorSection = document.getElementById('errorSection');
    const errorMessage = document.getElementById('errorMessage');
    if (errorSection && errorMessage) {
        errorMessage.textContent = message;
        errorSection.style.display = 'block';
    } else {
        alert(message);
    }
}

async function parseJsonResponse(response) {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        return response.json();
    }
    const text = await response.text();
    try {
        return JSON.parse(text);
    } catch (e) {
        return { message: text };
    }
}

function renderPreview(summary, rows) {
    previewRows = rows || [];
    if (summary.review > 0) previewFilter = 'review';
    else if (summary.changed > 0) previewFilter = 'changed';
    else previewFilter = 'all';

    const hint = document.getElementById('previewHint');
    if (hint) {
        hint.textContent =
            `총 ${summary.total}명 — 등록구분 ${getDefaultRegistration()} — 회원 ${summary.member}명, 역대 좌장/연자 ${summary.history}명, ` +
            `이 행사 참가자 ${summary.participant}명, 변경 ${summary.changed || 0}명, 확인 필요 ${summary.review}명, 신규 ${summary.new}명`;
    }

    const confirmBtn = document.getElementById('confirmUploadBtn');
    if (confirmBtn) {
        confirmBtn.textContent = (summary.changed > 0)
            ? `변경 ${summary.changed}건을 반영하여 등록`
            : '이대로 등록';
    }

    const filters = [
        { key: 'all', label: `전체 ${summary.total}` },
        { key: 'member', label: `회원 ${summary.member}` },
        { key: 'history', label: `역대 ${summary.history}` },
        { key: 'participant', label: `이 행사 ${summary.participant}` },
        { key: 'changed', label: `변경 ${summary.changed || 0}` },
        { key: 'review', label: `확인 필요 ${summary.review}` },
        { key: 'new', label: `신규 ${summary.new}` },
    ];
    const filtersEl = document.getElementById('previewFilters');
    filtersEl.innerHTML = filters.map((item) => {
        const extraClass = item.key === 'review' ? ' filter-review' : (item.key === 'changed' ? ' filter-changed' : '');
        const active = previewFilter === item.key ? ' active' : '';
        return `<button type="button" class="preview-filter${extraClass}${active}" data-filter="${item.key}">${item.label}</button>`;
    }).join('');
    filtersEl.querySelectorAll('.preview-filter').forEach((btn) => {
        btn.addEventListener('click', () => {
            previewFilter = btn.getAttribute('data-filter');
            filtersEl.querySelectorAll('.preview-filter').forEach((el) => el.classList.remove('active'));
            btn.classList.add('active');
            renderPreviewRows();
        });
    });

    renderPreviewRows();
    const previewSection = document.getElementById('previewSection');
    previewSection.style.display = 'block';
    previewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function rowHasChanges(row) {
    return Array.isArray(row.changes) && row.changes.length > 0;
}

function formatChangeTip(changes) {
    return (changes || []).map((item) => `${item.label}: ${item.before} → ${item.after}`).join('\n');
}

function renderPreviewRows() {
    const body = document.getElementById('previewTableBody');
    const visible = previewFilter === 'all'
        ? previewRows
        : previewFilter === 'changed'
            ? previewRows.filter(rowHasChanges)
            : previewRows.filter((row) => row.status === previewFilter);

    if (!visible.length) {
        body.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#888; padding: 24px;">해당 항목이 없습니다.</td></tr>`;
        return;
    }

    body.innerHTML = visible.map((row) => {
        const match = row.match || {};
        const name = row.name_kor || row.name_eng || '';
        const nameTip = [row.name_kor, row.name_eng].filter(Boolean).join(' / ');
        const matchLine = row.match
            ? [match.name, match.email, match.affiliation].filter(Boolean).join(' · ')
            : '';
        const changeTip = formatChangeTip(row.changes);
        const noteTip = [row.note, changeTip].filter(Boolean).join('\n');
        const registration = row.registration || getDefaultRegistration();
        const rowTip = [
            nameTip,
            row.email,
            row.affiliation,
            row.status_label,
            `등록구분 ${registration}`,
            matchLine,
            noteTip,
        ].filter(Boolean).join('\n');
        const changed = rowHasChanges(row);
        const badgeHtml = `<span class="match-badge ${row.status}">${escapeHtml(row.status_label)}</span>` +
            (changed ? ` <span class="match-badge changed">변경</span>` : '');

        return `
            <tr class="row-${row.status}${changed ? ' row-changed' : ''}" title="${escapeHtml(rowTip)}">
                <td>${row.row}</td>
                <td title="${escapeHtml(nameTip)}">${escapeHtml(name)}</td>
                <td title="${escapeHtml(row.email)}">${escapeHtml(row.email)}</td>
                <td title="${escapeHtml(row.affiliation)}">${escapeHtml(row.affiliation)}</td>
                <td title="${escapeHtml(changed ? row.status_label + ' · 변경' : row.status_label)}">${badgeHtml}</td>
                <td title="${escapeHtml(registration)}">${escapeHtml(registration)}</td>
                <td title="${escapeHtml(matchLine)}">${escapeHtml(matchLine || '-')}</td>
                <td title="${escapeHtml(noteTip)}">${escapeHtml(row.note)}</td>
            </tr>
        `;
    }).join('');
}

function getDefaultRegistration() {
    const selected = document.querySelector('input[name="default_registration"]:checked');
    return (selected && selected.value) || '미등록';
}

function appendUploadFormData() {
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('default_registration', getDefaultRegistration());
    return formData;
}

async function previewUpload() {
    if (!selectedFile) {
        alert('파일을 선택해주세요.');
        return;
    }

    const uploadBtn = document.getElementById('uploadBtn');
    const originalBtnText = uploadBtn.innerHTML;
    uploadBtn.disabled = true;
    uploadBtn.textContent = '확인 중...';

    const formData = appendUploadFormData();

    try {
        const response = await fetch(`/upload_participants/${eventId}/preview`, {
            method: 'POST',
            body: formData
        });
        const data = await parseJsonResponse(response);
        if (!response.ok || !data.success) {
            throw new Error(data.error || data.message || '명단 확인 실패');
        }

        const errorSection = document.getElementById('errorSection');
        if (errorSection) errorSection.style.display = 'none';
        renderPreview(data.summary || {}, data.rows || []);
        uploadBtn.disabled = false;
        uploadBtn.textContent = originalBtnText;
    } catch (error) {
        showError(`명단 확인 중 오류가 발생했습니다: ${error.message}`);
        uploadBtn.disabled = false;
        uploadBtn.textContent = originalBtnText;
    }
}

async function confirmUpload() {
    await uploadFile();
}

async function uploadFile() {
    if (!selectedFile) {
        alert('파일을 선택해주세요.');
        return;
    }

    const confirmBtn = document.getElementById('confirmUploadBtn');
    const uploadBtn = document.getElementById('uploadBtn');
    const originalConfirm = confirmBtn ? confirmBtn.innerHTML : '';
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.textContent = '등록 중...';
    }
    if (uploadBtn) uploadBtn.disabled = true;

    const formData = appendUploadFormData();

    try {
        const response = await fetch(`/upload_participants/${eventId}`, {
            method: 'POST',
            body: formData
        });
        const responseData = await parseJsonResponse(response);

        if (response.ok && responseData.success) {
            const resultSection = document.getElementById('resultSection');
            const resultStats = document.getElementById('resultStats');
            const errorSection = document.getElementById('errorSection');
            const previewSection = document.getElementById('previewSection');

            if (errorSection) errorSection.style.display = 'none';
            if (previewSection) previewSection.style.display = 'none';
            if (resultSection) {
                resultSection.style.display = 'block';
                if (resultStats) {
                    resultStats.innerHTML =
                        `<p>추가: ${responseData.added || 0}명</p>` +
                        `<p>업데이트: ${responseData.updated || 0}명</p>` +
                        (responseData.enriched ? `<p>기존 명단에서 프로필 보완: ${responseData.enriched}명</p>` : '');
                }
            }

            document.querySelectorAll('.upload-section').forEach((section) => {
                section.style.display = 'none';
            });

            if (window.opener && !window.opener.closed) {
                try { window.opener.location.reload(); } catch (e) {}
            }

            setTimeout(() => window.close(), 2500);
        } else {
            throw new Error(responseData.error || responseData.message || '업로드 실패');
        }
    } catch (error) {
        showError(`업로드 중 오류가 발생했습니다: ${error.message}`);
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = originalConfirm || '이대로 등록';
        }
        if (uploadBtn) uploadBtn.disabled = false;
    }
}
