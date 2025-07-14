// register_step1.html 전용 스크립트

document.addEventListener('DOMContentLoaded', function() {
    // 폼 제출 처리
    const form = document.querySelector('form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const nameKor = document.getElementById('name_kor').value.trim();
            const email = document.getElementById('email').value.trim();
            
            // 유효성 검사
            if (!nameKor) {
                alert('이름을 입력해주세요.');
                document.getElementById('name_kor').focus();
                return;
            }
            
            if (!email) {
                alert('이메일을 입력해주세요.');
                document.getElementById('email').focus();
                return;
            }
            
            // 이메일 형식 검사
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                alert('올바른 이메일 형식을 입력해주세요.');
                document.getElementById('email').focus();
                return;
            }
            
            // 폼 제출
            form.submit();
        });
    }
    
    // 입력 필드 포커스 효과
    const inputs = document.querySelectorAll('input[type="text"], input[type="email"]');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.style.transform = 'translateY(-2px)';
        });
        
        input.addEventListener('blur', function() {
            this.parentElement.style.transform = 'translateY(0)';
        });
    });
}); 