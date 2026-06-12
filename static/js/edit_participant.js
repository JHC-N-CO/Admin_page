async function submitForm(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const response = await fetch(event.target.action, {
        method: "POST",
        body: formData
    });
    const result = await response.json();
    if (result.status === "success") {
        alert("Participant updated successfully!");
        window.opener.location.reload();
        window.close();
    } else {
        alert(result.message);
    }
}

async function deleteFile(field, participantId) {
    try {
        const response = await fetch(`/delete_file_field/${participantId}/${field}`, {
            method: 'POST',
        });
        const result = await response.json();
        if (result.status === "success") {
            alert("File deleted successfully!");
            // 필드의 표시를 업데이트하기 위해 페이지 새로고침
            location.reload();
        } else {
            alert("Error deleting file: " + result.message);
        }
    } catch (error) {
        console.error("Error during file deletion:", error);
        alert("An error occurred while deleting the file.");
    }
}

function getSelectedBadgeLang() {
    const selected = document.querySelector('input[name="badge_lang"]:checked');
    return selected ? selected.value : 'kor';
}

function getBadgeName(lang) {
    if (lang === 'eng') {
        const first = (document.getElementById('first_name')?.value || '').trim();
        const family = (document.getElementById('family_name')?.value || '').trim();
        if (first && family) return `${first} ${family}`;
        if (first) return first;
        if (family) return family;
        const readonlyEng = document.querySelector('.readonly-field');
        return readonlyEng ? readonlyEng.textContent.trim().replace(/\(.*\)/, '').trim() : '';
    }
    return (document.getElementById('name_kor')?.value || '').trim();
}

const BADGE_DEFAULTS = {
    nameSize: 48,
    affiliationSize: 24,
    blockOffsetY: 12,
    nameAffiliationGap: 6,
    nameOffsetY: 0,
    affiliationOffsetY: 0,
};

function clampBadgeNumber(value, min, max, fallback) {
    const n = parseInt(value, 10);
    if (Number.isNaN(n)) return fallback;
    return Math.min(max, Math.max(min, n));
}

function getBadgeLayout() {
    return {
        nameSize: clampBadgeNumber(document.getElementById('badge_name_size')?.value, 20, 72, BADGE_DEFAULTS.nameSize),
        affiliationSize: clampBadgeNumber(document.getElementById('badge_affiliation_size')?.value, 12, 48, BADGE_DEFAULTS.affiliationSize),
        blockOffsetY: clampBadgeNumber(document.getElementById('badge_block_offset_y')?.value, -20, 40, BADGE_DEFAULTS.blockOffsetY),
        nameAffiliationGap: clampBadgeNumber(document.getElementById('badge_name_affiliation_gap')?.value, 0, 30, BADGE_DEFAULTS.nameAffiliationGap),
        nameOffsetY: clampBadgeNumber(document.getElementById('badge_name_offset_y')?.value, -20, 20, BADGE_DEFAULTS.nameOffsetY),
        affiliationOffsetY: clampBadgeNumber(document.getElementById('badge_affiliation_offset_y')?.value, -20, 20, BADGE_DEFAULTS.affiliationOffsetY),
    };
}

function applyBadgeLayout(area) {
    if (!area) return;
    const layout = getBadgeLayout();
    area.style.setProperty('--badge-name-size', `${layout.nameSize}pt`);
    area.style.setProperty('--badge-affiliation-size', `${layout.affiliationSize}pt`);
    area.style.setProperty('--badge-block-offset-y', `${layout.blockOffsetY}mm`);
    area.style.setProperty('--badge-name-affiliation-gap', `${layout.nameAffiliationGap}mm`);
    area.style.setProperty('--badge-name-offset-y', `${layout.nameOffsetY}mm`);
    area.style.setProperty('--badge-affiliation-offset-y', `${layout.affiliationOffsetY}mm`);
}

function getBadgeAffiliation(lang) {
    if (lang === 'eng') {
        return (document.getElementById('affiliation_eng')?.value || '').trim();
    }
    return (document.getElementById('affiliation_kor')?.value || '').trim();
}

function updateBadgePreview() {
    const lang = getSelectedBadgeLang();
    const name = getBadgeName(lang);
    const affiliation = getBadgeAffiliation(lang);

    const previewArea = document.getElementById('badgePreviewArea');
    const previewName = document.getElementById('badgePreviewName');
    const previewAffiliation = document.getElementById('badgePreviewAffiliation');

    if (previewArea) {
        previewArea.classList.remove('lang-kor', 'lang-eng');
        previewArea.classList.add(lang === 'eng' ? 'lang-eng' : 'lang-kor');
        applyBadgeLayout(previewArea);
    }
    if (previewName) previewName.textContent = name || '(이름 없음)';
    if (previewAffiliation) previewAffiliation.textContent = affiliation || '(소속 없음)';
}

function printNameBadge() {
    const lang = getSelectedBadgeLang();
    const name = getBadgeName(lang);
    const affiliation = getBadgeAffiliation(lang);

    if (!name) {
        alert(lang === 'eng' ? '영문 이름을 입력해주세요.' : '한글 이름을 입력해주세요.');
        return;
    }

    const printSheet = document.getElementById('badgePrintSheet');
    const printArea = printSheet?.querySelector('.badge-print-area');
    const printName = document.getElementById('badgePrintName');
    const printAffiliation = document.getElementById('badgePrintAffiliation');

    if (!printSheet || !printArea || !printName || !printAffiliation) {
        alert('인쇄 영역을 찾을 수 없습니다.');
        return;
    }

    printArea.classList.remove('lang-kor', 'lang-eng');
    printArea.classList.add(lang === 'eng' ? 'lang-eng' : 'lang-kor');
    applyBadgeLayout(printArea);
    printName.textContent = name;
    printAffiliation.textContent = affiliation;

    window.print();
}

function initBadgePrint() {
    const langInputs = document.querySelectorAll('input[name="badge_lang"]');
    langInputs.forEach(input => input.addEventListener('change', updateBadgePreview));

    const watchIds = [
        'name_kor', 'first_name', 'family_name',
        'affiliation_kor', 'affiliation_eng'
    ];
    watchIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', updateBadgePreview);
    });

    [
        'badge_name_size', 'badge_affiliation_size',
        'badge_block_offset_y', 'badge_name_affiliation_gap',
        'badge_name_offset_y', 'badge_affiliation_offset_y',
    ].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', updateBadgePreview);
    });

    updateBadgePreview();
}

document.addEventListener("DOMContentLoaded", function () {
    initBadgePrint();

    const textareas = document.querySelectorAll(".auto-resize");
    textareas.forEach(textarea => {
        // 초기 높이 설정
        textarea.style.height = "auto";
        textarea.style.height = `${textarea.scrollHeight}px`;

        // 입력 시 높이 조절
        textarea.addEventListener("input", function () {
            this.style.height = "auto"; // 높이를 먼저 초기화
            this.style.height = `${this.scrollHeight}px`; // 내용에 맞게 높이 설정
        });
    });
});

// --- Extracted from edit_participant.html inline <script> ---
document.querySelector('form').addEventListener('submit', function(e) {
    e.preventDefault();
    const form = this;
    const formData = new FormData(form);

    fetch(form.action, {
        method: 'POST',
        body: formData
    }).then(response => {
        if (response.redirected || response.ok) {
            window.close();
            if (window.opener) {
                window.opener.location.reload();
            }
        } else {
            alert('업데이트에 실패했습니다.');
        }
    }).catch(() => {
        alert('업데이트 중 오류가 발생했습니다.');
    });
});
