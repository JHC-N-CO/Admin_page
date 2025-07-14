async function sendEmail(event) {
    event.preventDefault();
    const form = event.target;
    const editor = document.getElementById('editor');
    const bodyInput = document.getElementById('body');
    const loadingDiv = document.getElementById('loading');
    const loadingIcon = document.getElementById('loading-icon');
    const loadingText = document.getElementById('loading-text');
    const submitButton = form.querySelector('button[type="submit"]');

    bodyInput.value = editor.innerHTML;

    // 로딩 상태 표시
    loadingDiv.style.display = 'block';
    loadingIcon.className = 'spinner'; // 클래스 재설정
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
            loadingIcon.className = 'success-icon'; // 성공 시 체크마크로 변경
            loadingText.textContent = '이메일 발송 완료!';
            loadingDiv.classList.add('success');
            setTimeout(() => {
                alert("Email sent successfully!");
                window.close();
            }, 500);
        } else {
            loadingDiv.style.display = 'none';
            alert(result.message);
            submitButton.disabled = false;
        }
    } catch (error) {
        loadingDiv.style.display = 'none';
        alert("An error occurred while sending the email.");
        submitButton.disabled = false;
    }
}

window.onload = function () {
    window.resizeTo(800, 700); // Set window size to be large enough for the content

    const editor = document.getElementById('editor');

    // 붙여넣기 이벤트 처리
    editor.addEventListener('paste', async (event) => {
        event.preventDefault();
        const items = (event.clipboardData || window.clipboardData).items;

        for (const item of items) {
            if (item.type.indexOf('image') !== -1) {
                const file = item.getAsFile();
                const formData = new FormData();
                formData.append('image', file);

                const response = await fetch('/upload_image', {
                    method: 'POST',
                    body: formData
                });
                const result = await response.json();

                if (result.status === 'success') {
                    const img = document.createElement('img');
                    img.src = result.image_url;
                    editor.appendChild(img);
                } else {
                    alert(result.message);
                }
            } else if (item.type === 'text/plain') {
                item.getAsString((text) => {
                    const textNode = document.createTextNode(text);
                    editor.appendChild(textNode);
                });
            }
        }
    });

    // 텍스트 입력 시 줄바꿈 처리
    editor.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            const br = document.createElement('br');
            editor.appendChild(br);
            // 커서를 줄바꿈 후로 이동
            const range = document.createRange();
            const sel = window.getSelection();
            range.setStartAfter(br);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
        }
    });
};
