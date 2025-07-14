// --- Extracted from accept_response.html inline <script> ---
document.addEventListener('DOMContentLoaded', function() {
    const declineForm = document.getElementById('decline-form');
    if (declineForm) {
        declineForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(declineForm);
            
            fetch('/accept_response', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    document.getElementById('response-form').classList.add('hidden');
                    document.getElementById('success-message').classList.remove('hidden');
                    
                    // 부모 창이 있다면 새로고침
                    if (window.opener && !window.opener.closed) {
                        window.opener.location.reload();
                    }
                } else {
                    alert('처리 중 오류가 발생했습니다.');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('처리 중 오류가 발생했습니다.');
            });
        });
    }
}); 