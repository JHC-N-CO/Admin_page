// decline_reason.js
// 추가적인 클라이언트 측 로직이 필요하면 여기에 작성
document.addEventListener('DOMContentLoaded', function () {
    // 예: 폼 제출 전 유효성 검사
    const form = document.querySelector('form');
    form.addEventListener('submit', function (event) {
        const declineReason = form.querySelector('textarea[name="decline_reason"]').value.trim();
        if (!declineReason) {
            event.preventDefault();
            alert('거절 사유를 입력해 주세요.');
        }
    });
});
