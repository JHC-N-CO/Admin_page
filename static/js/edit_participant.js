async function submitForm(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const response = await fetch(event.target.action, {
        method: "POST",
        body: formData
    });
    const result = await response.json();
    if (result.status === "success") {
        alert("Participant updated successfully!");
        window.opener.location.reload();
        window.close();
    } else {
        alert(result.message);
    }
}

async function deleteFile(field, participantId) {
    try {
        const response = await fetch(`/delete_file_field/${participantId}/${field}`, {
            method: 'POST',
        });
        const result = await response.json();
        if (result.status === "success") {
            alert("File deleted successfully!");
            // 필드의 표시를 업데이트하기 위해 페이지 새로고침
            location.reload();
        } else {
            alert("Error deleting file: " + result.message);
        }
    } catch (error) {
        console.error("Error during file deletion:", error);
        alert("An error occurred while deleting the file.");
    }
}

document.addEventListener("DOMContentLoaded", function () {
    const textareas = document.querySelectorAll(".auto-resize");
    textareas.forEach(textarea => {
        // 초기 높이 설정
        textarea.style.height = "auto";
        textarea.style.height = `${textarea.scrollHeight}px`;

        // 입력 시 높이 조절
        textarea.addEventListener("input", function () {
            this.style.height = "auto"; // 높이를 먼저 초기화
            this.style.height = `${this.scrollHeight}px`; // 내용에 맞게 높이 설정
        });
    });
});

// --- Extracted from edit_participant.html inline <script> ---
document.querySelector('form').addEventListener('submit', function(e) {
    e.preventDefault();
    const form = this;
    const formData = new FormData(form);

    fetch(form.action, {
        method: 'POST',
        body: formData
    }).then(response => {
        if (response.redirected || response.ok) {
            window.close();
            if (window.opener) {
                window.opener.location.reload();
            }
        } else {
            alert('업데이트에 실패했습니다.');
        }
    }).catch(() => {
        alert('업데이트 중 오류가 발생했습니다.');
    });
});
