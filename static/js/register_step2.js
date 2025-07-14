// register_step2.html 전용 스크립트

document.addEventListener('DOMContentLoaded', function() {
    // 폼 제출 처리
    const form = document.querySelector('form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const termsService = document.getElementById('terms_service');
            const termsPrivacy = document.getElementById('terms_privacy');
            
            // 약관 동의 확인
            if (!termsService.checked) {
                alert('서비스 약관에 동의해주세요.');
                termsService.focus();
                return;
            }
            
            if (!termsPrivacy.checked) {
                alert('개인정보취급위탁에 동의해주세요.');
                termsPrivacy.focus();
                return;
            }
            
            // 폼 제출
            form.submit();
        });
    }
    
    // 체크박스 스타일 효과
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const label = this.closest('.checkbox-label');
            if (this.checked) {
                label.style.color = '#3d4799';
                label.style.fontWeight = '700';
            } else {
                label.style.color = '#666';
                label.style.fontWeight = '500';
            }
        });
    });
    
    // 약관 내용 토글 (선택사항)
    const termsHeaders = document.querySelectorAll('.terms-header');
    termsHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const content = this.nextElementSibling;
            if (content.style.display === 'none') {
                content.style.display = 'block';
            } else {
                content.style.display = 'none';
            }
        });
    });
}); 