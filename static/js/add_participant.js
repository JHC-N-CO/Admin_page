async function submitForm(event) {
            event.preventDefault(); // Prevent default form submission

            const formData = new FormData(event.target);

            try {
                const response = await fetch(event.target.action, {
                    method: "POST",
                    body: formData,
                });

                if (response.redirected) {
                    // 서버에서 리다이렉트가 발생한 경우 (성공)
                    alert("Participant added successfully!");
                    window.close(); // Close the popup
                    if (window.opener) {
                        window.opener.location.reload(); // Refresh parent page
                    }
                } else if (response.ok) {
                    const contentType = response.headers.get("content-type");
                    if (contentType && contentType.includes("application/json")) {
                        const result = await response.json();
                        if (result.status === "success") {
                            alert("Participant added successfully!");
                            window.close(); // Close the popup
                            if (window.opener) {
                                window.opener.location.reload(); // Refresh parent page
                            }
                        } else {
                            alert(result.message); // Show error message
                        }
                    } else {
                        // HTML 응답인 경우 (오류 페이지)
                        const html = await response.text();
                        document.body.innerHTML = html;
                    }
                } else {
                    alert("An error occurred while submitting the form.");
                }
            } catch (error) {
                console.error("Error during submission:", error);
                alert("An error occurred while submitting the form.");
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
