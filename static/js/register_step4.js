// register_step4.html 전용 스크립트

document.addEventListener('DOMContentLoaded', function() {
    // 페이지 로드 시 애니메이션 효과
    animateCompletionPage();
    
    // 버튼 호버 효과
    setupButtonEffects();
});

function animateCompletionPage() {
    const completionContent = document.querySelector('.completion-content');
    const navigationButtons = document.querySelector('.navigation-buttons');
    
    if (completionContent) {
        completionContent.style.opacity = '0';
        completionContent.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            completionContent.style.transition = 'all 0.6s ease';
            completionContent.style.opacity = '1';
            completionContent.style.transform = 'translateY(0)';
        }, 200);
    }
    
    if (navigationButtons) {
        navigationButtons.style.opacity = '0';
        navigationButtons.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            navigationButtons.style.transition = 'all 0.6s ease';
            navigationButtons.style.opacity = '1';
            navigationButtons.style.transform = 'translateY(0)';
        }, 600);
    }
}

function setupButtonEffects() {
    const buttons = document.querySelectorAll('.btn');
    
    buttons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px) scale(1.02)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
        
        button.addEventListener('click', function() {
            // 클릭 시 리플 효과
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = event.clientX - rect.left - size / 2;
            const y = event.clientY - rect.top - size / 2;
            
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.classList.add('ripple');
            
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
}

// 페이지 새로고침 방지
window.addEventListener('beforeunload', function(e) {
    e.preventDefault();
    e.returnValue = '';
});

// 5초 후 자동으로 로그인 페이지로 이동 (선택사항)
setTimeout(() => {
    const autoRedirect = confirm('5초 후 로그인 페이지로 이동하시겠습니까?');
    if (autoRedirect) {
        window.location.href = '/login';
    }
}, 5000); 