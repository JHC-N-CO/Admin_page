// --- Extracted from upload.html inline <script> ---
async function uploadFile(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    
    // 업로드 버튼 비활성화
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = '업로드 중...';
    
    try {
        const response = await fetch(form.action, {
            method: "POST",
            body: formData
        });
        
        if (response.redirected) {
            // 성공적으로 리다이렉트된 경우
            if (window.opener) window.opener.location.reload();
            window.close();
        } else if (response.ok) {
            // 성공 응답
            const result = await response.text();
            alert(result);
            if (window.opener) window.opener.location.reload();
            window.close();
        } else {
            // 에러 응답
            const errorText = await response.text();
            alert(`업로드 실패: ${errorText}`);
        }
    } catch (e) {
        console.error('Upload error:', e);
        alert(`업로드 중 오류가 발생했습니다: ${e.message}`);
    } finally {
        // 버튼 상태 복원
        submitButton.disabled = false;
        submitButton.textContent = originalText;
    }
}
