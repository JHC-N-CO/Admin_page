// --- Extracted from upload.html inline <script> ---
async function uploadFile(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    try {
        const response = await fetch(form.action, {
        method: "POST",
        body: formData
    });
        if (response.redirected || response.ok) {
            if (window.opener) window.opener.location.reload();
            window.close();
    } else {
            alert('업로드에 실패했습니다.');
        }
    } catch (e) {
        alert('업로드 중 오류가 발생했습니다.');
    }
}
