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

async function sendEmail(event) {
    event.preventDefault();
    const form = event.target;
    const bodyInput = document.getElementById('body');
    const loadingDiv = document.getElementById('loading');
    const loadingIcon = document.getElementById('loading-icon');
    const loadingText = document.getElementById('loading-text');
    const submitButton = form.querySelector('button[type="submit"]');

    bodyInput.value = quill.root.innerHTML;

    loadingDiv.style.display = 'block';
    loadingIcon.className = 'spinner';
    loadingText.textContent = '이메일 발송 중...';
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
            loadingText.textContent = '이메일 발송 완료!';
            loadingDiv.classList.add('success');
            setTimeout(() => {
                alert("이메일이 성공적으로 발송되었습니다!");
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
