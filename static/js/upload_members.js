// 회원 업로드 JavaScript
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded 이벤트 발생');
    
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const selectFileBtn = document.getElementById('selectFileBtn');
    const uploadBtn = document.getElementById('uploadBtn');
    const fileInfo = document.getElementById('fileInfo');
    const progressSection = document.getElementById('progressSection');
    const resultSection = document.getElementById('resultSection');

    console.log('DOM 요소들:', {
        uploadArea: !!uploadArea,
        fileInput: !!fileInput,
        uploadBtn: !!uploadBtn,
        fileInfo: !!fileInfo,
        progressSection: !!progressSection,
        resultSection: !!resultSection
    });

    let selectedFile = null;
    let progressTimer = null;
    let progressStartTime = null;

    const PROGRESS_STAGES = [
        { afterSec: 0, text: '파일을 서버로 전송하는 중...' },
        { afterSec: 3, text: '엑셀 파일을 읽는 중...' },
        { afterSec: 8, text: '회원 정보를 검증하는 중...' },
        { afterSec: 15, text: '데이터베이스에 저장하는 중...' },
        { afterSec: 30, text: '대량 데이터 처리 중... 잠시만 기다려주세요.' },
        { afterSec: 60, text: '아직 처리 중입니다. 곧 완료됩니다.' },
    ];

    function formatElapsed(seconds) {
        if (seconds < 60) {
            return `${seconds}초`;
        }
        const min = Math.floor(seconds / 60);
        const sec = seconds % 60;
        return sec > 0 ? `${min}분 ${sec}초` : `${min}분`;
    }

    function getStageMessage(elapsedSec) {
        let message = PROGRESS_STAGES[0].text;
        for (const stage of PROGRESS_STAGES) {
            if (elapsedSec >= stage.afterSec) {
                message = stage.text;
            }
        }
        return message;
    }

    function startUploadProgressUI() {
        progressStartTime = Date.now();
        document.body.classList.add('upload-in-progress');

        const overlay = document.getElementById('uploadOverlay');
        if (overlay) {
            overlay.classList.add('show');
            overlay.setAttribute('aria-hidden', 'false');
        }
        if (progressSection) {
            progressSection.style.display = 'block';
        }

        updateProgress(8, PROGRESS_STAGES[0].text);

        const progressFill = document.getElementById('progressFill');
        const overlayFill = document.getElementById('overlayProgressFill');
        if (progressFill) {
            progressFill.classList.add('indeterminate');
        }
        if (overlayFill) {
            overlayFill.classList.add('indeterminate');
        }

        if (progressTimer) {
            clearInterval(progressTimer);
        }

        progressTimer = setInterval(() => {
            const elapsedSec = Math.floor((Date.now() - progressStartTime) / 1000);
            const elapsedText = `경과 시간: ${formatElapsed(elapsedSec)}`;
            const stageText = getStageMessage(elapsedSec);

            const elapsedEl = document.getElementById('progressElapsed');
            const overlayElapsedEl = document.getElementById('overlayElapsed');
            const overlayStatusEl = document.getElementById('overlayStatus');

            if (elapsedEl) elapsedEl.textContent = elapsedText;
            if (overlayElapsedEl) overlayElapsedEl.textContent = elapsedText;
            if (overlayStatusEl) overlayStatusEl.textContent = stageText;

            // 서버 응답 전까지 천천히 15% → 88%까지 증가 (완료 느낌)
            const pseudoPercent = Math.min(88, 15 + elapsedSec * 1.2);
            updateProgress(pseudoPercent, stageText, false);
        }, 1000);
    }

    function stopUploadProgressUI() {
        if (progressTimer) {
            clearInterval(progressTimer);
            progressTimer = null;
        }
        document.body.classList.remove('upload-in-progress');

        const overlay = document.getElementById('uploadOverlay');
        if (overlay) {
            overlay.classList.remove('show');
            overlay.setAttribute('aria-hidden', 'true');
        }

        const progressFill = document.getElementById('progressFill');
        const overlayFill = document.getElementById('overlayProgressFill');
        if (progressFill) progressFill.classList.remove('indeterminate');
        if (overlayFill) overlayFill.classList.remove('indeterminate');
    }

    // 드래그 앤 드롭 이벤트
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    });

    // 클릭으로 파일 선택 (버튼 클릭은 버블링 방지 — 이중 파일 선택 창 방지)
    if (selectFileBtn) {
        selectFileBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            fileInput.click();
        });
    }

    uploadArea.addEventListener('click', function(e) {
        if (e.target.closest('.upload-btn') || e.target === fileInput) {
            return;
        }
        fileInput.click();
    });

    // 파일 선택 이벤트
    fileInput.addEventListener('change', function(e) {
        console.log('파일 입력 변경됨:', e.target.files);
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        } else {
            console.log('파일이 선택되지 않음');
        }
    });

    // 파일 선택 처리
    function handleFileSelect(file) {
        console.log('handleFileSelect 호출됨:', file);
        
        // 파일 확장자 검증 (더 유연한 검증)
        const allowedExtensions = ['.xlsx', '.xls', '.csv'];
        const fileName = file.name.toLowerCase();
        const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));

        console.log('파일명:', fileName, '유효한 확장자:', hasValidExtension);

        if (!hasValidExtension) {
            alert('Excel 파일 또는 CSV 파일만 업로드할 수 있습니다. (.xlsx, .xls, .csv)');
            return;
        }

        selectedFile = file;
        console.log('selectedFile 설정됨:', selectedFile);
        
        displayFileInfo(file);
        
        // 업로드 버튼 활성화
        if (uploadBtn) {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = '<i class="fas fa-upload"></i> 업로드 시작';
            uploadBtn.style.opacity = '1';
        } else {
            console.error('uploadBtn 요소를 찾을 수 없습니다!');
        }
        
        console.log('파일 선택됨:', file.name, '크기:', file.size, '타입:', file.type);
        
        // 파일 선택 성공 알림 (선택적)
        // alert('파일이 선택되었습니다: ' + file.name);
    }

    // 파일 정보 표시
    function displayFileInfo(file) {
        const fileName = document.getElementById('fileName');
        const fileSize = document.getElementById('fileSize');

        if (fileName) {
            fileName.textContent = file.name;
        }
        if (fileSize) {
            fileSize.textContent = formatFileSize(file.size);
        }

        // 파일 정보 섹션 표시
        if (fileInfo) {
            fileInfo.style.display = 'block';
        }
        
        // 업로드 영역 숨기기
        if (uploadArea) {
            uploadArea.style.display = 'none';
        }
        
        console.log('파일 정보 표시됨:', file.name);
    }

    // 파일 크기 포맷팅
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // 파일 제거
    window.removeFile = function() {
        selectedFile = null;
        fileInput.value = '';
        fileInfo.style.display = 'none';
        uploadArea.style.display = 'block';
        uploadBtn.disabled = true;
    };

    // 회원 업로드
    window.uploadMembers = function() {
        console.log('uploadMembers 함수 호출됨');
        console.log('selectedFile:', selectedFile);
        
        if (!selectedFile) {
            console.error('selectedFile이 없습니다!');
            alert('업로드할 파일을 선택해주세요.');
            return;
        }

        // 중복 업로드 방지
        if (uploadBtn.disabled) {
            console.log('업로드 버튼이 비활성화되어 있습니다');
            return;
        }

        console.log('FormData 생성 중...');
        const formData = new FormData();
        formData.append('file', selectedFile);
        console.log('FormData 생성 완료, 파일명:', selectedFile.name);

        // UI 업데이트
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 업로드 중...';

        const cancelBtn = document.getElementById('cancelBtn');
        if (cancelBtn) cancelBtn.disabled = true;

        startUploadProgressUI();

        fetch('/upload_members', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            console.log('서버 응답 수신:', response.status);
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.message || `서버 오류 (${response.status})`);
                }).catch(err => {
                    if (err.message) throw err;
                    throw new Error(`서버 오류 (${response.status})`);
                });
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                updateProgress(100, `완료! 성공 ${data.success_count || 0}명, 실패 ${data.failure_count || 0}명`);
                setTimeout(() => {
                    showResult(data);
                    resetFileInput();
                }, 600);
            } else {
                throw new Error(data.message || '업로드 중 오류가 발생했습니다.');
            }
        })
        .catch(error => {
            console.error('Upload error:', error);
            stopUploadProgressUI();
            alert('업로드 중 오류가 발생했습니다: ' + error.message);
            resetFileInput();
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = '<i class="fas fa-upload"></i> 업로드 시작';
            if (cancelBtn) cancelBtn.disabled = false;
            if (progressSection) progressSection.style.display = 'none';
        });
    };

    // 파일 입력 필드 초기화
    function resetFileInput() {
        const fileInput = document.getElementById('fileInput');
        const uploadBtn = document.getElementById('uploadBtn');
        const fileInfo = document.getElementById('fileInfo');
        
        // 파일 입력 필드 초기화
        if (fileInput) {
            fileInput.value = '';
        }
        
        // 업로드 버튼 비활성화
        if (uploadBtn) {
            uploadBtn.disabled = true;
        }
        
        // 파일 정보 숨기기
        if (fileInfo) {
            fileInfo.style.display = 'none';
        }
        
        // 드래그 앤 드롭 영역 다시 활성화
        const fileInputArea = document.querySelector('.file-input-area');
        if (fileInputArea) {
            fileInputArea.classList.remove('file-selected');
        }
    }

    // 진행 상황 업데이트
    function updateProgress(percent, text, updateOverlay = true) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        const progressBar = document.querySelector('.progress-section .progress-bar');
        const overlayStatus = document.getElementById('overlayStatus');
        const overlayFill = document.getElementById('overlayProgressFill');

        if (progressFill && !progressFill.classList.contains('indeterminate')) {
            progressFill.style.width = percent + '%';
        }
        if (progressText) {
            progressText.textContent = text;
        }
        if (progressBar) {
            progressBar.setAttribute('aria-valuenow', String(Math.round(percent)));
        }
        if (updateOverlay) {
            if (overlayStatus) overlayStatus.textContent = text;
            if (overlayFill && percent >= 100) {
                overlayFill.classList.remove('indeterminate');
                overlayFill.style.width = '100%';
            }
        }
    }

    // 결과 표시
    function categorizeUploadError(message) {
        if (message.includes('아이디') && message.includes('이미 존재')) return '아이디 중복';
        if (message.includes('Email') || message.includes('이메일')) return '이메일 중복';
        if (message.includes('면허번호')) return '면허번호 중복';
        if (message.includes('식별 정보')) return '식별 정보 없음';
        return '기타 오류';
    }

    function renderUploadErrors(data) {
        const errorsBox = document.getElementById('resultErrors');
        const summaryEl = document.getElementById('resultErrorSummary');
        const listEl = document.getElementById('resultErrorList');
        const moreEl = document.getElementById('resultErrorMore');

        if (!errorsBox || !summaryEl || !listEl) return;

        const errors = Array.isArray(data.errors) ? data.errors : [];
        const failureCount = data.failure_count || 0;

        if (failureCount === 0 || errors.length === 0) {
            errorsBox.style.display = 'none';
            summaryEl.innerHTML = '';
            listEl.innerHTML = '';
            if (moreEl) moreEl.style.display = 'none';
            return;
        }

        errorsBox.style.display = 'block';

        const summary = {};
        errors.forEach(err => {
            const type = categorizeUploadError(err);
            summary[type] = (summary[type] || 0) + 1;
        });

        summaryEl.innerHTML = Object.entries(summary)
            .map(([type, count]) => `<span class="result-error-tag">${type} ${count}건</span>`)
            .join('');

        listEl.innerHTML = errors
            .map(err => `<li>${escapeHtml(err)}</li>`)
            .join('');

        if (moreEl) {
            const total = data.errors_total || errors.length;
            if (total > errors.length) {
                moreEl.textContent = `외 ${total - errors.length}건의 실패 내역이 더 있습니다.`;
                moreEl.style.display = 'block';
            } else {
                moreEl.style.display = 'none';
            }
        }
    }

    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function showResult(data) {
        stopUploadProgressUI();
        if (progressSection) progressSection.style.display = 'none';
        resultSection.style.display = 'block';

        const failureCount = data.failure_count || 0;
        resultSection.classList.toggle('has-failures', failureCount > 0);

        const resultIcon = resultSection.querySelector('.result-icon i');
        if (resultIcon) {
            resultIcon.className = failureCount > 0
                ? 'fas fa-exclamation-triangle'
                : 'fas fa-check-circle';
        }

        document.getElementById('successCount').textContent = data.success_count || 0;
        document.getElementById('failureCount').textContent = failureCount;

        renderUploadErrors(data);
        
        const resultMessage = document.querySelector('.result-message');
        if (resultMessage) {
            const isPopup = !!window.opener;
            let redirectMessage;
            if (failureCount > 0) {
                redirectMessage = '실패 내역을 확인한 뒤 닫기 버튼을 눌러주세요.';
            } else if (isPopup) {
                redirectMessage = '회원 관리 페이지가 즉시 새로고침됩니다. 3초 후 창이 닫힙니다.';
            } else {
                redirectMessage = '3초 후 회원 관리 페이지로 자동 이동합니다...';
            }

            const headline = failureCount > 0
                ? `업로드가 완료되었습니다. (실패 ${failureCount}건)`
                : '업로드가 완료되었습니다!';

            resultMessage.innerHTML = `
                <p>${headline}</p>
                <p class="auto-redirect">${redirectMessage}</p>
            `;
        }
        
        const uploadSection = document.querySelector('.upload-section');
        if (uploadSection) {
            uploadSection.style.display = 'none';
        }

        // 실패가 있으면 자동 닫기/이동하지 않음
        if (failureCount === 0) {
            if (window.opener) {
                try {
                    window.opener.location.reload();
                } catch (e) {
                    console.log('부모 창 새로고침 실패:', e);
                }
            }
            setTimeout(() => {
                if (window.opener) {
                    window.close();
                } else {
                    window.location.href = '/members';
                }
            }, 3000);
        } else if (window.opener) {
            try {
                window.opener.location.reload();
            } catch (e) {
                console.log('부모 창 새로고침 실패:', e);
            }
        }
    }

    // 회원 관리 페이지로 이동 (부모 창 새로고침 지원)
    window.goToMembersPage = function() {
        if (window.opener) {
            // 팝업 창에서 열린 경우: 부모 창 새로고침 후 팝업 닫기
            try {
                window.opener.location.reload();
                console.log('수동 버튼 클릭: 부모 창 새로고침 완료');
                setTimeout(() => {
                    window.close();
                }, 500);
            } catch (e) {
                console.log('수동 버튼 클릭: 부모 창 새로고침 실패:', e);
                window.close();
            }
        } else {
            // 일반 창인 경우: 회원 관리 페이지로 이동
            window.location.href = '/members';
        }
    };

    // 샘플 파일 다운로드
    window.downloadSample = function() {
        // 샘플 Excel 파일 생성 및 다운로드 (표준 16개 컬럼)
        const sampleData = [
            ['아이디', '성별', '성명(KOR)', '성명(ENG)', '이름(First Name)', '성(Last Name)', '이메일', '전화', '소속(ENG)', '과(ENG)', '소속(KOR)', '과(KOR)', '직위', '면허번호', '생년월일', '회원구분'],
            ['sample001', 'M', '홍길동', 'Hong Gil Dong', 'Gil Dong', 'Hong', 'hong@example.com', '010-1234-5678', 'Seoul National University Hospital', 'Neurology', '서울대학교병원', '신경과', '전문의', 'K12345678', '1980-01-15', '정회원'],
            ['sample002', 'F', '김영희', 'Kim Young Hee', 'Young Hee', 'Kim', 'kim@example.com', '010-9876-5432', 'Samsung Medical Center', 'Cardiology', '삼성서울병원', '심장내과', '전공의', 'K87654321', '1990-05-20', '준회원'],
            ['sample003', 'M', '이철수', 'Lee Chul Soo', 'Chul Soo', 'Lee', 'lee@example.com', '010-5555-1234', 'Yonsei University Hospital', 'Orthopedics', '연세대학교병원', '정형외과', '교수', 'K11223344', '1975-12-03', '종신회원']
        ];

        // SheetJS를 사용하여 Excel 파일 생성
        const ws = XLSX.utils.aoa_to_sheet(sampleData);
        
        // 컬럼 너비 자동 조정
        const colWidths = [];
        sampleData[0].forEach((header, idx) => {
            const maxLength = Math.max(
                ...sampleData.map(row => {
                    const cell = row[idx] || '';
                    // 한글은 2바이트로 계산
                    return (cell.match(/[가-힣]/g) || []).length * 2 + 
                           (cell.match(/[^가-힣]/g) || []).length;
                })
            );
            colWidths.push({ wch: Math.min(maxLength + 2, 50) }); // 최대 50자로 제한
        });
        ws['!cols'] = colWidths;
        
        // 헤더 행 스타일링 (배경색, 굵게)
        const headerRange = XLSX.utils.decode_range(ws['!ref']);
        for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
            if (!ws[cellAddress]) continue;
            ws[cellAddress].s = {
                font: { bold: true },
                fill: { fgColor: { rgb: "4472C4" } },
                alignment: { horizontal: "center", vertical: "center" }
            };
        }
        
        // 워크북 생성
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '회원목록');
        
        // Excel 파일로 다운로드
        XLSX.writeFile(wb, '회원_업로드_샘플_표준컬럼.xlsx');
    };
});
