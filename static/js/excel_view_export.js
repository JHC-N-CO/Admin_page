// ============================================================
// 엑셀 뷰 내보내기 관련 함수들
// ============================================================

function openExcelViewExportModal() {
    if (typeof currentViewMode === 'undefined' || currentViewMode !== 'excel') {
        alert('엑셀 뷰에서만 사용할 수 있습니다.');
        return;
    }
    
    if (typeof excelViewState === 'undefined' || !excelViewState.initialized || excelViewState.filteredRows.length === 0) {
        alert('내보낼 데이터가 없습니다.');
        return;
    }
    
    const modal = document.getElementById('excelViewExportModal');
    if (!modal) {
        console.error('엑셀 뷰 내보내기 모달을 찾을 수 없습니다.');
        return;
    }
    
    // 필터 정보 표시
    const activeFilters = [];
    if (excelViewState.filters.domesticChair) activeFilters.push('국내좌장');
    if (excelViewState.filters.overseasChair) activeFilters.push('해외좌장');
    if (excelViewState.filters.noChair) activeFilters.push('좌장없음');
    if (excelViewState.filters.domesticSpeaker) activeFilters.push('국내연자');
    if (excelViewState.filters.overseasSpeaker) activeFilters.push('해외연자');
    if (excelViewState.filters.noSpeaker) activeFilters.push('연자없음');
    
    document.getElementById('excelViewExportFilterInfo').textContent = activeFilters.length > 0 ? activeFilters.join(', ') : '전체';
    document.getElementById('excelViewExportRowCount').textContent = excelViewState.filteredRows.length;
    
    // 기본 형식 선택
    const normalFormatRadio = document.querySelector('input[name="excelViewExportFormat"][value="normal"]');
    if (normalFormatRadio) {
        normalFormatRadio.checked = true;
    }
    
    // 컬럼 선택 UI 생성
    populateExcelViewColumnSelector();
    
    // 형식 변경 시 컬럼 선택 섹션 표시/숨김
    updateColumnSelectorVisibility();
    
    modal.style.display = 'flex';
}

function updateColumnSelectorVisibility() {
    const formatRadios = document.querySelectorAll('input[name="excelViewExportFormat"]');
    const columnSection = document.getElementById('excelViewColumnSelectorSection');
    
    if (!formatRadios.length || !columnSection) return;
    
    // 초기 상태 설정
    const checkedRadio = document.querySelector('input[name="excelViewExportFormat"]:checked');
    if (checkedRadio && (checkedRadio.value === 'chairEmail' || checkedRadio.value === 'speakerEmail')) {
        columnSection.style.display = 'none';
    } else {
        columnSection.style.display = 'block';
    }
    
    // 변경 이벤트 리스너 추가
    formatRadios.forEach(radio => {
        // 기존 리스너 제거 후 새로 추가
        const newRadio = radio.cloneNode(true);
        radio.parentNode.replaceChild(newRadio, radio);
        
        newRadio.addEventListener('change', function() {
            if (this.value === 'chairEmail' || this.value === 'speakerEmail') {
                columnSection.style.display = 'none';
            } else {
                columnSection.style.display = 'block';
            }
        });
    });
}

