// --- Extracted from register_step3.html inline <script> ---

// Flatpickr 날짜 선택기 초기화
document.addEventListener('DOMContentLoaded', function() {
    // 생년월일 날짜 선택기
    flatpickr("#birth_date", {
        locale: "ko",
        dateFormat: "Y/m/d",
        allowInput: true,
        placeholder: "YYYY/MM/DD",
        yearDropdown: true,
        monthDropdown: true,
        dayDropdown: true,
        disableMobile: true,
        theme: "light"
    });
});

// 프로필 사진 미리보기
document.getElementById('profile_photo').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        if (file.size > 5 * 1024 * 1024) { // 5MB 제한
            alert('파일 크기는 5MB 이하여야 합니다.');
            this.value = '';
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('photoPreview').src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
});

// 비밀번호 확인
document.getElementById('password_confirm').addEventListener('input', function() {
    const password = document.getElementById('password').value;
    const confirm = this.value;
    
    if (password && confirm && password !== confirm) {
        this.setCustomValidity('비밀번호가 일치하지 않습니다.');
    } else {
        this.setCustomValidity('');
    }
});

// 폼 제출 전 검증
document.querySelector('form').addEventListener('submit', function(e) {
    const password = document.getElementById('password').value;
    const confirm = document.getElementById('password_confirm').value;
    
    if (password && confirm && password !== confirm) {
        e.preventDefault();
        alert('비밀번호가 일치하지 않습니다.');
        return false;
    }
    
    // 비밀번호가 입력되었지만 확인이 비어있는 경우
    if (password && !confirm) {
        e.preventDefault();
        alert('비밀번호 확인을 입력해주세요.');
        return false;
    }
    
    // 비밀번호 확인이 입력되었지만 비밀번호가 비어있는 경우
    if (!password && confirm) {
        e.preventDefault();
        alert('비밀번호를 입력해주세요.');
        return false;
    }
}); 

// 사이드바 토글 기능
const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
const sidebar = document.getElementById('sidebar');
if (sidebarToggleBtn && sidebar) {
    sidebarToggleBtn.addEventListener('click', function() {
        sidebar.classList.toggle('collapsed');
    });
} 