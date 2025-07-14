// register_step3.html 전용 스크립트

document.addEventListener('DOMContentLoaded', function() {
    // 프로필 사진 미리보기 설정
    setupProfilePhotoPreview();
    
    // 비밀번호 확인 실시간 체크
    setupPasswordConfirmation();
    
    // 폼 제출 처리
    setupFormSubmission();
    
    // 중복확인 버튼 이벤트
    setupDuplicateChecks();

    // 생년월일 flatpickr 적용
    setupBirthDatePicker();
});

function setupProfilePhotoPreview() {
    const fileInput = document.getElementById('profile_photo');
    const preview = document.getElementById('photoPreview');
    const placeholder = '/static/images/profile_placeholder.jpeg';

    if (fileInput && preview) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        preview.src = e.target.result;
                        preview.style.display = 'block';
                    };
                    reader.readAsDataURL(file);
                } else {
                    alert('이미지 파일만 업로드 가능합니다.');
                    fileInput.value = '';
                    preview.src = placeholder;
                }
            } else {
                // 업로드 취소 시 placeholder로 복원
                preview.src = placeholder;
            }
        });
    }
}

function setupPasswordConfirmation() {
    const passwordInput = document.getElementById('password');
    const confirmInput = document.getElementById('password_confirm');
    
    if (confirmInput) {
        confirmInput.addEventListener('input', function() {
            const password = passwordInput ? passwordInput.value : '';
            const confirm = this.value;
            
            if (password !== confirm) {
                this.style.borderColor = '#e74c3c';
                this.style.backgroundColor = '#fff5f5';
            } else {
                this.style.borderColor = '#27ae60';
                this.style.backgroundColor = '#f8fff8';
            }
        });
    }
}

function setupFormSubmission() {
    const form = document.querySelector('form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // 필수 필드 검증
            if (!validateRequiredFields()) {
                return;
            }
            
            // 비밀번호 확인
            if (!validatePassword()) {
                return;
            }
            
            // 폼 제출
            form.submit();
        });
    }
}

function validateRequiredFields() {
    const requiredFields = [
        { id: 'username', name: '아이디' },
        { id: 'password', name: '비밀번호' },
        { id: 'password_confirm', name: '비밀번호 확인' },
        { id: 'license_number', name: '의사면허번호' }
    ];
    
    for (const field of requiredFields) {
        const element = document.getElementById(field.id);
        if (element && !element.value.trim()) {
            alert(`${field.name}을(를) 입력해주세요.`);
            element.focus();
            return false;
        }
    }
    
    return true;
}

function validatePassword() {
    const password = document.getElementById('password');
    const confirm = document.getElementById('password_confirm');
    
    if (password && confirm && password.value !== confirm.value) {
        alert('비밀번호가 일치하지 않습니다.');
        confirm.focus();
        return false;
    }
    
    return true;
}

function setupDuplicateChecks() {
    // 아이디 중복확인
    const usernameCheckBtn = document.getElementById('username-check-btn');
    if (usernameCheckBtn) {
        usernameCheckBtn.addEventListener('click', function() {
            const username = document.getElementById('username').value.trim();
            if (!username) {
                alert('아이디를 먼저 입력해주세요.');
                document.getElementById('username').focus();
                return;
            }
            
            // 아이디 형식 검사 (4~20자 영문소문자, 숫자)
            const usernameRegex = /^[a-z0-9]{4,20}$/;
            if (!usernameRegex.test(username)) {
                alert('아이디는 4~20자의 영문소문자와 숫자만 사용 가능합니다.');
                document.getElementById('username').focus();
                return;
            }
            
            // 중복확인 API 호출
            checkUsernameDuplicate(username);
        });
    }
    
    // 의사면허번호 중복확인
    const licenseCheckBtn = document.getElementById('license-check-btn');
    if (licenseCheckBtn) {
        licenseCheckBtn.addEventListener('click', function() {
            const license = document.getElementById('license_number').value.trim();
            if (!license) {
                alert('의사면허번호를 먼저 입력해주세요.');
                document.getElementById('license_number').focus();
                return;
            }
            
            // 중복확인 API 호출
            checkLicenseDuplicate(license);
        });
    }
}

function checkUsernameDuplicate(username) {
    // 버튼 상태 변경
    const btn = document.getElementById('username-check-btn');
    const originalText = btn.textContent;
    btn.textContent = '확인중...';
    btn.disabled = true;
    
    // AJAX 요청
    fetch('/api/check-username', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: username })
    })
    .then(response => response.json())
    .then(data => {
        if (data.available) {
            alert('사용 가능한 아이디입니다.');
            document.getElementById('username').style.borderColor = '#27ae60';
            document.getElementById('username').style.backgroundColor = '#f8fff8';
            btn.textContent = '확인완료';
            btn.style.backgroundColor = '#27ae60';
            btn.style.color = '#fff';
        } else {
            alert('이미 사용 중인 아이디입니다.');
            document.getElementById('username').style.borderColor = '#e74c3c';
            document.getElementById('username').style.backgroundColor = '#fff5f5';
            btn.textContent = originalText;
            btn.disabled = false;
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('중복확인 중 오류가 발생했습니다.');
        btn.textContent = originalText;
        btn.disabled = false;
    });
}

function checkLicenseDuplicate(license) {
    // 버튼 상태 변경
    const btn = document.getElementById('license-check-btn');
    const originalText = btn.textContent;
    btn.textContent = '확인중...';
    btn.disabled = true;
    
    // AJAX 요청
    fetch('/api/check-license', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ license_number: license })
    })
    .then(response => response.json())
    .then(data => {
        if (data.available) {
            alert('사용 가능한 의사면허번호입니다.');
            document.getElementById('license_number').style.borderColor = '#27ae60';
            document.getElementById('license_number').style.backgroundColor = '#f8fff8';
            btn.textContent = '확인완료';
            btn.style.backgroundColor = '#27ae60';
            btn.style.color = '#fff';
        } else {
            alert('이미 등록된 의사면허번호입니다.');
            document.getElementById('license_number').style.borderColor = '#e74c3c';
            document.getElementById('license_number').style.backgroundColor = '#fff5f5';
            btn.textContent = originalText;
            btn.disabled = false;
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('중복확인 중 오류가 발생했습니다.');
        btn.textContent = originalText;
        btn.disabled = false;
    });
}

// 생년월일 flatpickr 적용
function setupBirthDatePicker() {
    if (typeof flatpickr === 'undefined') return;
    flatpickr('#birth_date', {
        dateFormat: 'Y/m/d',
        locale: 'ko',
        maxDate: 'today',
        allowInput: true,
        altInput: false,
        disableMobile: true,
    });
}

// 전화번호 자동 포커스 이동
document.addEventListener('input', function(e) {
    if (e.target.name && e.target.name.includes('phone') || e.target.name.includes('mobile')) {
        const maxLength = e.target.maxLength;
        if (e.target.value.length === maxLength) {
            const nextInput = e.target.nextElementSibling;
            if (nextInput && nextInput.tagName === 'INPUT') {
                nextInput.focus();
            }
        }
    }
}); 