function closeExcelViewExportModal() {
    const modal = document.getElementById('excelViewExportModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function populateExcelViewColumnSelector() {
    const container = document.getElementById('excelViewColumnSelector');
    if (!container || !excelViewState.headers) return;
    
    container.innerHTML = '';
    
    // 기본 컬럼과 참가자 데이터 컬럼 분리
    const basicColumns = [];
    const participantColumns = [];
    
    excelViewState.headers.forEach((header, index) => {
        const isParticipantColumn = 
            header.includes('이메일') || header.includes('Email') ||
            header.includes('전화') || header.includes('Phone') ||
            header.includes('소속') || header.includes('Affiliation') ||
            header.includes('과(ENG)') || header.includes('Department ENG') ||
            header.includes('직위') || header.includes('Position') ||
            header.includes('국가') || header.includes('Country');
        
        const columnInfo = {
            index: index,
            header: header,
            isParticipant: isParticipantColumn
        };
        
        if (isParticipantColumn) {
            participantColumns.push(columnInfo);
        } else {
            basicColumns.push(columnInfo);
        }
    });
    
    // 기본 컬럼 섹션
    if (basicColumns.length > 0) {
        const basicSection = document.createElement('div');
        basicSection.style.marginBottom = '20px';
        basicSection.innerHTML = '<div style="font-weight: 600; margin-bottom: 10px; color: #202124;">기본 컬럼</div>';
        
        basicColumns.forEach(col => {
            const label = document.createElement('label');
            label.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 8px; cursor: pointer; border-radius: 4px; transition: background-color 0.2s;';
            label.innerHTML = `
                <input type="checkbox" class="excel-view-column-checkbox" data-column-index="${col.index}" checked style="width: 16px; height: 16px;">
                <span style="font-size: 13px; color: #333;">${col.header}</span>
            `;
            label.addEventListener('mouseenter', () => label.style.backgroundColor = '#f8f9fa');
            label.addEventListener('mouseleave', () => label.style.backgroundColor = 'transparent');
            basicSection.appendChild(label);
        });
        
        container.appendChild(basicSection);
    }
    
    // 참가자 데이터 컬럼 섹션
    if (participantColumns.length > 0) {
        const participantSection = document.createElement('div');
        participantSection.innerHTML = '<div style="font-weight: 600; margin-bottom: 10px; color: #1a73e8;">참가자 데이터 컬럼</div>';
        
        participantColumns.forEach(col => {
            const label = document.createElement('label');
            label.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 8px; cursor: pointer; border-radius: 4px; transition: background-color 0.2s;';
            label.innerHTML = `
                <input type="checkbox" class="excel-view-column-checkbox" data-column-index="${col.index}" checked style="width: 16px; height: 16px;">
                <span style="font-size: 13px; color: #333;">${col.header}</span>
            `;
            label.addEventListener('mouseenter', () => label.style.backgroundColor = '#f8f9fa');
            label.addEventListener('mouseleave', () => label.style.backgroundColor = 'transparent');
            participantSection.appendChild(label);
        });
        
        container.appendChild(participantSection);
    }
}

function selectAllExcelViewColumns() {
    document.querySelectorAll('.excel-view-column-checkbox').forEach(cb => cb.checked = true);
}

function deselectAllExcelViewColumns() {
    document.querySelectorAll('.excel-view-column-checkbox').forEach(cb => cb.checked = false);
}

function exportFilteredExcelView() {
    try {
        if (typeof XLSX === 'undefined') {
            alert('엑셀 라이브러리를 불러오지 못했습니다.');
            return;
        }
        
        // 선택된 형식 확인
        const selectedFormat = document.querySelector('input[name="excelViewExportFormat"]:checked');
        const formatValue = selectedFormat ? selectedFormat.value : 'normal';
        
        let excelData;
        let filename;
        
        if (formatValue === 'chairEmail') {
            // 좌장 이메일 발송용 형식
            excelData = generateChairEmailFormat();
            const eventId = document.body.getAttribute('data-event-id');
            const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
            filename = `chair_email_format_${eventId}_${today}.xlsx`;
        } else if (formatValue === 'speakerEmail') {
            // 발표자 이메일 발송용 형식
            excelData = generateSpeakerEmailFormat();
            const eventId = document.body.getAttribute('data-event-id');
            const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
            filename = `speaker_email_format_${eventId}_${today}.xlsx`;
        } else {
            // 일반 형식
            // 선택된 컬럼 인덱스 가져오기
            let selectedColumns = Array.from(document.querySelectorAll('.excel-view-column-checkbox:checked'))
                .map(cb => parseInt(cb.getAttribute('data-column-index')))
                .sort((a, b) => a - b);

            // 세션약어를 선택했으면 세션명도 약어 옆에 포함 (캘린더 뷰와 동일한 번호 반영)
            const headers = excelViewState.headers || [];
            const abbrIdx = headers.findIndex(h =>
                h && (h.includes('세션약어') || h.includes('Session Abbreviation'))
            );
            const titleIdx = headers.findIndex(h =>
                h && (h.includes('세션명') || h.includes('Session Topic'))
            );
            if (abbrIdx >= 0 && selectedColumns.includes(abbrIdx) && titleIdx >= 0 && !selectedColumns.includes(titleIdx)) {
                selectedColumns.push(titleIdx);
                selectedColumns.sort((a, b) => a - b);
            }
            
            if (selectedColumns.length === 0) {
                alert('최소 하나의 컬럼을 선택해주세요.');
                return;
            }
            
            // 필터링된 행에서 선택된 컬럼만 추출
            const filteredHeaders = selectedColumns.map(idx => excelViewState.headers[idx]);
            let filteredRows = excelViewState.filteredRows.map(row => 
                selectedColumns.map(idx => row[idx] || '')
            );
            
            // 세션/발표 관련 컬럼이 선택되지 않았다면 참가자별 중복 제거
            const sessionRelatedKeywords = ['날짜', 'Date', '세션 종류', 'Session Type', '언어', 'Language', 
                                           '세션약어', 'Session Abbreviation', '세션명', 'Session Topic',
                                           '장소', 'Venue', '세션 시간', 'Session Time',
                                           '발표 주제', 'Lecture Title', '발표 시간', 'Lecture Time'];
            
            const hasSessionColumns = filteredHeaders.some(header => 
                sessionRelatedKeywords.some(keyword => header.includes(keyword))
            );
            
            if (!hasSessionColumns) {
                // 참가자 식별을 위한 컬럼 인덱스 찾기
                const nameColumns = [];
                const emailColumns = [];
                
                filteredHeaders.forEach((header, idx) => {
                    if (header.includes('좌장') || header.includes('Chair') || 
                        header.includes('발표자') || header.includes('Speaker')) {
                        if (header.includes('이메일') || header.includes('Email')) {
                            emailColumns.push(idx);
                        } else if (header.includes('한글') || header.includes('KOR') || 
                                   header.includes('영문') || header.includes('ENG')) {
                            nameColumns.push(idx);
                        }
                    }
                });
                
                // 중복 제거: 이메일 또는 이름을 기준으로
                const seenParticipants = new Set();
                filteredRows = filteredRows.filter(row => {
                    // 이메일로 식별 시도
                    for (const emailIdx of emailColumns) {
                        const email = String(row[emailIdx] || '').trim();
                        if (email) {
                            if (seenParticipants.has(`email:${email}`)) {
                                return false; // 중복 제거
                            }
                            seenParticipants.add(`email:${email}`);
                            return true;
                        }
                    }
                    
                    // 이름으로 식별 시도
                    const nameKeys = [];
                    for (const nameIdx of nameColumns) {
                        const name = String(row[nameIdx] || '').trim();
                        if (name) {
                            nameKeys.push(name);
                        }
                    }
                    
                    if (nameKeys.length > 0) {
                        const nameKey = nameKeys.join('|');
                        if (seenParticipants.has(`name:${nameKey}`)) {
                            return false; // 중복 제거
                        }
                        seenParticipants.add(`name:${nameKey}`);
                        return true;
                    }
                    
                    // 식별할 수 없는 경우 그대로 유지
                    return true;
                });
            }
            
            excelData = [filteredHeaders, ...filteredRows];
            const eventId = document.body.getAttribute('data-event-id');
            const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
            filename = `filtered_program_${eventId}_${today}.xlsx`;
        }
        
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(excelData);
        
        // 열 너비 자동 계산
        const headers = excelData[0];
        const rows = excelData.slice(1);
        const colWidths = headers.map((header, i) => {
            const maxLength = Math.max(
                header.length,
                ...rows.map(row => String(row[i] || '').length)
            );
            return { wch: Math.min(Math.max(maxLength + 2, 12), 50) };
        });
        ws['!cols'] = colWidths;
        
        let sheetName = 'Filtered Program';
        if (formatValue === 'chairEmail') {
            sheetName = 'Chair Email Format';
        } else if (formatValue === 'speakerEmail') {
            sheetName = 'Speaker Email Format';
        }
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        
        // 파일 다운로드
        XLSX.writeFile(wb, filename);
        
        console.log(`✅ Filtered program exported: ${filename} (${rows.length} rows, ${headers.length} columns)`);
        
        // 모달 닫기
        closeExcelViewExportModal();
        
        alert(`필터링된 데이터가 성공적으로 내보내졌습니다.\n행 수: ${rows.length}행\n컬럼 수: ${headers.length}개`);
        
    } catch (error) {
        console.error('❌ Error exporting filtered Excel view:', error);
        alert('내보내기 중 오류가 발생했습니다: ' + error.message);
    }
}

// 좌장 이메일 발송용 형식 생성 함수
function generateChairEmailFormat() {
    // 세션 데이터 가져오기 (필터링된 세션만)
    const filteredSessions = getFilteredSessionsForExport();
    
    // 좌장별로 그룹화
    const chairMap = new Map(); // key: chairEmail, value: { chairName, sessions: [] }
    
    filteredSessions.forEach(session => {
        // 좌장 정보 추출
        const chairs = session.chairs || [];
        
        if (chairs.length === 0) {
            // 좌장이 없는 세션은 건너뛰기
            return;
        }
        
        // 세션의 모든 좌장 정보를 수집 (좌장 컬럼용)
        const allChairsInfo = [];
        chairs.forEach(chair => {
            const chairId = chair.id || chair.participantId;
            const chairInfo = typeof getParticipantInfo === 'function' ? getParticipantInfo(chairId) : null;
            
            // 영문 이름 추출
            let chairNameEng = '';
            if (typeof getPreferredNameForEntity === 'function') {
                chairNameEng = getPreferredNameForEntity(chair, 'eng') || '';
            } else if (chairInfo) {
                chairNameEng = chairInfo.name_eng || chairInfo.name || '';
            } else {
                chairNameEng = chair.name_eng || chair.name || '';
            }
            
            // 국가 추출
            let chairCountry = '';
            if (chairInfo && chairInfo.country) {
                chairCountry = chairInfo.country;
            } else if (chair.country) {
                chairCountry = chair.country;
            }
            
            // "이름(영문) (국가)" 형식으로 저장
            if (chairNameEng) {
                const chairDisplay = chairCountry 
                    ? `${chairNameEng} (${chairCountry})`
                    : chairNameEng;
                allChairsInfo.push(chairDisplay);
            }
        });
        const chairsDisplayString = allChairsInfo.join(' / ');
        
        // 발표자 정보 추출 (제목, 시간, 발표자 이름, 발표자 국가)
        const lectures = [];
        if (session.speakers && session.speakers.length > 0) {
            session.speakers.forEach(speaker => {
                const topic = speaker.topic || '';
                // TBD가 아닌 발표만 포함
                if (topic && topic.trim() !== '' && topic.toUpperCase() !== 'TBD') {
                    // 발표 시간
                    const lectureTime = speaker.startTime && speaker.endTime 
                        ? `${speaker.startTime}-${speaker.endTime}`
                        : '';
                    
                    // 발표자 정보 추출
                    const speakerId = speaker.participantId || speaker.id;
                    const speakerInfo = typeof getParticipantInfo === 'function' ? getParticipantInfo(speakerId) : null;
                    
                    // 발표자 이름 (영문 우선, 없으면 한글)
                    let speakerName = '';
                    if (typeof getPreferredNameForEntity === 'function') {
                        speakerName = getPreferredNameForEntity(speaker, 'eng') || getPreferredNameForEntity(speaker, 'kor') || '';
                    } else if (speakerInfo) {
                        speakerName = speakerInfo.name_eng || speakerInfo.name_kor || speakerInfo.name || '';
                    } else {
                        speakerName = speaker.name_eng || speaker.name_kor || speaker.name || '';
                    }
                    
                    // 발표자 국가
                    let speakerCountry = '';
                    if (speakerInfo && speakerInfo.country) {
                        speakerCountry = speakerInfo.country;
                    } else if (speaker.country) {
                        speakerCountry = speaker.country;
                    }
                    
                    lectures.push({
                        topic: topic.trim(),
                        time: lectureTime,
                        speakerName: speakerName,
                        speakerCountry: speakerCountry
                    });
                }
            });
        }
        
        // 각 좌장별로 행 생성
        chairs.forEach(chair => {
            const chairId = chair.id || chair.participantId;
            const chairInfo = typeof getParticipantInfo === 'function' ? getParticipantInfo(chairId) : null;
            
            // 이메일 추출
            let chairEmail = '';
            if (chairInfo && chairInfo.email) {
                chairEmail = chairInfo.email;
            } else if (chair.email) {
                chairEmail = chair.email;
            }
            
            // 이름 추출 (한글과 영문 분리)
            let chairNameKor = '';
            let chairNameEng = '';
            
            if (typeof getPreferredNameForEntity === 'function') {
                chairNameKor = getPreferredNameForEntity(chair, 'kor') || '';
                chairNameEng = getPreferredNameForEntity(chair, 'eng') || '';
            } else if (chairInfo) {
                chairNameKor = chairInfo.name_kor || '';
                chairNameEng = chairInfo.name_eng || '';
                // name_kor나 name_eng이 없으면 name을 사용
                if (!chairNameKor && !chairNameEng) {
                    chairNameKor = chairInfo.name || '';
                    chairNameEng = chairInfo.name || '';
                }
            } else {
                chairNameKor = chair.name_kor || chair.name || '';
                chairNameEng = chair.name_eng || chair.name || '';
            }
            
            // 국가 추출
            let chairCountry = '';
            if (chairInfo && chairInfo.country) {
                chairCountry = chairInfo.country;
            } else if (chair.country) {
                chairCountry = chair.country;
            }
            
            // 소속 추출 (영문 우선, 없으면 한글)
            let chairAffiliation = '';
            if (chairInfo) {
                chairAffiliation = chairInfo.affiliation_eng || chairInfo.affiliation_kor || '';
            } else if (chair.affiliation_eng) {
                chairAffiliation = chair.affiliation_eng;
            } else if (chair.affiliation_kor) {
                chairAffiliation = chair.affiliation_kor;
            }
            
            if (!chairEmail && !chairNameKor && !chairNameEng) {
                return; // 이메일과 이름이 모두 없으면 건너뛰기
            }
            
            const key = chairEmail || `no-email-${chairNameKor || chairNameEng}`;
            
            if (!chairMap.has(key)) {
                chairMap.set(key, {
                    chairNameKor: chairNameKor,
                    chairNameEng: chairNameEng,
                    chairEmail: chairEmail,
                    chairCountry: chairCountry,
                    chairAffiliation: chairAffiliation,
                    sessions: []
                });
            }
            
            const exportFields = typeof getExportSessionFields === 'function'
                ? getExportSessionFields(session)
                : {
                    sessionAbbr: session.displayAbbreviation || session.sessionAbbreviation || '',
                    sessionTitle: session.title || ''
                };
            // 세션 정보 추가 (모든 좌장 정보 포함)
            chairMap.get(key).sessions.push({
                date: session.date || '',
                time: session.startTime ? `${session.startTime}-${session.endTime || ''}` : '',
                venue: session.venue || '',
                sessionAbbr: exportFields.sessionAbbr,
                sessionTitle: exportFields.sessionTitle,
                chairsDisplay: chairsDisplayString, // 모든 좌장 정보
                lectures: lectures
            });
        });
    });
    
    // 헤더 생성 (최대 발표 개수 계산)
    let maxLectureCount = 0;
    chairMap.forEach(chairData => {
        chairData.sessions.forEach(session => {
            if (session.lectures && session.lectures.length > maxLectureCount) {
                maxLectureCount = session.lectures.length;
            }
        });
    });
    
    const headers = ['날짜', '시간', '장소', '좌장이름(한글)', '좌장이름(영문)', '좌장 소속', '좌장 국가', '좌장', '세션 약어', '세션 제목'];
    for (let i = 1; i <= maxLectureCount; i++) {
        headers.push(`발표 제목 ${i}`);
        headers.push(`발표 시간 ${i}`);
        headers.push(`발표자 ${i}`);
        headers.push(`발표자 국가 ${i}`);
    }
    headers.push('좌장 이메일');
    
    // 데이터 행 생성
    const rows = [];
    chairMap.forEach(chairData => {
        chairData.sessions.forEach(session => {
            const row = [
                session.date,
                session.time,
                session.venue,
                chairData.chairNameKor,
                chairData.chairNameEng,
                chairData.chairAffiliation || '',
                chairData.chairCountry,
                session.chairsDisplay || '', // 모든 좌장 정보 (영문 이름 (국가) 형식)
                session.sessionAbbr,
                session.sessionTitle
            ];
            
            // 발표 정보들 추가 (제목, 시간, 발표자, 발표자 국가)
            for (let i = 0; i < maxLectureCount; i++) {
                const lecture = session.lectures && session.lectures[i] ? session.lectures[i] : null;
                row.push(lecture ? lecture.topic : '');           // 발표 제목
                row.push(lecture ? lecture.time : '');             // 발표 시간
                row.push(lecture ? lecture.speakerName : '');     // 발표자
                row.push(lecture ? lecture.speakerCountry : '');   // 발표자 국가
            }
            
            // 좌장 이메일 추가
            row.push(chairData.chairEmail);
            
            rows.push(row);
        });
    });
    
    return [headers, ...rows];
}

// 필터링된 세션 데이터 가져오기
function getFilteredSessionsForExport() {
    // 전역 sessions 변수 사용 (event_program.js에서 정의됨)
    if (typeof sessions === 'undefined' || !Array.isArray(sessions)) {
        console.warn('sessions 변수를 찾을 수 없습니다. 빈 배열을 반환합니다.');
        return [];
    }
    
    // 필터링된 행에서 세션 ID/키 추출
    const filteredRows = excelViewState.filteredRows || [];
    const headers = excelViewState.headers || [];
    
    // 필요한 컬럼 인덱스 찾기
    const dateIdx = headers.findIndex(h => h.includes('날짜') || h.includes('Date'));
    const sessionTitleIdx = headers.findIndex(h => h.includes('세션명') || h.includes('Session Topic'));
    const venueIdx = headers.findIndex(h => h.includes('장소') || h.includes('Venue'));
    const sessionTimeIdx = headers.findIndex(h => h.includes('세션 시간') || h.includes('Session Time'));
    
    // 필터링된 세션 키 수집
    const filteredSessionKeys = new Set();
    
    filteredRows.forEach(row => {
        const date = dateIdx >= 0 ? (row[dateIdx] || '') : '';
        const sessionTitle = sessionTitleIdx >= 0 ? (row[sessionTitleIdx] || '') : '';
        const venue = venueIdx >= 0 ? (row[venueIdx] || '') : '';
        const sessionTime = sessionTimeIdx >= 0 ? (row[sessionTimeIdx] || '') : '';
        
        // 세션 키 생성
        const sessionKey = `${date}|${sessionTitle}|${venue}|${sessionTime}`;
        filteredSessionKeys.add(sessionKey);
    });
    
    // 원본 sessions에서 필터링된 세션만 추출
    const result = [];
    
    sessions.forEach(session => {
        const sDate = session.date || '';
        const sTitle = session.title || '';
        const sVenue = session.venue || '';
        const sTime = session.startTime ? `${session.startTime}-${session.endTime || ''}` : '';
        const sKey = `${sDate}|${sTitle}|${sVenue}|${sTime}`;
        
        if (filteredSessionKeys.has(sKey)) {
            result.push(session);
        }
    });
    
    return result;
}

// 발표자 이메일 발송용 형식 생성 함수
function generateSpeakerEmailFormat() {
    // 세션 데이터 가져오기 (필터링된 세션만)
    const filteredSessions = getFilteredSessionsForExport();
    
    // 헤더 정의
    const headers = [
        '날짜',
        '세션시간',
        '장소',
        'English Session',
        '세션 약어',
        '세션 제목',
        '발표 제목',
        '발표 시간',
        '발표자',
        '발표자 국가',
        '발표자 소속',
        '발표자 이메일'
    ];
    
    // 데이터 행 생성
    const rows = [];
    
    filteredSessions.forEach(session => {
        const sessionDate = session.date || '';
        const sessionTime = session.startTime ? `${session.startTime}-${session.endTime || ''}` : '';
        const venue = session.venue || '';
        const exportFields = typeof getExportSessionFields === 'function'
            ? getExportSessionFields(session)
            : {
                sessionAbbr: session.displayAbbreviation || session.sessionAbbreviation || '',
                sessionTitle: session.title || ''
            };
        const sessionAbbr = exportFields.sessionAbbr;
        const sessionTitle = exportFields.sessionTitle;
        
        // 세션 언어 확인 (English Session 여부)
        // 캘린더 뷰에서 사용하는 로직과 동일하게 판단
        // session.language 필드에 값이 있으면 English Session으로 판단 (캘린더 뷰에서는 language가 있으면 표시함)
        const sessionLanguage = session.language || '';
        const languageLower = sessionLanguage.toLowerCase().trim();
        
        // language 필드에 값이 있고, "english" 또는 "영어" 관련 키워드가 포함되어 있으면 English Session으로 판단
        const isEnglishSession = languageLower && (
            languageLower === 'english' || 
            languageLower === '영어' ||
            languageLower === 'en' ||
            languageLower.includes('english') ||
            languageLower === 'english session' ||
            languageLower.includes('english session') ||
            languageLower.startsWith('english') ||
            languageLower.endsWith('english') ||
            languageLower.includes('영어')
        );
        
        const englishSessionValue = isEnglishSession ? '*English Session*' : '';
        
        // 디버깅용 로그
        if (sessionLanguage) {
            console.log(`Session "${sessionTitle}" language: "${sessionLanguage}", isEnglishSession: ${isEnglishSession}, value: "${englishSessionValue}"`);
        }
        
        // 발표자 정보 추출
        if (session.speakers && session.speakers.length > 0) {
            session.speakers.forEach(speaker => {
                const topic = speaker.topic || '';
                // TBD가 아닌 발표만 포함
                if (topic && topic.trim() !== '' && topic.toUpperCase() !== 'TBD') {
                    // 발표 시간
                    const lectureTime = speaker.startTime && speaker.endTime 
                        ? `${speaker.startTime}-${speaker.endTime}`
                        : '';
                    
                    // 발표자 정보 추출
                    const speakerId = speaker.participantId || speaker.id;
                    const speakerInfo = typeof getParticipantInfo === 'function' ? getParticipantInfo(speakerId) : null;
                    
                    // 발표자 이름 (영문 우선, 없으면 한글)
                    let speakerName = '';
                    if (typeof getPreferredNameForEntity === 'function') {
                        speakerName = getPreferredNameForEntity(speaker, 'eng') || getPreferredNameForEntity(speaker, 'kor') || '';
                    } else if (speakerInfo) {
                        speakerName = speakerInfo.name_eng || speakerInfo.name_kor || speakerInfo.name || '';
                    } else {
                        speakerName = speaker.name_eng || speaker.name_kor || speaker.name || '';
                    }
                    
                    // 발표자 국가
                    let speakerCountry = '';
                    if (speakerInfo && speakerInfo.country) {
                        speakerCountry = speakerInfo.country;
                    } else if (speaker.country) {
                        speakerCountry = speaker.country;
                    }
                    
                    // 발표자 소속 (영문 우선, 없으면 한글)
                    let speakerAffiliation = '';
                    if (speakerInfo) {
                        speakerAffiliation = speakerInfo.affiliation_eng || speakerInfo.affiliation_kor || '';
                    } else if (speaker.affiliation_eng) {
                        speakerAffiliation = speaker.affiliation_eng;
                    } else if (speaker.affiliation_kor) {
                        speakerAffiliation = speaker.affiliation_kor;
                    }
                    
                    // 발표자 이메일
                    let speakerEmail = '';
                    if (speakerInfo && speakerInfo.email) {
                        speakerEmail = speakerInfo.email;
                    } else if (speaker.email) {
                        speakerEmail = speaker.email;
                    }
                    
                    // 행 생성
                    const row = [
                        sessionDate,
                        sessionTime,
                        venue,
                        englishSessionValue,
                        sessionAbbr,
                        sessionTitle,
                        topic.trim(),
                        lectureTime,
                        speakerName,
                        speakerCountry,
                        speakerAffiliation,
                        speakerEmail
                    ];
                    
                    rows.push(row);
                }
            });
        }
    });
    
    return [headers, ...rows];
}
