// 회원 업로드 JavaScript
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded 이벤트 발생');
    
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
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

    // 클릭으로 파일 선택
    uploadArea.addEventListener('click', function() {
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
            console.log('업로드 버튼 활성화 중...');
            uploadBtn.disabled = false;
            uploadBtn.textContent = '업로드 시작';
            uploadBtn.style.opacity = '1';
            console.log('업로드 버튼 활성화 완료, disabled:', uploadBtn.disabled);
        } else {
            console.error('uploadBtn 요소를 찾을 수 없습니다!');
        }
        
        console.log('파일 선택됨:', file.name, '크기:', file.size, '타입:', file.type);
        console.log('업로드 버튼 활성화됨');
        
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
        uploadBtn.textContent = '업로드 중...';
        progressSection.style.display = 'block';
        updateProgress(0, '업로드 준비 중...');

        // 업로드 요청
        fetch('/upload_members', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                updateProgress(100, '업로드 완료!');
                setTimeout(() => {
                    showResult(data);
                    // 파일 입력 필드 초기화
                    resetFileInput();
                    
                    // 즉시 부모 창 새로고침 시도 (여러 방법)
                    if (window.opener) {
                        try {
                            // 방법 1: location.reload()
                            window.opener.location.reload();
                            console.log('부모 창 새로고침 완료 (location.reload)');
                            
                            // 방법 2: location.href 설정 (백업)
                            setTimeout(() => {
                                try {
                                    window.opener.location.href = window.opener.location.href;
                                    console.log('부모 창 새로고침 완료 (location.href)');
                                } catch (e2) {
                                    console.log('부모 창 새로고침 실패 (location.href):', e2);
                                }
                            }, 100);
                            
                        } catch (e) {
                            console.log('부모 창 새로고침 실패 (location.reload):', e);
                            // 백업 방법 시도
                            try {
                                window.opener.location.href = window.opener.location.href;
                                console.log('부모 창 새로고침 완료 (백업 방법)');
                            } catch (e2) {
                                console.log('부모 창 새로고침 실패 (백업 방법):', e2);
                            }
                        }
                    }
                    
                    // 3초 후 팝업 창 닫기
                    setTimeout(() => {
                        if (window.opener) {
                            window.close();
                        } else {
                            window.location.href = '/members';
                        }
                    }, 3000);
                }, 1000);
            } else {
                throw new Error(data.message || '업로드 중 오류가 발생했습니다.');
            }
        })
        .catch(error => {
            console.error('Upload error:', error);
            alert('업로드 중 오류가 발생했습니다: ' + error.message);
            // 오류 발생 시에도 파일 입력 필드 초기화
            resetFileInput();
            uploadBtn.disabled = false;
            uploadBtn.textContent = '업로드 시작';
            progressSection.style.display = 'none';
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
    function updateProgress(percent, text) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        progressFill.style.width = percent + '%';
        progressText.textContent = text;
    }

    // 결과 표시
    function showResult(data) {
        progressSection.style.display = 'none';
        resultSection.style.display = 'block';

        document.getElementById('successCount').textContent = data.success_count || 0;
        document.getElementById('failureCount').textContent = data.failure_count || 0;
        
        // 자동 이동 안내 메시지 추가
        const resultMessage = document.querySelector('.result-message');
        if (resultMessage) {
            const isPopup = window.opener ? true : false;
            const redirectMessage = isPopup 
                ? '회원 관리 페이지가 즉시 새로고침됩니다. 3초 후 창이 닫힙니다.'
                : '3초 후 회원 관리 페이지로 자동 이동합니다...';
            
            resultMessage.innerHTML = `
                <p>업로드가 완료되었습니다!</p>
                <p class="auto-redirect">${redirectMessage}</p>
            `;
        }
        
        // 업로드 섹션 숨기기 (중복 업로드 방지)
        const uploadSection = document.querySelector('.upload-section');
        if (uploadSection) {
            uploadSection.style.display = 'none';
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
