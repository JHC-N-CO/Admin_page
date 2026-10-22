let quill;

window.onload = function () {
    window.resizeTo(800, 700);

    quill = new Quill('#editor', {
        theme: 'snow',
        placeholder: '이메일 내용을 작성하세요...',
        modules: {
            toolbar: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'align': [] }],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                ['link', 'image'],
                ['clean']
            ]
        }
    });

    // 툴바의 이미지 버튼 클릭 시 파일 선택 다이얼로그
    quill.getModule('toolbar').addHandler('image', function () {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();
        input.onchange = async function () {
            const file = input.files[0];
            if (file) await uploadAndInsertImage(file);
        };
    });

    // 클립보드 이미지 붙여넣기 → 서버 업로드
    quill.root.addEventListener('paste', function (e) {
        const clipboardData = e.clipboardData || window.clipboardData;
        if (!clipboardData || !clipboardData.items) return;

        for (const item of clipboardData.items) {
            if (item.type.indexOf('image') !== -1) {
                e.preventDefault();
                e.stopPropagation();
                const file = item.getAsFile();
                if (file) uploadAndInsertImage(file);
                return;
            }
        }
    });
};

async function uploadAndInsertImage(file) {
    const formData = new FormData();
    formData.append('image', file);

    try {
        const response = await fetch('/upload_image', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        if (result.status === 'success') {
            const range = quill.getSelection(true);
            quill.insertEmbed(range.index, 'image', result.image_url);
            quill.setSelection(range.index + 1);
        } else {
            alert(result.message);
        }
    } catch (error) {
        alert('이미지 업로드 중 오류가 발생했습니다.');
    }
}

function toggleComposeSchedule() {
    const toggle = document.getElementById('scheduleEmailToggle');
    const input = document.getElementById('emailScheduledAt');
    const btn = document.getElementById('composeSendBtn');
    const enabled = !!(toggle && toggle.checked);
    if (input) {
        input.style.display = enabled ? 'block' : 'none';
        if (enabled && !input.value) {
            const soon = new Date(Date.now() + 60 * 60 * 1000);
            soon.setMinutes(soon.getMinutes() - soon.getTimezoneOffset());
            input.value = soon.toISOString().slice(0, 16);
        }
    }
    if (btn) btn.textContent = enabled ? '예약하기' : '이메일 발송';
}

async function sendEmail(event) {
    event.preventDefault();
    const form = event.target;
    const bodyInput = document.getElementById('body');
    const loadingDiv = document.getElementById('loading');
    const loadingIcon = document.getElementById('loading-icon');
    const loadingText = document.getElementById('loading-text');
    const submitButton = form.querySelector('button[type="submit"]');
    const scheduleToggle = document.getElementById('scheduleEmailToggle');
    const scheduleInput = document.getElementById('emailScheduledAt');
    const scheduledHidden = document.getElementById('scheduled_at');
    const isScheduled = !!(scheduleToggle && scheduleToggle.checked);

    bodyInput.value = quill.root.innerHTML;
    if (scheduledHidden) {
        scheduledHidden.value = '';
        if (isScheduled) {
            const scheduledAt = scheduleInput ? scheduleInput.value.trim() : '';
            if (!scheduledAt) {
                alert('예약 시각을 선택해주세요.');
                return;
            }
            if (new Date(scheduledAt).getTime() <= Date.now()) {
                alert('예약 시각은 현재보다 이후여야 합니다.');
                return;
            }
            scheduledHidden.value = scheduledAt;
        }
    }

    loadingDiv.style.display = 'block';
    loadingIcon.className = 'spinner';
    loadingText.textContent = isScheduled ? '예약 등록 중...' : '이메일 발송 중...';
    submitButton.disabled = true;

    const formData = new FormData(form);
    try {
        const response = await fetch(form.action, {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        if (result.status === "success") {
            loadingIcon.className = 'success-icon';
            loadingText.textContent = result.scheduled ? '예약 등록 완료!' : '이메일 발송 완료!';
            loadingDiv.classList.add('success');
            setTimeout(() => {
                alert(result.scheduled
                    ? (result.message || '예약 발송이 등록되었습니다!')
                    : '이메일이 성공적으로 발송되었습니다!');
                window.close();
            }, 500);
        } else {
            loadingDiv.style.display = 'none';
            alert(result.message);
            submitButton.disabled = false;
        }
    } catch (error) {
        loadingDiv.style.display = 'none';
        alert("이메일 발송 중 오류가 발생했습니다.");
        submitButton.disabled = false;
    }
}
