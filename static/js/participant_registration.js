// 참가자 등록 페이지 JavaScript

document.addEventListener('DOMContentLoaded', function() {
    console.log('참가자 등록 페이지 로드됨');
    
    // 폼 요소들
    const form = document.getElementById('registrationForm');
    const specialtySelect = document.getElementById('specialty');
    const specialtyOtherInput = document.getElementById('specialty_other');
    const registrationFeeSelect = document.getElementById('registration_fee');
    
    // 진료과목 선택 이벤트
    specialtySelect.addEventListener('change', function() {
        if (this.value === '기타') {
            specialtyOtherInput.style.display = 'block';
            specialtyOtherInput.required = true;
        } else {
            specialtyOtherInput.style.display = 'none';
            specialtyOtherInput.required = false;
            specialtyOtherInput.value = '';
        }
    });
    
    // 등록비 자동 계산
    registrationFeeSelect.addEventListener('change', function() {
        updateRegistrationFee();
    });
    
    // 전화번호 포맷팅
    const phoneInput = document.getElementById('phone');
    phoneInput.addEventListener('input', function() {
        formatPhoneNumber(this);
    });
    
    // 이메일 유효성 검사
    const emailInput = document.getElementById('email');
    emailInput.addEventListener('blur', function() {
        validateEmail(this);
    });
    
    // 면허번호 유효성 검사
    const licenseInput = document.getElementById('license_number');
    licenseInput.addEventListener('blur', function() {
        validateLicenseNumber(this);
    });
    
    // 폼 제출 이벤트
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        submitRegistration();
    });
    
    // 실시간 유효성 검사
    const requiredFields = form.querySelectorAll('[required]');
    requiredFields.forEach(field => {
        field.addEventListener('blur', function() {
            validateField(this);
        });
    });
});

// 전화번호 포맷팅
function formatPhoneNumber(input) {
    let value = input.value.replace(/\D/g, '');
    
    if (value.length >= 11) {
        value = value.substring(0, 11);
        value = value.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
    } else if (value.length >= 7) {
        value = value.replace(/(\d{3})(\d{4})(\d{0,4})/, '$1-$2-$3');
    } else if (value.length >= 3) {
        value = value.replace(/(\d{3})(\d{0,4})/, '$1-$2');
    }
    
    input.value = value;
}

// 이메일 유효성 검사
function validateEmail(input) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(input.value);
    
    if (input.value && !isValid) {
        showError(input, '올바른 이메일 형식을 입력해주세요.');
        return false;
    } else {
        clearError(input);
        return true;
    }
}

// 면허번호 유효성 검사
function validateLicenseNumber(input) {
    const licenseRegex = /^\d{6}$/;
    const isValid = licenseRegex.test(input.value);
    
    if (input.value && !isValid) {
        showError(input, '면허번호는 6자리 숫자로 입력해주세요.');
        return false;
    } else {
        clearError(input);
        return true;
    }
}

// 필드 유효성 검사
function validateField(field) {
    if (field.hasAttribute('required') && !field.value.trim()) {
        showError(field, '필수 입력 항목입니다.');
        return false;
    }
    
    // 특별한 유효성 검사
    if (field.type === 'email') {
        return validateEmail(field);
    }
    
    if (field.name === 'license_number') {
        return validateLicenseNumber(field);
    }
    
    clearError(field);
    return true;
}

// 오류 표시
function showError(field, message) {
    field.classList.add('error');
    
    // 기존 오류 메시지 제거
    const existingError = field.parentNode.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // 새 오류 메시지 추가
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    field.parentNode.appendChild(errorDiv);
}

// 오류 제거
function clearError(field) {
    field.classList.remove('error');
    const errorMessage = field.parentNode.querySelector('.error-message');
    if (errorMessage) {
        errorMessage.remove();
    }
}

// 등록비 업데이트
function updateRegistrationFee() {
    const feeSelect = document.getElementById('registration_fee');
    const selectedOption = feeSelect.options[feeSelect.selectedIndex];
    const feeText = selectedOption.text;
    
    // 등록비 정보를 화면에 표시 (필요한 경우)
    console.log('선택된 등록비:', feeText);
}

// 면허번호 중복 확인
function checkLicense() {
    const licenseInput = document.getElementById('license_number');
    const licenseNumber = licenseInput.value.trim();
    
    if (!licenseNumber) {
        alert('면허번호를 입력해주세요.');
        return;
    }
    
    if (!validateLicenseNumber(licenseInput)) {
        return;
    }
    
    // 서버에 중복 확인 요청
    fetch('/check_license_duplicate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            license_number: licenseNumber
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.exists) {
            showError(licenseInput, '이미 등록된 면허번호입니다.');
        } else {
            clearError(licenseInput);
            licenseInput.classList.add('success');
            alert('사용 가능한 면허번호입니다.');
        }
    })
    .catch(error => {
        console.error('면허번호 중복 확인 오류:', error);
        alert('면허번호 중복 확인 중 오류가 발생했습니다.');
    });
}

// 이메일 중복 확인
function checkEmail() {
    const emailInput = document.getElementById('email');
    const email = emailInput.value.trim();
    
    if (!email) {
        alert('이메일을 입력해주세요.');
        return;
    }
    
    if (!validateEmail(emailInput)) {
        return;
    }
    
    // 서버에 중복 확인 요청
    fetch('/check_email_duplicate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            email: email
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.exists) {
            showError(emailInput, '이미 등록된 이메일입니다.');
        } else {
            clearError(emailInput);
            emailInput.classList.add('success');
            alert('사용 가능한 이메일입니다.');
        }
    })
    .catch(error => {
        console.error('이메일 중복 확인 오류:', error);
        alert('이메일 중복 확인 중 오류가 발생했습니다.');
    });
}

// 폼 제출
function submitRegistration() {
    const form = document.getElementById('registrationForm');
    const formData = new FormData(form);
    
    // 모든 필수 필드 유효성 검사
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        if (!validateField(field)) {
            isValid = false;
        }
    });
    
    // 약관 동의 확인
    const agreeCheckbox = document.getElementById('agree_terms');
    if (!agreeCheckbox.checked) {
        alert('개인정보 처리방침에 동의해주세요.');
        isValid = false;
    }
    
    if (!isValid) {
        alert('입력 정보를 확인해주세요.');
        return;
    }
    
    // 로딩 상태 표시
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = '등록 중...';
    submitBtn.disabled = true;
    form.classList.add('loading');
    
    // 서버에 등록 요청
    fetch(form.action, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // 등록 완료 페이지로 이동하거나 메시지 표시
            showRegistrationSuccess(data);
        } else {
            alert('등록 중 오류가 발생했습니다: ' + (data.message || '알 수 없는 오류'));
        }
    })
    .catch(error => {
        console.error('등록 오류:', error);
        alert('등록 중 오류가 발생했습니다. 다시 시도해주세요.');
    })
    .finally(() => {
        // 로딩 상태 해제
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        form.classList.remove('loading');
    });
}

// 등록 성공 처리
function showRegistrationSuccess(data) {
    const container = document.querySelector('.container');
    container.innerHTML = `
        <div class="success-container">
            <div class="success-icon">✓</div>
            <div class="success-header">
                <h1>등록 완료</h1>
                <p>참가자 등록이 성공적으로 완료되었습니다.</p>
            </div>
        </div>
    `;
}

// 유틸리티 함수들
function formatCurrency(amount) {
    return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW'
    }).format(amount);
}

function formatDate(date) {
    return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(new Date(date));
}
