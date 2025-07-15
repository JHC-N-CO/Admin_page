// 프로필 사진 미리보기
document.getElementById('profile_photo').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('photoPreview').src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
});

// 생년월일 날짜 선택기
flatpickr("#birth_date", {
    dateFormat: "Y/m/d",
    locale: "ko",
    allowInput: true
});

// 아이디 중복확인
document.getElementById('username-check-btn').addEventListener('click', function() {
    const username = document.getElementById('username').value;
    if (!username) {
        alert('아이디를 입력해주세요.');
        return;
    }
    
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
        } else {
            alert(data.error || data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('중복확인 중 오류가 발생했습니다.');
    });
});

// 면허번호 중복확인
document.getElementById('license-check-btn').addEventListener('click', function() {
    const licenseNumber = document.getElementById('license_number').value;
    if (!licenseNumber) {
        alert('면허번호를 입력해주세요.');
        return;
    }
    
    fetch('/api/check-license', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ license_number: licenseNumber })
    })
    .then(response => response.json())
    .then(data => {
        if (data.available) {
            alert('사용 가능한 면허번호입니다.');
        } else {
            alert(data.error || data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('중복확인 중 오류가 발생했습니다.');
    });
}); 