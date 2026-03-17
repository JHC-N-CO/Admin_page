// ============================================================
// 이메일 발송 관련 함수들
// ============================================================

function openEmailComposeModal() {
    const modal = document.getElementById('emailComposeModal');
    if (!modal) {
        console.error('이메일 작성 모달을 찾을 수 없습니다.');
        return;
    }
    
    // 모달을 열 때 워드 파일 목록 초기화
    uploadedWordFiles = [];
    updateWordFilesList();
    
    modal.style.display = 'flex';
    populateEmailRecipients();
    
    // ESC 키로 모달 닫기
    const handleEscKey = (e) => {
        if (e.key === 'Escape' && modal.style.display === 'flex') {
            closeEmailComposeModal();
            document.removeEventListener('keydown', handleEscKey);
        }
    };
    document.addEventListener('keydown', handleEscKey);
    
    // 모달 외부 클릭 시 닫기
    const handleModalClick = (e) => {
        if (e.target === modal) {
            closeEmailComposeModal();
            modal.removeEventListener('click', handleModalClick);
        }
    };
    modal.addEventListener('click', handleModalClick);
}

function closeEmailComposeModal() {
    const modal = document.getElementById('emailComposeModal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    // 참가자 관리 페이지에서 모달을 열었던 경우, 체크박스 상태 동기화
    if (initialSelectedParticipantIds.length > 0) {
        syncParticipantCheckboxes();
        initialSelectedParticipantIds = []; // 초기화
    }
    
    // 전역 선택된 ID Set 초기화
    globalSelectedRecipientIds = new Set();
    
    // 모달 닫을 때 초기화
    const subjectInput = document.getElementById('emailSubject');
    const editor = document.getElementById('emailEditor');
    const ccInput = document.getElementById('emailCC');
    const selectAllChairs = document.getElementById('selectAllChairs');
    const selectAllSpeakers = document.getElementById('selectAllSpeakers');
    const searchInput = document.getElementById('recipientSearchInput');
    
    if (subjectInput) subjectInput.value = '';
    if (editor) editor.innerHTML = '';
    if (ccInput) ccInput.value = '';
    if (selectAllChairs) selectAllChairs.checked = false;
    if (selectAllSpeakers) selectAllSpeakers.checked = false;
    const filterDomestic = document.getElementById('filterDomestic');
    const filterInternational = document.getElementById('filterInternational');
    if (filterDomestic) filterDomestic.checked = false;
    if (filterInternational) filterInternational.checked = false;
    if (searchInput) searchInput.value = '';
    
    // 업로드된 Word 파일 목록 초기화
    uploadedWordFiles = [];
    updateWordFilesList();
}

// 참가자 관리 페이지의 체크박스 상태를 모달의 선택 상태에 맞춰 동기화
function syncParticipantCheckboxes() {
    // 모달에서 현재 선택된 참가자 ID 가져오기
    const selectedCheckboxes = document.querySelectorAll('.recipient-checkbox[data-participant-id]:checked');
    const currentlySelectedIds = new Set();
    selectedCheckboxes.forEach(cb => {
        const pid = cb.getAttribute('data-participant-id');
        if (pid) currentlySelectedIds.add(pid);
    });
    
    // 참가자 관리 페이지의 체크박스 업데이트
    const participantCheckboxes = document.querySelectorAll('input[name="selected_participants"]');
    participantCheckboxes.forEach(checkbox => {
        const participantId = checkbox.value;
        // 모달에서 선택된 참가자만 체크, 나머지는 체크 해제
        checkbox.checked = currentlySelectedIds.has(participantId);
    });
    
    // 전체 선택 체크박스 상태 업데이트
    const selectAllCheckbox = document.getElementById('select-all');
    if (selectAllCheckbox) {
        const allChecked = participantCheckboxes.length > 0 && 
                          Array.from(participantCheckboxes).every(cb => cb.checked);
        const someChecked = Array.from(participantCheckboxes).some(cb => cb.checked);
        selectAllCheckbox.checked = allChecked;
        selectAllCheckbox.indeterminate = someChecked && !allChecked;
    }
}

// 수신자 데이터 저장 (검색 필터링용)
let allRecipientsData = [];

// 참가자 관리 페이지에서 모달을 열 때 초기 선택된 참가자 ID 저장
let initialSelectedParticipantIds = [];

// 선택된 수신자 ID를 추적하는 전역 Set
let globalSelectedRecipientIds = new Set();

function populateEmailRecipients() {
    const recipientsList = document.getElementById('emailRecipientsList');
    if (!recipientsList) return;
    
    recipientsList.innerHTML = '';
    
    // 모든 좌장과 연자 수집
    const recipients = new Map(); // email을 키로 사용하여 중복 제거
    
    if (typeof sessions === 'undefined' || !sessions) {
        console.error('세션 데이터를 찾을 수 없습니다.');
        return;
    }
    
    sessions.forEach(session => {
        // 세션 정보 추출
        const sessionInfo = {
            date: session.date || '',
            session_type: session.sessionType || '',
            language: session.language || '',
            session_abbreviation: session.sessionAbbreviation || session.displayAbbreviation || '',
            session_title: session.title || '',
            venue: session.venue || '',
            session_time: session.startTime && session.endTime ? `${session.startTime}-${session.endTime}` : '',
            session_start_time: session.startTime || '',
            session_end_time: session.endTime || ''
        };
        
        // 좌장 수집
        if (session.chairs && session.chairs.length > 0) {
            session.chairs.forEach(chair => {
                const chairId = chair.id || chair.participantId;
                const chairInfo = typeof getParticipantInfo === 'function' ? getParticipantInfo(chairId) : null;
                if (chairInfo && chairInfo.email) {
                    if (!recipients.has(chairInfo.email)) {
                        recipients.set(chairInfo.email, {
                            email: chairInfo.email,
                            name: chairInfo.name_kor || chairInfo.name_eng || chairInfo.name || '',
                            type: 'chair',
                            participantId: chairInfo.id,
                            country: chairInfo.country || '',
                            country_code: chairInfo.country_code || '',
                            sessions: [] // 여러 세션 정보 저장
                        });
                    }
                    // 세션 정보 추가
                    const recipient = recipients.get(chairInfo.email);
                    recipient.sessions.push(sessionInfo);
                }
            });
        } else if (session.chairId) {
            const chairInfo = typeof getParticipantInfo === 'function' ? getParticipantInfo(session.chairId) : null;
            if (chairInfo && chairInfo.email) {
                if (!recipients.has(chairInfo.email)) {
                    recipients.set(chairInfo.email, {
                        email: chairInfo.email,
                        name: chairInfo.name_kor || chairInfo.name_eng || chairInfo.name || '',
                        type: 'chair',
                        participantId: chairInfo.id,
                        country: chairInfo.country || '',
                        country_code: chairInfo.country_code || '',
                        sessions: []
                    });
                }
                // 세션 정보 추가
                const recipient = recipients.get(chairInfo.email);
                recipient.sessions.push(sessionInfo);
            }
        }
        
        // 연자 수집
        if (session.speakers && session.speakers.length > 0) {
            session.speakers.forEach(speaker => {
                const speakerId = speaker.participantId || speaker.id;
                if (!speakerId) {
                    console.warn('⚠️ Speaker without participantId found:', speaker);
                    return;
                }
                
                // participantId를 숫자로 변환 시도 (타입 불일치 문제 해결)
                const numericSpeakerId = typeof speakerId === 'string' ? parseInt(speakerId, 10) : speakerId;
                const speakerInfo = typeof getParticipantInfo === 'function' ? getParticipantInfo(numericSpeakerId) : null;
                
                // getParticipantInfo가 실패하면 직접 participants 배열에서 찾기 시도
                let finalSpeakerInfo = speakerInfo;
                if (!finalSpeakerInfo && typeof participants !== 'undefined' && participants) {
                    // ID로 찾기 시도 (타입 변환 포함)
                    finalSpeakerInfo = participants.find(p => p.id == numericSpeakerId || p.id == speakerId);
                    if (finalSpeakerInfo) {
                        console.log(`✅ Found speaker by direct ID search: ID ${numericSpeakerId}, name: ${finalSpeakerInfo.name}`);
                    } else if (speaker.name) {
                        // ID로 찾지 못하면 이름으로 찾기 시도
                        finalSpeakerInfo = participants.find(p => 
                            p.name === speaker.name || 
                            p.name_kor === speaker.name || 
                            p.name_eng === speaker.name
                        );
                        if (finalSpeakerInfo) {
                            console.log(`✅ Found speaker by name: ${speaker.name} (ID: ${finalSpeakerInfo.id})`);
                        }
                    }
                }
                
                if (!finalSpeakerInfo) {
                    console.warn(`⚠️ Participant info not found for speaker ID: ${speakerId}, name: ${speaker.name || 'N/A'}, speaker data:`, speaker);
                    return;
                }
                
                if (finalSpeakerInfo && finalSpeakerInfo.email) {
                    // 발표자별 세션 정보 (발표 주제, 발표 시간 포함)
                    const speakerSessionInfo = {
                        ...sessionInfo,
                        lecture_title: speaker.topic || '',
                        lecture_time: speaker.startTime && speaker.endTime ? `${speaker.startTime}-${speaker.endTime}` : '',
                        lecture_start_time: speaker.startTime || '',
                        lecture_end_time: speaker.endTime || ''
                    };
                    
                    if (!recipients.has(finalSpeakerInfo.email)) {
                        recipients.set(finalSpeakerInfo.email, {
                            email: finalSpeakerInfo.email,
                            name: finalSpeakerInfo.name_kor || finalSpeakerInfo.name_eng || finalSpeakerInfo.name || '',
                            type: 'speaker',
                            participantId: finalSpeakerInfo.id,
                            country: finalSpeakerInfo.country || '',
                            country_code: finalSpeakerInfo.country_code || '',
                            sessions: []
                        });
                    }
                    // 세션 정보 추가
                    const recipient = recipients.get(finalSpeakerInfo.email);
                    recipient.sessions.push(speakerSessionInfo);
                } else {
                    console.warn(`⚠️ Speaker info found but no email: ID ${speakerId}, name: ${finalSpeakerInfo ? finalSpeakerInfo.name : 'N/A'}`);
                }
            });
        }
    });
    
    // 수신자 데이터 저장 (검색 필터링용)
    allRecipientsData = Array.from(recipients.values());
    
    // 전역 선택된 ID Set 초기화 (모달을 새로 열 때)
    globalSelectedRecipientIds = new Set();
    
    // 수신자 목록 렌더링 (초기에는 모두 체크 해제 상태)
    renderRecipientsList(allRecipientsData);
    
    // 전체 선택 체크박스 이벤트
    const selectAllChairs = document.getElementById('selectAllChairs');
    const selectAllSpeakers = document.getElementById('selectAllSpeakers');
    const filterDomestic = document.getElementById('filterDomestic');
    const filterInternational = document.getElementById('filterInternational');
    
    if (selectAllChairs) {
        selectAllChairs.onchange = function() {
            // 상위 체크박스 변경 시 자동 선택/해제 로직 적용
            const searchInput = document.getElementById('recipientSearchInput');
            refreshRecipientsList(searchInput ? searchInput.value : '', true); // true = 자동 선택/해제 로직 적용
        };
    }
    
    if (selectAllSpeakers) {
        selectAllSpeakers.onchange = function() {
            // 상위 체크박스 변경 시 자동 선택/해제 로직 적용
            const searchInput = document.getElementById('recipientSearchInput');
            refreshRecipientsList(searchInput ? searchInput.value : '', true); // true = 자동 선택/해제 로직 적용
        };
    }
    
    // 국가 필터 체크박스 이벤트
    if (filterDomestic) {
        filterDomestic.onchange = function() {
            if (this.checked && filterInternational) {
                filterInternational.checked = false; // 상호 배타적
            }
            // 상위 체크박스 변경 시 자동 선택/해제 로직 적용
            const searchInput = document.getElementById('recipientSearchInput');
            refreshRecipientsList(searchInput ? searchInput.value : '', true); // true = 자동 선택/해제 로직 적용
        };
    }
    
    if (filterInternational) {
        filterInternational.onchange = function() {
            if (this.checked && filterDomestic) {
                filterDomestic.checked = false; // 상호 배타적
            }
            // 상위 체크박스 변경 시 자동 선택/해제 로직 적용
            const searchInput = document.getElementById('recipientSearchInput');
            refreshRecipientsList(searchInput ? searchInput.value : '', true); // true = 자동 선택/해제 로직 적용
        };
    }
    
    // 개별 체크박스 이벤트
    setTimeout(() => {
        document.querySelectorAll('.recipient-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                updateSelectedRecipientsCount();
                // 체크 해제 시 검색어 상태에 따라 필터링 다시 수행
                const searchInput = document.getElementById('recipientSearchInput');
                if (searchInput) {
                    filterRecipients(searchInput.value);
                }
            });
        });
        updateSelectedRecipientsCount();
    }, 100);
    
    // 검색 입력 필드 이벤트 리스너 추가
    const searchInput = document.getElementById('recipientSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            filterRecipients(e.target.value);
        });
    }
}

// 수신자 목록 렌더링 함수
function renderRecipientsList(recipientsArray, selectedIds = null) {
    const recipientsList = document.getElementById('emailRecipientsList');
    if (!recipientsList) return;
    
    recipientsList.innerHTML = '';
    
    if (recipientsArray.length === 0) {
        recipientsList.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">검색 결과가 없습니다.</div>';
        return;
    }
    
    // 선택된 ID Set 생성 (파라미터로 전달받거나 전역 Set 또는 현재 체크된 체크박스에서)
    // 항상 전역 Set과 병합하여 사용 (선택 상태 유지)
    let selectedIdSet = new Set(globalSelectedRecipientIds);
    if (selectedIds) {
        // 파라미터로 전달된 selectedIds와 병합
        selectedIds.forEach(id => selectedIdSet.add(String(id)));
    } else {
        // 파라미터가 없으면 현재 DOM의 체크박스에서 읽어옴
        const checkedBoxes = document.querySelectorAll('.recipient-checkbox[data-participant-id]:checked');
        checkedBoxes.forEach(cb => {
            const pid = cb.getAttribute('data-participant-id');
            if (pid) selectedIdSet.add(String(pid));
        });
    }
    // 전역 Set 업데이트 (렌더링 시점의 선택 상태 반영)
    globalSelectedRecipientIds = new Set(selectedIdSet);
    
    recipientsArray.forEach((recipient, index) => {
        const isChecked = selectedIdSet.has(String(recipient.participantId));
        
        // 국가 정보 추출 및 표시용 텍스트 생성
        const countryCode = (recipient.country_code || '').toUpperCase();
        const country = (recipient.country || '').trim();
        let countryDisplay = '';
        let isKorea = false;
        
        if (countryCode === 'KR' || countryCode === 'KOR' || 
            country.toUpperCase() === 'KOREA' || country.toUpperCase() === 'KOR' || 
            country.toUpperCase() === 'SOUTH KOREA' || country === '대한민국') {
            countryDisplay = 'KOR';
            isKorea = true;
        } else if (countryCode) {
            countryDisplay = countryCode;
        } else if (country) {
            countryDisplay = country.length > 3 ? country.substring(0, 3).toUpperCase() : country.toUpperCase();
        }
        
        const recipientDiv = document.createElement('div');
        recipientDiv.className = 'recipient-item';
        recipientDiv.style.cssText = 'display: flex; align-items: center; gap: 10px; padding: 8px; border-bottom: 1px solid #eee;';
        
        // 역할 태그
        const roleTag = `
            <span style="font-size: 11px; padding: 2px 8px; background-color: ${recipient.type === 'chair' ? '#e3f2fd' : '#f3e5f5'}; color: ${recipient.type === 'chair' ? '#1976d2' : '#7b1fa2'}; border-radius: 12px;">
                ${recipient.type === 'chair' ? '좌장' : '연자'}
            </span>
        `;
        
        // 국가 태그 (국가 정보가 있는 경우에만 표시)
        const countryTag = countryDisplay ? `
            <span style="font-size: 11px; padding: 2px 8px; background-color: ${isKorea ? '#fff3e0' : '#e8f5e9'}; color: ${isKorea ? '#e65100' : '#2e7d32'}; border-radius: 12px;">
                ${countryDisplay}
            </span>
        ` : '';
        
        recipientDiv.innerHTML = `
            <input type="checkbox" class="recipient-checkbox" data-email="${recipient.email}" data-participant-id="${recipient.participantId}" data-type="${recipient.type}" ${isChecked ? 'checked' : ''} style="width: 16px; height: 16px;">
            <span style="flex: 1; font-size: 14px;">${recipient.name}</span>
            <span style="font-size: 12px; color: #666;">${recipient.email}</span>
            ${roleTag}
            ${countryTag}
        `;
        recipientsList.appendChild(recipientDiv);
    });
    
    // 체크박스 이벤트 리스너 추가
    setTimeout(() => {
        document.querySelectorAll('.recipient-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const participantId = this.getAttribute('data-participant-id');
                // 전역 Set 업데이트
                if (this.checked) {
                    globalSelectedRecipientIds.add(participantId);
                } else {
                    globalSelectedRecipientIds.delete(participantId);
                }
                updateSelectedRecipientsCount();
                // 개별 체크박스 클릭 시에는 상위 체크박스 로직을 적용하지 않고
                // 단순히 현재 상태를 반영해서 리스트만 다시 렌더링
                const searchInput = document.getElementById('recipientSearchInput');
                const searchTerm = searchInput ? searchInput.value : '';
                refreshRecipientsList(searchTerm, false); // false = 자동 선택/해제 로직 적용 안 함
            });
        });
        updateSelectedRecipientsCount();
    }, 100);
}

// 수신자 필터링 함수 (검색어 입력 시 호출)
function filterRecipients(searchTerm) {
    // 검색어 입력 시에는 자동 선택/해제 로직을 적용하지 않음 (선택 상태 유지)
    refreshRecipientsList(searchTerm, false); // false = 자동 선택/해제 로직 적용 안 함
}

// 수신자 리스트 새로고침 함수
function refreshRecipientsList(searchTerm, applyAutoSelection = true) {
    const recipientsList = document.getElementById('emailRecipientsList');
    if (!recipientsList) return;
    
    // 선택된 수신자 ID Set 생성 (전역 Set을 우선 사용)
    // 전역 Set이 있으면 그것을 사용하고, 없으면 현재 DOM의 체크박스 상태를 읽어옴
    let selectedIds = new Set(globalSelectedRecipientIds);
    
    // 현재 DOM에 있는 체크박스 상태도 확인하여 전역 Set과 동기화
    // (검색어가 있을 때는 일부 참가자만 표시되므로, 전역 Set을 우선적으로 사용)
    const checkedBoxes = document.querySelectorAll('.recipient-checkbox[data-participant-id]:checked');
    checkedBoxes.forEach(cb => {
        const pid = cb.getAttribute('data-participant-id');
        if (pid) {
            selectedIds.add(String(pid)); // 문자열로 통일
        }
    });
    
    // 전역 Set 업데이트 (현재 DOM 상태 반영, 하지만 전역 Set이 우선)
    // 전역 Set과 현재 DOM 상태를 병합
    globalSelectedRecipientIds = new Set([...globalSelectedRecipientIds, ...selectedIds]);
    
    // "모든 좌장" 및 "모든 연자" 체크박스 상태 확인
    const selectAllChairs = document.getElementById('selectAllChairs');
    const selectAllSpeakers = document.getElementById('selectAllSpeakers');
    const chairsOnly = selectAllChairs && selectAllChairs.checked;
    const speakersOnly = selectAllSpeakers && selectAllSpeakers.checked;
    
    // 국가 필터 체크박스 상태 확인
    const filterDomestic = document.getElementById('filterDomestic');
    const filterInternational = document.getElementById('filterInternational');
    const domesticOnly = filterDomestic && filterDomestic.checked;
    const internationalOnly = filterInternational && filterInternational.checked;
    
    // 역할 필터링: 좌장만 또는 연자만 선택된 경우
    let roleFiltered = allRecipientsData;
    if (chairsOnly && !speakersOnly) {
        // 좌장만 표시
        roleFiltered = allRecipientsData.filter(recipient => recipient.type === 'chair');
    } else if (speakersOnly && !chairsOnly) {
        // 연자만 표시
        roleFiltered = allRecipientsData.filter(recipient => recipient.type === 'speaker');
    } else if (chairsOnly && speakersOnly) {
        // 둘 다 선택된 경우는 모든 명단 표시 (역할 필터 없음)
        roleFiltered = allRecipientsData;
    }
    
    // 국가 필터링: 국내만 또는 국외만 선택된 경우
    let countryFiltered = roleFiltered;
    if (domesticOnly && !internationalOnly) {
        // 국내만 표시 (KOR 또는 KR인 경우)
        countryFiltered = roleFiltered.filter(recipient => {
            const countryCode = (recipient.country_code || '').toUpperCase();
            const country = (recipient.country || '').toUpperCase();
            return countryCode === 'KR' || countryCode === 'KOR' || 
                   country === 'KOREA' || country === 'KOR' || 
                   country === 'SOUTH KOREA' || country === '대한민국';
        });
    } else if (internationalOnly && !domesticOnly) {
        // 국외만 표시 (KOR/KR이 아닌 경우)
        countryFiltered = roleFiltered.filter(recipient => {
            const countryCode = (recipient.country_code || '').toUpperCase();
            const country = (recipient.country || '').toUpperCase();
            const isKorea = countryCode === 'KR' || countryCode === 'KOR' || 
                          country === 'KOREA' || country === 'KOR' || 
                          country === 'SOUTH KOREA' || country === '대한민국';
            return !isKorea && (countryCode || country); // 국가 정보가 있고 한국이 아닌 경우
        });
    }
    
    roleFiltered = countryFiltered; // 국가 필터링 결과를 roleFiltered에 할당
    
    // 자동 선택/해제 로직 적용 여부 확인
    if (applyAutoSelection) {
        // 역할 필터와 국가 필터에 따라 자동 선택/해제 처리
        // 먼저 역할 필터 처리
        if (chairsOnly && !speakersOnly) {
        // 좌장만 선택된 경우: 필터링된 좌장들을 자동으로 선택/해제
        const filteredChairs = roleFiltered.filter(recipient => recipient.type === 'chair');
        if (selectAllChairs && selectAllChairs.checked) {
            filteredChairs.forEach(recipient => {
                selectedIds.add(String(recipient.participantId));
            });
        } else {
            // 체크 해제된 경우: 필터링된 좌장들을 선택 해제
            filteredChairs.forEach(recipient => {
                selectedIds.delete(String(recipient.participantId));
            });
        }
    } else if (speakersOnly && !chairsOnly) {
        // 연자만 선택된 경우: 필터링된 연자들을 자동으로 선택/해제
        const filteredSpeakers = roleFiltered.filter(recipient => recipient.type === 'speaker');
        if (selectAllSpeakers && selectAllSpeakers.checked) {
            filteredSpeakers.forEach(recipient => {
                selectedIds.add(String(recipient.participantId));
            });
        } else {
            // 체크 해제된 경우: 필터링된 연자들을 선택 해제
            filteredSpeakers.forEach(recipient => {
                selectedIds.delete(String(recipient.participantId));
            });
        }
    } else if (chairsOnly && speakersOnly) {
        // 둘 다 선택된 경우: 필터링된 모든 참가자를 자동으로 선택
        roleFiltered.forEach(recipient => {
            selectedIds.add(String(recipient.participantId));
        });
    } else if (!chairsOnly && !speakersOnly) {
        // 둘 다 체크 해제된 경우: 이전에 역할 필터로 자동 선택된 참가자들을 해제
        // 현재 표시된 roleFiltered에 있는 모든 참가자를 해제
        // (하지만 국가 필터가 있으면 국가 필터로 선택된 참가자는 유지해야 함)
        if (!domesticOnly && !internationalOnly) {
            // 국가 필터도 없으면 모든 roleFiltered를 해제
            roleFiltered.forEach(recipient => {
                selectedIds.delete(String(recipient.participantId));
            });
        } else {
            // 국가 필터가 있으면, 역할 필터로만 선택된 참가자들을 해제
            // 전체 allRecipientsData에서 역할 필터로만 선택된 참가자를 찾아서 해제
            allRecipientsData.forEach(recipient => {
                // 국가 필터에 맞는지 확인
                const countryCode = (recipient.country_code || '').toUpperCase();
                const country = (recipient.country || '').toUpperCase();
                const isKorea = countryCode === 'KR' || countryCode === 'KOR' || 
                              country === 'KOREA' || country === 'KOR' || 
                              country === 'SOUTH KOREA' || country === '대한민국';
                
                const matchesCountryFilter = (domesticOnly && isKorea) || 
                                           (internationalOnly && !isKorea && (countryCode || country));
                
                // 국가 필터에 맞지 않는 참가자는 역할 필터로만 선택된 것이므로 해제
                if (!matchesCountryFilter) {
                    selectedIds.delete(String(recipient.participantId));
                }
            });
        }
    }
    
    // 국가 필터 처리
    if (domesticOnly || internationalOnly) {
        // 국가 필터가 체크된 경우: 필터링된 모든 참가자를 자동으로 선택
        // (역할 필터가 없거나, 역할 필터와 함께 적용)
        roleFiltered.forEach(recipient => {
            selectedIds.add(String(recipient.participantId));
        });
    } else if (!domesticOnly && !internationalOnly) {
        // 국가 필터가 둘 다 체크 해제된 경우: 이전에 국가 필터로 자동 선택된 참가자들을 해제
        // 전체 allRecipientsData에서 국가 필터로만 선택된 참가자를 찾아서 해제
        allRecipientsData.forEach(recipient => {
            const countryCode = (recipient.country_code || '').toUpperCase();
            const country = (recipient.country || '').toUpperCase();
            const isKorea = countryCode === 'KR' || countryCode === 'KOR' || 
                          country === 'KOREA' || country === 'KOR' || 
                          country === 'SOUTH KOREA' || country === '대한민국';
            
            // 역할 필터에 맞는 참가자인지 확인
            const matchesRoleFilter = (chairsOnly && recipient.type === 'chair') ||
                                     (speakersOnly && recipient.type === 'speaker') ||
                                     (chairsOnly && speakersOnly);
            
            if (!matchesRoleFilter) {
                // 역할 필터에 맞지 않는 참가자는 국가 필터로만 선택된 것이므로 해제
                selectedIds.delete(String(recipient.participantId));
            }
        });
    }
    // 자동 선택/해제 로직 적용 후 전역 Set 업데이트
    globalSelectedRecipientIds = new Set(selectedIds);
    } // applyAutoSelection이 false이면 자동 선택/해제 로직을 건너뛰고 현재 체크박스 상태 유지
    
    if (!searchTerm || searchTerm.trim() === '') {
        // 검색어가 없으면 역할 필터링된 모든 명단 표시
        if (applyAutoSelection) {
            // 상위 체크박스 변경 시: 체크된 사람을 맨 위에
            const selectedRecipients = roleFiltered.filter(recipient => {
                return selectedIds.has(String(recipient.participantId));
            });
            const unselectedRecipients = roleFiltered.filter(recipient => {
                return !selectedIds.has(String(recipient.participantId));
            });
            // 체크된 사람을 맨 위에, 나머지는 아래에
            const displayList = [...selectedRecipients, ...unselectedRecipients];
            renderRecipientsList(displayList, selectedIds);
        } else {
            // 개별 체크박스 클릭 시: 원래 순서 유지
            renderRecipientsList(roleFiltered, selectedIds);
        }
        return;
    }
    
    const searchLower = searchTerm.toLowerCase().trim();
    const filtered = roleFiltered.filter(recipient => {
        const nameMatch = (recipient.name || '').toLowerCase().includes(searchLower);
        const emailMatch = (recipient.email || '').toLowerCase().includes(searchLower);
        return nameMatch || emailMatch;
    });
    
    if (applyAutoSelection) {
        // 상위 체크박스 변경 시: 필터링된 결과에 기존에 선택된 수신자들도 추가 (중복 제거)
        const filteredIds = new Set(filtered.map(r => String(r.participantId)));
        const selectedButNotInFilter = roleFiltered.filter(recipient => {
            return selectedIds.has(String(recipient.participantId)) && !filteredIds.has(String(recipient.participantId));
        });
        
        // 필터링된 결과 + 기존 선택된 수신자들 결합 (체크된 사람을 맨 위에)
        const displayList = [...selectedButNotInFilter, ...filtered];
        renderRecipientsList(displayList, selectedIds);
    } else {
        // 개별 체크박스 클릭 시: 검색 결과만 원래 순서대로 표시
        renderRecipientsList(filtered, selectedIds);
    }
}

function updateSelectedRecipientsCount() {
    const selected = document.querySelectorAll('.recipient-checkbox:checked').length;
    const countElement = document.getElementById('selectedRecipientsCount');
    if (countElement) {
        countElement.textContent = selected;
    }
}

// 리치 텍스트 에디터 포맷 함수들
function formatText(command) {
    const editor = document.getElementById('emailEditor');
    if (!editor) return;
    
    // 에디터에 포커스가 없으면 포커스 설정
    if (document.activeElement !== editor) {
        editor.focus();
    }
    
    // execCommand 실행
    try {
        document.execCommand(command, false, null);
    } catch (error) {
        console.error('포맷팅 오류:', error);
    }
}

// 현재 선택된 폰트 업데이트 함수
function updateFontFamilyDisplay() {
    const editor = document.getElementById('emailEditor');
    const fontSelect = document.getElementById('fontFamilySelect');
    
    if (!editor || !fontSelect) return;
    
    // 현재 선택된 텍스트의 폰트 가져오기
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const element = range.commonAncestorContainer.nodeType === 3 
            ? range.commonAncestorContainer.parentElement 
            : range.commonAncestorContainer;
        
        if (element) {
            const computedStyle = window.getComputedStyle(element);
            const fontFamily = computedStyle.fontFamily;
            
            // 폰트 이름 추출 (첫 번째 폰트)
            const fontName = fontFamily.split(',')[0].replace(/['"]/g, '').trim();
            
            // 드롭다운에서 해당 폰트 찾기
            for (let i = 0; i < fontSelect.options.length; i++) {
                if (fontSelect.options[i].value === fontName || 
                    fontSelect.options[i].text.toLowerCase() === fontName.toLowerCase()) {
                    fontSelect.value = fontSelect.options[i].value;
                    break;
                }
            }
        }
    }
}

// 에디터에서 선택 변경 시 폰트 업데이트
document.addEventListener('DOMContentLoaded', function() {
    const editor = document.getElementById('emailEditor');
    if (editor) {
        editor.addEventListener('mouseup', updateFontFamilyDisplay);
        editor.addEventListener('keyup', updateFontFamilyDisplay);
    }
});

// 글자 크기 적용 함수 (Gmail 스타일: Small, Normal, Large, Huge)
function applyFontSize(size) {
    const editor = document.getElementById('emailEditor');
    if (!editor) return;
    
    if (!size) return;
    
    // 에디터에 포커스 설정
    editor.focus();
    
    // Gmail 스타일 크기 매핑
    const fontSizeMap = {
        'small': '11px',
        'normal': '13px',
        'large': '18px',
        'huge': '24px'
    };
    
    const fontSizeValue = fontSizeMap[size];
    if (!fontSizeValue) return;
    
    try {
        // 선택된 텍스트가 있으면 해당 텍스트에만 적용
        const selection = window.getSelection();
        if (selection.rangeCount > 0 && selection.toString().trim()) {
            const range = selection.getRangeAt(0);
            const span = document.createElement('span');
            span.style.fontSize = fontSizeValue;
            
            try {
                range.surroundContents(span);
            } catch (e) {
                const contents = range.extractContents();
                span.appendChild(contents);
                range.insertNode(span);
            }
            
            selection.removeAllRanges();
        } else {
            // 선택된 텍스트가 없으면 다음 입력에 적용
            document.execCommand('fontSize', false, '7'); // 임시로 큰 값 사용
            setTimeout(() => {
                const fontTags = editor.querySelectorAll('font[size="7"]');
                fontTags.forEach(font => {
                    const span = document.createElement('span');
                    span.style.fontSize = fontSizeValue;
                    span.innerHTML = font.innerHTML;
                    font.parentNode.replaceChild(span, font);
                });
            }, 10);
        }
    } catch (error) {
        console.error('글자 크기 적용 오류:', error);
    }
}

// 폰트 크기 팔레트 표시 함수
function showFontSizePicker() {
    const editor = document.getElementById('emailEditor');
    if (!editor) return;
    
    // 현재 선택된 범위 저장
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        savedRange = selection.getRangeAt(0).cloneRange();
    } else {
        savedRange = null;
    }
    
    let fontSizePalette = document.getElementById('emailFontSizePalette');
    
    if (!fontSizePalette) {
        fontSizePalette = document.createElement('div');
        fontSizePalette.id = 'emailFontSizePalette';
        fontSizePalette.style.cssText = `
            position: fixed;
            background: white;
            border: 1px solid #dadce0;
            border-radius: 4px;
            padding: 8px 0;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            z-index: 10000;
            display: none;
            min-width: 120px;
        `;
        
        const sizes = [
            { label: 'Small', value: 'small', fontSize: '11px' },
            { label: 'Normal', value: 'normal', fontSize: '13px' },
            { label: 'Large', value: 'large', fontSize: '18px' },
            { label: 'Huge', value: 'huge', fontSize: '24px' }
        ];
        
        sizes.forEach(size => {
            const option = document.createElement('div');
            option.style.cssText = `
                padding: 8px 16px;
                font-size: ${size.fontSize};
                color: #202124;
                cursor: pointer;
                transition: background-color 0.1s;
            `;
            option.textContent = size.label;
            
            option.addEventListener('mouseenter', function() {
                this.style.backgroundColor = '#f1f3f4';
            });
            
            option.addEventListener('mouseleave', function() {
                this.style.backgroundColor = 'transparent';
            });
            
            option.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                editor.focus();
                
                if (savedRange) {
                    const selection = window.getSelection();
                    selection.removeAllRanges();
                    try {
                        selection.addRange(savedRange);
                    } catch (err) {
                        console.log('저장된 범위 복원 실패:', err);
                    }
                }
                
                applyFontSize(size.value);
                fontSizePalette.style.display = 'none';
                savedRange = null;
            });
            
            fontSizePalette.appendChild(option);
        });
        
        document.body.appendChild(fontSizePalette);
    }
    
    // 팔레트 위치 설정
    const toolbar = document.getElementById('emailEditorToolbar');
    if (toolbar) {
        const rect = toolbar.getBoundingClientRect();
        fontSizePalette.style.top = (rect.bottom + window.scrollY + 5) + 'px';
        fontSizePalette.style.left = (rect.left + window.scrollX + 10) + 'px';
    }
    
    // 팔레트 표시/숨김 토글
    if (fontSizePalette.style.display === 'none' || !fontSizePalette.style.display) {
        fontSizePalette.style.display = 'block';
        
        const closePalette = (e) => {
            if (!fontSizePalette.contains(e.target) && !e.target.closest('.toolbar-btn')) {
                fontSizePalette.style.display = 'none';
                document.removeEventListener('click', closePalette);
            }
        };
        
        setTimeout(() => {
            document.addEventListener('click', closePalette);
        }, 100);
    } else {
        fontSizePalette.style.display = 'none';
    }
}

// 폰트 적용 함수
function applyFontFamily(fontFamily) {
    const editor = document.getElementById('emailEditor');
    if (!editor) return;
    
    if (!fontFamily) return;
    
    // 에디터에 포커스 설정
    editor.focus();
    
    try {
        document.execCommand('fontName', false, fontFamily);
    } catch (error) {
        console.error('폰트 적용 오류:', error);
    }
}

// 전역 변수로 현재 색상 팔레트 명령어 저장
let currentColorCommand = 'foreColor';
// 선택된 범위 저장 (색상 팔레트 클릭 시 선택이 사라지는 것을 방지)
let savedRange = null;

// 선택된 텍스트에 색상 적용 함수
function applyColorToSelection(color, command) {
    const editor = document.getElementById('emailEditor');
    if (!editor) {
        console.error('에디터를 찾을 수 없습니다.');
        return;
    }
    
    // 에디터에 포커스 설정
    editor.focus();
    
    const selection = window.getSelection();
    
    // 저장된 범위가 있으면 사용
    let range = null;
    if (savedRange) {
        try {
            selection.removeAllRanges();
            selection.addRange(savedRange);
            range = savedRange;
            console.log('저장된 범위 복원 성공');
        } catch (e) {
            console.log('저장된 범위 복원 실패, 현재 선택 사용:', e);
            if (selection.rangeCount > 0) {
                range = selection.getRangeAt(0);
            }
        }
    } else if (selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
    }
    
    // 선택된 텍스트가 있는지 확인
    if (!range || selection.toString().trim() === '') {
        // 선택된 텍스트가 없으면 execCommand 사용 (커서 위치에 색상 설정)
        console.log('선택된 텍스트 없음, 커서 위치에 색상 설정');
        try {
            const success = document.execCommand(command, false, color);
            console.log('execCommand 결과:', success);
        } catch (e) {
            console.error('색상 적용 실패 (execCommand):', e);
        }
        return;
    }
    
    // 에디터 내부의 선택인지 확인
    if (!editor.contains(range.commonAncestorContainer)) {
        console.warn('선택이 에디터 밖에 있습니다.');
        return;
    }
    
    console.log('선택된 텍스트:', selection.toString());
    console.log('색상 적용 시도:', color, command);
    
    try {
        // execCommand 먼저 시도 (가장 간단하고 안정적)
        const success = document.execCommand(command, false, color);
        console.log('execCommand 결과:', success);
        
        if (success) {
            // 성공하면 선택 해제
            selection.removeAllRanges();
            editor.focus();
            return;
        }
        
        // execCommand가 실패하면 수동으로 처리
        console.log('execCommand 실패, 수동 처리 시도');
        
        const selectedText = selection.toString();
        if (!selectedText) {
            return;
        }
        
        const span = document.createElement('span');
        
        if (command === 'foreColor') {
            span.style.color = color;
        } else if (command === 'backColor') {
            span.style.backgroundColor = color;
        }
        
        // 선택된 내용을 span으로 감싸기
        try {
            range.surroundContents(span);
            console.log('surroundContents 성공');
        } catch (e) {
            // surroundContents가 실패하면 extractContents 사용
            console.log('surroundContents 실패, extractContents 사용:', e);
            const contents = range.extractContents();
            span.appendChild(contents);
            range.insertNode(span);
        }
        
        // 선택 해제
        selection.removeAllRanges();
        
        // 에디터 포커스 유지
        editor.focus();
    } catch (error) {
        console.error('색상 적용 오류:', error);
        // 최종 폴백: execCommand 재시도
        try {
            editor.focus();
            document.execCommand(command, false, color);
        } catch (e) {
            console.error('최종 색상 적용 실패:', e);
        }
    }
}

function showColorPicker(event) {
    // 현재 선택된 범위 저장 (색상 팔레트 클릭 시 선택이 사라지는 것을 방지)
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        savedRange = selection.getRangeAt(0).cloneRange();
    } else {
        savedRange = null;
    }
    
    // 클릭된 버튼 찾기
    const clickedButton = event ? event.target.closest('.toolbar-btn') : null;
    
    // 색상 팔레트 모달 생성 또는 표시 (Gmail처럼 글자색과 배경색 함께 표시)
    let colorPalette = document.getElementById('emailColorPalette');
    
    if (!colorPalette) {
        // 색상 팔레트 모달 생성 (Gmail 스타일 - 작고 간결하게)
        colorPalette = document.createElement('div');
        colorPalette.id = 'emailColorPalette';
        colorPalette.style.cssText = `
            position: fixed;
            background: white;
            border: 1px solid #dadce0;
            border-radius: 4px;
            padding: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            z-index: 10000;
            display: none;
            width: 280px;
        `;
        
        // Gmail 스타일 기본 색상 팔레트 (더 작고 간결하게)
        const colors = [
            '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
            '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
            '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc',
            '#dd7e6b', '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9', '#a4c2f4', '#9fc5e8', '#b4a7d6', '#d5a6bd',
            '#cc4125', '#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6d9eeb', '#6fa8dc', '#8e7cc3', '#c27ba0',
            '#a61c00', '#cc0000', '#e69138', '#f1c232', '#6aa84f', '#45818e', '#3c78d8', '#3d85c6', '#674ea7', '#a64d79',
            '#85200c', '#990000', '#b45f06', '#bf9000', '#38761d', '#134f5c', '#1155cc', '#0b5394', '#351c75', '#741b47',
            '#5b0f00', '#660000', '#783f04', '#7f6000', '#274e13', '#0c343d', '#1c4587', '#073763', '#20124d', '#4c1130'
        ];
        
        // 색상 그리드 생성 함수
        const createColorGrid = (commandType) => {
            const grid = document.createElement('div');
            grid.style.cssText = 'display: grid; grid-template-columns: repeat(10, 1fr); gap: 1px;';
            
            colors.forEach((colorValue) => {
                const colorBox = document.createElement('div');
                colorBox.style.cssText = `
                    width: 18px;
                    height: 18px;
                    background-color: ${colorValue};
                    border: 1px solid ${colorValue === '#ffffff' ? '#dadce0' : 'transparent'};
                    border-radius: 2px;
                    cursor: pointer;
                    transition: border-color 0.1s;
                `;
                
                colorBox.addEventListener('mouseenter', function() {
                    this.style.borderColor = '#1a73e8';
                    this.style.boxShadow = '0 0 0 1px #1a73e8';
                });
                
                colorBox.addEventListener('mouseleave', function() {
                    this.style.borderColor = this.style.backgroundColor === 'rgb(255, 255, 255)' ? '#dadce0' : 'transparent';
                    this.style.boxShadow = 'none';
                });
                
                colorBox.addEventListener('mousedown', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                });
                
                colorBox.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const editor = document.getElementById('emailEditor');
                    if (editor) {
                        editor.focus();
                        
                        if (savedRange) {
                            const selection = window.getSelection();
                            selection.removeAllRanges();
                            try {
                                selection.addRange(savedRange);
                            } catch (err) {
                                console.log('저장된 범위 복원 실패:', err);
                            }
                        }
                        
                        applyColorToSelection(colorValue, commandType);
                    }
                    
                    colorPalette.style.display = 'none';
                    // 아이콘 하이라이트 제거
                    const allButtons = document.querySelectorAll('.toolbar-btn');
                    allButtons.forEach(btn => {
                        if (btn.onclick && btn.onclick.toString().includes('showColorPicker')) {
                            btn.style.backgroundColor = 'transparent';
                        }
                    });
                    savedRange = null;
                });
                
                grid.appendChild(colorBox);
            });
            
            return grid;
        };
        
        // Background color 섹션
        const bgSection = document.createElement('div');
        bgSection.style.cssText = 'margin-bottom: 12px;';
        const bgTitle = document.createElement('div');
        bgTitle.style.cssText = 'font-size: 12px; color: #202124; margin-bottom: 6px; font-weight: 500;';
        bgTitle.textContent = 'Background color';
        bgSection.appendChild(bgTitle);
        bgSection.appendChild(createColorGrid('backColor'));
        
        // Text color 섹션
        const textSection = document.createElement('div');
        const textTitle = document.createElement('div');
        textTitle.style.cssText = 'font-size: 12px; color: #202124; margin-bottom: 6px; font-weight: 500;';
        textTitle.textContent = 'Text color';
        textSection.appendChild(textTitle);
        textSection.appendChild(createColorGrid('foreColor'));
        
        // 초기화 버튼 (각 섹션별로)
        const createResetButton = (commandType, label) => {
            const resetBtn = document.createElement('div');
            resetBtn.style.cssText = `
                margin-top: 6px;
                padding: 4px 8px;
                text-align: center;
                font-size: 11px;
                color: #1a73e8;
                cursor: pointer;
                border-top: 1px solid #dadce0;
                padding-top: 6px;
            `;
            resetBtn.textContent = label;
            resetBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const editor = document.getElementById('emailEditor');
                if (editor) {
                    editor.focus();
                    
                    if (savedRange) {
                        const selection = window.getSelection();
                        selection.removeAllRanges();
                        try {
                            selection.addRange(savedRange);
                        } catch (err) {
                            console.log('저장된 범위 복원 실패:', err);
                        }
                    }
                    
                    if (commandType === 'foreColor') {
                        try {
                            document.execCommand('removeFormat', false, null);
                        } catch (e) {
                            console.error('색상 제거 실패:', e);
                        }
                    } else if (commandType === 'backColor') {
                        try {
                            document.execCommand('backColor', false, 'transparent');
                        } catch (e) {
                            console.error('배경 색상 제거 실패:', e);
                        }
                    }
                }
                
                colorPalette.style.display = 'none';
                // 아이콘 하이라이트 제거
                const allButtons = document.querySelectorAll('.toolbar-btn');
                allButtons.forEach(btn => {
                    if (btn.onclick && btn.onclick.toString().includes('showColorPicker')) {
                        btn.style.backgroundColor = 'transparent';
                    }
                });
                savedRange = null;
            });
            return resetBtn;
        };
        
        bgSection.appendChild(createResetButton('backColor', '기본값'));
        textSection.appendChild(createResetButton('foreColor', '기본값'));
        
        colorPalette.appendChild(bgSection);
        colorPalette.appendChild(textSection);
        document.body.appendChild(colorPalette);
    }
    
    // 색상 팔레트 위치 설정 (버튼 위에 바로 표시)
    const isVisible = colorPalette.style.display === 'block';
    
    if (clickedButton) {
        const buttonRect = clickedButton.getBoundingClientRect();
        // 팔레트 높이 계산 (표시 전에는 offsetHeight가 0일 수 있음)
        const paletteHeight = colorPalette.offsetHeight || 280; // 대략적인 높이
        colorPalette.style.top = (buttonRect.top + window.scrollY - paletteHeight - 5) + 'px';
        colorPalette.style.left = (buttonRect.left + window.scrollX) + 'px';
        
        // 아이콘 하이라이트 (연하게 표시)
        if (!isVisible) {
            clickedButton.style.backgroundColor = '#e8f0fe';
        }
    } else {
        const toolbar = document.getElementById('emailEditorToolbar');
        if (toolbar) {
            const rect = toolbar.getBoundingClientRect();
            colorPalette.style.top = (rect.bottom + window.scrollY + 5) + 'px';
            colorPalette.style.left = (rect.left + window.scrollX + 10) + 'px';
        }
    }
    
    // 팔레트 표시/숨김 토글
    if (!isVisible) {
        colorPalette.style.display = 'block';
        
        // 다른 곳 클릭 시 팔레트 닫기
        const closePalette = (e) => {
            if (!colorPalette.contains(e.target) && !e.target.closest('.toolbar-btn')) {
                colorPalette.style.display = 'none';
                // 아이콘 하이라이트 제거
                const allButtons = document.querySelectorAll('.toolbar-btn');
                allButtons.forEach(btn => {
                    if (btn.onclick && btn.onclick.toString().includes('showColorPicker')) {
                        btn.style.backgroundColor = 'transparent';
                    }
                });
                document.removeEventListener('click', closePalette);
            }
        };
        
        setTimeout(() => {
            document.addEventListener('click', closePalette);
        }, 100);
    } else {
        colorPalette.style.display = 'none';
        // 아이콘 하이라이트 제거
        if (clickedButton) {
            clickedButton.style.backgroundColor = 'transparent';
        }
    }
}

function insertImage() {
    const imageInput = document.getElementById('imageInput');
    if (imageInput) imageInput.click();
}

// 이미지 wrapper를 추적하기 위한 맵 (이미지 src를 키로 사용)
const imageWrapperMap = new Map();

// 이미지 리사이즈 기능 개선 (Gmail 스타일)
function setupImageResize(img) {
    // 이미지를 감싸는 컨테이너 생성
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.display = 'inline-block';
    wrapper.style.maxWidth = '100%';
    wrapper.style.margin = '5px 5px 5px 0';
    wrapper.style.verticalAlign = 'top';
    wrapper.className = 'image-wrapper';
    
    // 이미지 src를 데이터 속성으로 저장하여 추적
    const imageSrc = img.src;
    wrapper.dataset.imageSrc = imageSrc;
    imageWrapperMap.set(imageSrc, wrapper);
    
    // contenteditable에서 드래그 가능하도록 설정
    wrapper.setAttribute('draggable', 'true');
    
    // 원본 이미지 스타일 조정
    img.style.display = 'block';
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    img.style.cursor = 'move';
    img.style.userSelect = 'none';
    img.style.verticalAlign = 'top';
    img.style.margin = '0';
    img.setAttribute('draggable', 'false'); // 이미지는 드래그 불가, wrapper만 드래그 가능
    
    // 이미지를 wrapper에 추가 (부모가 있으면 교체, 없으면 그냥 추가)
    if (img.parentNode) {
        img.parentNode.insertBefore(wrapper, img);
    }
    wrapper.appendChild(img);
    
    // wrapper의 dragstart 이벤트 - 실제 드래그는 wrapper에서 처리
    wrapper.addEventListener('dragstart', function(e) {
        // 리사이즈 핸들이나 삭제 버튼이 아닐 때만 드래그 허용
        if (!e.target.closest('.image-resize-handle') && !e.target.closest('.image-delete-btn')) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', wrapper.outerHTML);
            e.dataTransfer.setData('text/plain', imageSrc);
            e.dataTransfer.setData('application/x-moz-node', wrapper);
            wrapper.style.opacity = '0.5';
            
            // editor의 dragstart 이벤트도 트리거되도록 전파
            const editor = document.getElementById('emailEditor');
            if (editor) {
                const dragStartEvent = new DragEvent('dragstart', {
                    bubbles: true,
                    cancelable: true,
                    dataTransfer: e.dataTransfer
                });
                editor.dispatchEvent(dragStartEvent);
            }
        } else {
            e.preventDefault();
            return false;
        }
    });
    
    // wrapper의 dragend 이벤트
    wrapper.addEventListener('dragend', function(e) {
        wrapper.style.opacity = '1';
        justDragged = true;
        
        // 드래그 완료 후 이미지 선택 상태 유지
        setTimeout(() => {
            ensureWrapperStructure(wrapper);
            selectImage(wrapper);
        }, 50);
        setTimeout(() => {
            ensureWrapperStructure(wrapper);
            selectImage(wrapper);
        }, 150);
        setTimeout(() => {
            ensureWrapperStructure(wrapper);
            selectImage(wrapper);
            justDragged = false;
        }, 300);
    });
    
    // 드래그 완료 플래그
    let justDragged = false;
    
    // drop 이벤트는 editor 레벨에서 처리하므로 wrapper 레벨에서는 제거
    
    // Gmail 스타일 리사이즈 핸들 생성 (8개: 모서리 4개 + 변 4개)
    const handles = [
        { pos: 'top-left', cursor: 'nwse-resize', resizeType: 'nw' },
        { pos: 'top', cursor: 'ns-resize', resizeType: 'n' },
        { pos: 'top-right', cursor: 'nesw-resize', resizeType: 'ne' },
        { pos: 'right', cursor: 'ew-resize', resizeType: 'e' },
        { pos: 'bottom-right', cursor: 'nwse-resize', resizeType: 'se' },
        { pos: 'bottom', cursor: 'ns-resize', resizeType: 's' },
        { pos: 'bottom-left', cursor: 'nesw-resize', resizeType: 'sw' },
        { pos: 'left', cursor: 'ew-resize', resizeType: 'w' }
    ];
    
    handles.forEach(handle => {
        const resizeHandle = document.createElement('div');
        resizeHandle.className = `image-resize-handle image-resize-handle-${handle.pos}`;
        resizeHandle.dataset.resizeType = handle.resizeType;
        resizeHandle.style.position = 'absolute';
        resizeHandle.style.cursor = handle.cursor;
        resizeHandle.style.display = 'none';
        resizeHandle.style.zIndex = '1000';
        resizeHandle.style.backgroundColor = '#4285f4';
        resizeHandle.style.border = '2px solid white';
        resizeHandle.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
        
        // 모서리 핸들 (큰 사각형)
        if (['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(handle.pos)) {
            resizeHandle.style.width = '12px';
            resizeHandle.style.height = '12px';
            resizeHandle.style.borderRadius = '2px';
        } else {
            // 변 핸들 (작은 사각형)
            if (handle.pos === 'top' || handle.pos === 'bottom') {
                resizeHandle.style.width = '24px';
                resizeHandle.style.height = '6px';
            } else {
                resizeHandle.style.width = '6px';
                resizeHandle.style.height = '24px';
            }
            resizeHandle.style.borderRadius = '3px';
        }
        
        // 위치 설정
        if (handle.pos.includes('top')) {
            resizeHandle.style.top = '-6px';
        }
        if (handle.pos.includes('bottom')) {
            resizeHandle.style.bottom = '-6px';
        }
        if (handle.pos.includes('left')) {
            resizeHandle.style.left = '-6px';
        }
        if (handle.pos.includes('right')) {
            resizeHandle.style.right = '-6px';
        }
        if (handle.pos === 'top' || handle.pos === 'bottom') {
            resizeHandle.style.left = '50%';
            resizeHandle.style.transform = 'translateX(-50%)';
        }
        if (handle.pos === 'left' || handle.pos === 'right') {
            resizeHandle.style.top = '50%';
            resizeHandle.style.transform = 'translateY(-50%)';
        }
        
        resizeHandle.addEventListener('mousedown', function(e) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            startImageResize(wrapper, img, e, handle.resizeType);
            return false;
        });
        
        // 마우스 오버 시 포인터 이벤트 활성화
        resizeHandle.style.pointerEvents = 'auto';
        
        wrapper.appendChild(resizeHandle);
    });
    
    // 이미지 클릭 시 선택 상태 토글 (핸들러를 저장하여 나중에 재설정 가능하도록)
    wrapper._clickHandler = function(e) {
        // 리사이즈 핸들이나 삭제 버튼이 아닐 때만 선택
        if (!e.target.closest('.image-resize-handle') && !e.target.closest('.image-delete-btn')) {
            e.stopPropagation();
            e.stopImmediatePropagation();
            selectImage(wrapper);
            justDragged = false; // 클릭 시 드래그 플래그 해제
        }
    };
    wrapper.addEventListener('click', wrapper._clickHandler, true); // capture phase에서 처리하여 먼저 실행
    
    // mousedown도 처리하여 더 확실하게
    wrapper._mousedownHandler = function(e) {
        if (!e.target.closest('.image-resize-handle') && !e.target.closest('.image-delete-btn')) {
            e.stopPropagation();
        }
    };
    wrapper.addEventListener('mousedown', wrapper._mousedownHandler, true);
    
    // 에디터 클릭 시 선택 해제 (드래그 중이 아닐 때만)
    const editor = document.getElementById('emailEditor');
    if (editor) {
        let isDragging = false;
        let dragEndTime = 0;
        let draggedImageSrc = null;
        let draggedWrapper = null;
        
        // dragover 이벤트 - 드롭을 허용하기 위해 필수!
        // contenteditable에서는 항상 preventDefault를 호출해야 드롭이 가능함
        editor.addEventListener('dragover', function(e) {
            // 이미지 wrapper를 드래그 중이면 드롭 허용
            if (draggedImageSrc) {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = 'move';
                return false;
            }
        }, false);
        
        // dragenter도 처리
        editor.addEventListener('dragenter', function(e) {
            if (draggedImageSrc) {
                e.preventDefault();
                e.stopPropagation();
            }
        }, false);
        
        editor.addEventListener('dragstart', function(e) {
            const wrapper = e.target.closest('.image-wrapper');
            if (wrapper) {
                isDragging = true;
                draggedWrapper = wrapper;
                draggedImageSrc = wrapper.dataset.imageSrc || wrapper.querySelector('img')?.src;
                console.log('Drag started:', draggedImageSrc);
            }
        });
        
        editor.addEventListener('dragend', function(e) {
            dragEndTime = Date.now();
            console.log('Drag ended');
            setTimeout(() => {
                isDragging = false;
                draggedImageSrc = null;
                draggedWrapper = null;
            }, 500);
        });
        
        editor.addEventListener('click', function(e) {
            // 드래그 직후(500ms 이내)이거나 이미지 wrapper일 때는 선택 해제하지 않음
            const timeSinceDragEnd = Date.now() - dragEndTime;
            if (!isDragging && timeSinceDragEnd > 500 && !e.target.closest('.image-wrapper')) {
                deselectAllImages();
            }
        });
        
        // drop 이벤트 처리 - 드롭된 이미지를 찾아서 선택
        editor.addEventListener('drop', function(e) {
            console.log('Drop event:', draggedImageSrc);
            
            // 이미지 wrapper를 드래그 중이면 항상 preventDefault
            if (draggedImageSrc) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                
                // 드래그된 wrapper 찾기
                let draggedWrapperElement = draggedWrapper || imageWrapperMap.get(draggedImageSrc);
                if (!draggedWrapperElement || !document.contains(draggedWrapperElement)) {
                    const allWrappers = editor.querySelectorAll('.image-wrapper');
                    for (const wrapper of allWrappers) {
                        const img = wrapper.querySelector('img');
                        if (img && img.src === draggedImageSrc) {
                            draggedWrapperElement = wrapper;
                            break;
                        }
                    }
                }
                
                if (draggedWrapperElement) {
                    // 마우스 위치에서 가장 가까운 텍스트 위치 찾기
                    const range = document.caretRangeFromPoint ? 
                        document.caretRangeFromPoint(e.clientX, e.clientY) :
                        (document.caretPositionFromPoint ? 
                            (() => {
                                const pos = document.caretPositionFromPoint(e.clientX, e.clientY);
                                if (pos) {
                                    const range = document.createRange();
                                    range.setStart(pos.offsetNode, pos.offset);
                                    range.setEnd(pos.offsetNode, pos.offset);
                                    return range;
                                }
                                return null;
                            })() : null);
                    
                    if (range && range.commonAncestorContainer) {
                        // 기존 위치에서 제거
                        draggedWrapperElement.remove();
                        
                        // Range를 editor 내부로 제한
                        let insertNode = range.commonAncestorContainer;
                        if (insertNode.nodeType === Node.TEXT_NODE) {
                            insertNode = insertNode.parentNode;
                        }
                        
                        // editor 내부인지 확인
                        if (!editor.contains(insertNode)) {
                            insertNode = editor;
                        }
                        
                        // 텍스트 노드인 경우 분할하여 삽입
                        if (insertNode.nodeType === Node.TEXT_NODE && range.startOffset !== undefined) {
                            const textNode = insertNode;
                            const offset = range.startOffset;
                            const beforeText = textNode.textContent.substring(0, offset);
                            const afterText = textNode.textContent.substring(offset);
                            
                            // 텍스트 노드를 분할
                            if (beforeText) {
                                const beforeNode = document.createTextNode(beforeText);
                                textNode.parentNode.insertBefore(beforeNode, textNode);
                            }
                            
                            // 이미지 삽입
                            textNode.parentNode.insertBefore(draggedWrapperElement, textNode);
                            
                            if (afterText) {
                                const afterNode = document.createTextNode(afterText);
                                textNode.parentNode.insertBefore(afterNode, textNode);
                            }
                            
                            textNode.remove();
                        } else {
                            // 일반 노드인 경우
                            if (range.startContainer && range.startContainer.nodeType === Node.TEXT_NODE) {
                                const textNode = range.startContainer;
                                const offset = range.startOffset;
                                
                                if (offset === 0) {
                                    textNode.parentNode.insertBefore(draggedWrapperElement, textNode);
                                } else if (offset === textNode.textContent.length) {
                                    textNode.parentNode.insertBefore(draggedWrapperElement, textNode.nextSibling);
                                } else {
                                    // 텍스트 노드 분할
                                    const beforeText = textNode.textContent.substring(0, offset);
                                    const afterText = textNode.textContent.substring(offset);
                                    
                                    const beforeNode = document.createTextNode(beforeText);
                                    const afterNode = document.createTextNode(afterText);
                                    
                                    textNode.parentNode.insertBefore(beforeNode, textNode);
                                    textNode.parentNode.insertBefore(draggedWrapperElement, textNode);
                                    textNode.parentNode.insertBefore(afterNode, textNode);
                                    textNode.remove();
                                }
                            } else {
                                // 일반 요소인 경우
                                insertNode.appendChild(draggedWrapperElement);
                            }
                        }
                    } else {
                        // Range를 찾을 수 없으면 editor 끝에 추가
                        draggedWrapperElement.remove();
                        editor.appendChild(draggedWrapperElement);
                    }
                }
                
                dragEndTime = Date.now();
                
                // 드롭된 위치에서 이미지 wrapper 찾기
                setTimeout(() => {
                    let targetWrapper = draggedWrapperElement || imageWrapperMap.get(draggedImageSrc);
                    
                    if (!targetWrapper || !document.contains(targetWrapper)) {
                        const allWrappers = editor.querySelectorAll('.image-wrapper');
                        for (const wrapper of allWrappers) {
                            const img = wrapper.querySelector('img');
                            if (img && img.src === draggedImageSrc) {
                                targetWrapper = wrapper;
                                imageWrapperMap.set(draggedImageSrc, wrapper);
                                break;
                            }
                        }
                    }
                    
                    if (targetWrapper) {
                        // wrapper 구조 확인 및 재설정
                        ensureWrapperStructure(targetWrapper);
                        selectImage(targetWrapper);
                        
                        // 추가로 여러 번 확인하여 확실하게
                        setTimeout(() => {
                            ensureWrapperStructure(targetWrapper);
                            selectImage(targetWrapper);
                        }, 50);
                        setTimeout(() => {
                            ensureWrapperStructure(targetWrapper);
                            selectImage(targetWrapper);
                        }, 150);
                        setTimeout(() => {
                            ensureWrapperStructure(targetWrapper);
                            selectImage(targetWrapper);
                        }, 300);
                    }
                    
                    isDragging = false;
                }, 10);
            } else {
                return; // 이미지가 아니면 기본 동작 허용
            }
        }, true); // capture phase에서 처리
        
        // MutationObserver로 DOM 변경 감지하여 wrapper 구조 유지
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === 1) { // Element node
                            // 새로 추가된 이미지가 wrapper 없이 추가되었는지 확인
                            if (node.tagName === 'IMG' && !node.closest('.image-wrapper')) {
                                const imgSrc = node.src;
                                const existingWrapper = imageWrapperMap.get(imgSrc);
                                if (existingWrapper && document.contains(existingWrapper)) {
                                    // 기존 wrapper가 있으면 그대로 사용
                                    return;
                                }
                                // wrapper 없이 추가된 이미지는 wrapper로 감싸기
                                setTimeout(() => {
                                    if (node.parentNode && !node.closest('.image-wrapper')) {
                                        setupImageResize(node);
                                    }
                                }, 10);
                            }
                            
                            // wrapper가 추가되었지만 구조가 깨진 경우
                            const wrapper = node.classList?.contains('image-wrapper') ? node : node.querySelector?.('.image-wrapper');
                            if (wrapper) {
                                ensureWrapperStructure(wrapper);
                            }
                        }
                    });
                    
                    // 제거된 노드 확인
                    mutation.removedNodes.forEach(function(node) {
                        if (node.nodeType === 1 && node.classList?.contains('image-wrapper')) {
                            const img = node.querySelector('img');
                            if (img && img.src) {
                                imageWrapperMap.delete(img.src);
                            }
                        }
                    });
                }
            });
        });
        
        observer.observe(editor, {
            childList: true,
            subtree: true
        });
    }
    
    // 삭제 버튼 추가
    const deleteBtn = document.createElement('div');
    deleteBtn.className = 'image-delete-btn';
    deleteBtn.innerHTML = '×';
    deleteBtn.style.position = 'absolute';
    deleteBtn.style.top = '-12px';
    deleteBtn.style.right = '-12px';
    deleteBtn.style.width = '24px';
    deleteBtn.style.height = '24px';
    deleteBtn.style.backgroundColor = '#f44336';
    deleteBtn.style.color = 'white';
    deleteBtn.style.borderRadius = '50%';
    deleteBtn.style.cursor = 'pointer';
    deleteBtn.style.display = 'none';
    deleteBtn.style.zIndex = '1001';
    deleteBtn.style.textAlign = 'center';
    deleteBtn.style.lineHeight = '24px';
    deleteBtn.style.fontSize = '18px';
    deleteBtn.style.fontWeight = 'bold';
    deleteBtn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
    
    deleteBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        wrapper.remove();
    });
    
    wrapper.appendChild(deleteBtn);
    
    return wrapper;
}

// wrapper 구조 확인 및 재설정 함수
function ensureWrapperStructure(wrapper) {
    if (!wrapper || !document.contains(wrapper)) return;
    
    // 이미지가 wrapper 안에 있는지 확인
    let img = wrapper.querySelector('img');
    if (!img) {
        // 이미지가 wrapper 밖에 있으면 다시 감싸기
        const imgOutside = wrapper.nextElementSibling?.tagName === 'IMG' ? wrapper.nextElementSibling : null;
        if (imgOutside) {
            wrapper.appendChild(imgOutside);
            img = imgOutside;
        } else {
            return;
        }
    }
    
    // 이미지 src를 데이터 속성으로 저장
    if (img.src) {
        wrapper.dataset.imageSrc = img.src;
        imageWrapperMap.set(img.src, wrapper);
    }
    
    // 리사이즈 핸들 확인 및 재설정
    let resizeHandles = wrapper.querySelectorAll('.image-resize-handle');
    if (resizeHandles.length < 8) {
        // 핸들이 부족하면 다시 생성
        const handles = [
            { pos: 'top-left', cursor: 'nwse-resize', resizeType: 'nw' },
            { pos: 'top', cursor: 'ns-resize', resizeType: 'n' },
            { pos: 'top-right', cursor: 'nesw-resize', resizeType: 'ne' },
            { pos: 'right', cursor: 'ew-resize', resizeType: 'e' },
            { pos: 'bottom-right', cursor: 'nwse-resize', resizeType: 'se' },
            { pos: 'bottom', cursor: 'ns-resize', resizeType: 's' },
            { pos: 'bottom-left', cursor: 'nesw-resize', resizeType: 'sw' },
            { pos: 'left', cursor: 'ew-resize', resizeType: 'w' }
        ];
        
        // 기존 핸들 제거
        resizeHandles.forEach(handle => handle.remove());
        
        // 새 핸들 생성
        handles.forEach(handle => {
            const resizeHandle = document.createElement('div');
            resizeHandle.className = `image-resize-handle image-resize-handle-${handle.pos}`;
            resizeHandle.dataset.resizeType = handle.resizeType;
            resizeHandle.style.position = 'absolute';
            resizeHandle.style.cursor = handle.cursor;
            resizeHandle.style.display = 'none';
            resizeHandle.style.zIndex = '1000';
            resizeHandle.style.backgroundColor = '#4285f4';
            resizeHandle.style.border = '2px solid white';
            resizeHandle.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
            
            if (['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(handle.pos)) {
                resizeHandle.style.width = '12px';
                resizeHandle.style.height = '12px';
                resizeHandle.style.borderRadius = '2px';
            } else {
                if (handle.pos === 'top' || handle.pos === 'bottom') {
                    resizeHandle.style.width = '24px';
                    resizeHandle.style.height = '6px';
                } else {
                    resizeHandle.style.width = '6px';
                    resizeHandle.style.height = '24px';
                }
                resizeHandle.style.borderRadius = '3px';
            }
            
            if (handle.pos.includes('top')) resizeHandle.style.top = '-6px';
            if (handle.pos.includes('bottom')) resizeHandle.style.bottom = '-6px';
            if (handle.pos.includes('left')) resizeHandle.style.left = '-6px';
            if (handle.pos.includes('right')) resizeHandle.style.right = '-6px';
            if (handle.pos === 'top' || handle.pos === 'bottom') {
                resizeHandle.style.left = '50%';
                resizeHandle.style.transform = 'translateX(-50%)';
            }
            if (handle.pos === 'left' || handle.pos === 'right') {
                resizeHandle.style.top = '50%';
                resizeHandle.style.transform = 'translateY(-50%)';
            }
            
            resizeHandle.addEventListener('mousedown', function(e) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                startImageResize(wrapper, img, e, handle.resizeType);
                return false;
            });
            
            resizeHandle.style.pointerEvents = 'auto';
            wrapper.appendChild(resizeHandle);
        });
    }
    
    // 삭제 버튼 확인 및 위치 재설정
    let deleteBtn = wrapper.querySelector('.image-delete-btn');
    if (!deleteBtn) {
        // 삭제 버튼이 없으면 다시 생성
        deleteBtn = document.createElement('div');
        deleteBtn.className = 'image-delete-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.style.position = 'absolute';
        deleteBtn.style.top = '-12px';
        deleteBtn.style.right = '-12px';
        deleteBtn.style.width = '24px';
        deleteBtn.style.height = '24px';
        deleteBtn.style.backgroundColor = '#f44336';
        deleteBtn.style.color = 'white';
        deleteBtn.style.borderRadius = '50%';
        deleteBtn.style.cursor = 'pointer';
        deleteBtn.style.display = 'none';
        deleteBtn.style.zIndex = '1001';
        deleteBtn.style.textAlign = 'center';
        deleteBtn.style.lineHeight = '24px';
        deleteBtn.style.fontSize = '18px';
        deleteBtn.style.fontWeight = 'bold';
        deleteBtn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
        
        deleteBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const imgSrc = wrapper.dataset.imageSrc;
            if (imgSrc) imageWrapperMap.delete(imgSrc);
            wrapper.remove();
        });
        
        wrapper.appendChild(deleteBtn);
    } else {
        // 삭제 버튼 위치 재설정
        deleteBtn.style.position = 'absolute';
        deleteBtn.style.top = '-12px';
        deleteBtn.style.right = '-12px';
    }
    
    // 클릭 이벤트 리스너 재설정 (없으면 추가)
    if (wrapper._clickHandler) {
        wrapper.removeEventListener('click', wrapper._clickHandler, true);
    }
    wrapper._clickHandler = function(e) {
        if (!e.target.closest('.image-resize-handle') && !e.target.closest('.image-delete-btn')) {
            e.stopPropagation();
            e.stopImmediatePropagation();
            selectImage(wrapper);
        }
    };
    wrapper.addEventListener('click', wrapper._clickHandler, true);
    
    // mousedown 이벤트 리스너 재설정
    if (wrapper._mousedownHandler) {
        wrapper.removeEventListener('mousedown', wrapper._mousedownHandler, true);
    }
    wrapper._mousedownHandler = function(e) {
        if (!e.target.closest('.image-resize-handle') && !e.target.closest('.image-delete-btn')) {
            e.stopPropagation();
        }
    };
    wrapper.addEventListener('mousedown', wrapper._mousedownHandler, true);
}

function selectImage(wrapper) {
    if (!wrapper || !document.contains(wrapper)) return;
    
    // 구조 확인
    ensureWrapperStructure(wrapper);
    
    deselectAllImages();
    wrapper.classList.add('image-selected');
    const resizeHandles = wrapper.querySelectorAll('.image-resize-handle');
    const deleteBtn = wrapper.querySelector('.image-delete-btn');
    resizeHandles.forEach(handle => handle.style.display = 'block');
    if (deleteBtn) {
        deleteBtn.style.display = 'block';
        // 위치 재확인
        deleteBtn.style.position = 'absolute';
        deleteBtn.style.top = '-12px';
        deleteBtn.style.right = '-12px';
    }
}

function deselectAllImages() {
    const selectedImages = document.querySelectorAll('.image-selected');
    selectedImages.forEach(wrapper => {
        wrapper.classList.remove('image-selected');
        const resizeHandles = wrapper.querySelectorAll('.image-resize-handle');
        const deleteBtn = wrapper.querySelector('.image-delete-btn');
        resizeHandles.forEach(handle => handle.style.display = 'none');
        if (deleteBtn) deleteBtn.style.display = 'none';
    });
}

function startImageResize(wrapper, img, e, resizeType) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = img.offsetWidth || img.naturalWidth;
    const startHeight = img.offsetHeight || img.naturalHeight;
    const aspectRatio = startWidth / startHeight;
    
    // 비율 유지 여부 (모서리 핸들은 비율 유지, 변 핸들은 비율 무시)
    const maintainAspectRatio = ['nw', 'ne', 'sw', 'se'].includes(resizeType);
    
    // 리사이즈 중임을 표시
    wrapper.classList.add('resizing');
    document.body.style.userSelect = 'none';
    
    // 이미지가 텍스트 위에 오지 않도록 z-index 설정
    const originalZIndex = wrapper.style.zIndex;
    wrapper.style.zIndex = '1';
    
    function resize(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const diffX = e.clientX - startX;
        const diffY = e.clientY - startY;
        
        let newWidth = startWidth;
        let newHeight = startHeight;
        
        // 리사이즈 타입에 따라 크기 조정
        if (resizeType.includes('e')) {
            newWidth = Math.max(50, startWidth + diffX);
        }
        if (resizeType.includes('w')) {
            newWidth = Math.max(50, startWidth - diffX);
        }
        if (resizeType.includes('s')) {
            newHeight = Math.max(50, startHeight + diffY);
        }
        if (resizeType.includes('n')) {
            newHeight = Math.max(50, startHeight - diffY);
        }
        
        // 비율 유지
        if (maintainAspectRatio) {
            if (Math.abs(diffX) > Math.abs(diffY)) {
                newHeight = newWidth / aspectRatio;
            } else {
                newWidth = newHeight * aspectRatio;
            }
        }
        
        // 이미지 크기만 변경 (position은 변경하지 않음)
        img.style.width = newWidth + 'px';
        img.style.height = newHeight + 'px';
        img.style.maxWidth = 'none';
        img.style.maxHeight = 'none';
    }
    
    function stopResize(e) {
        e.preventDefault();
        e.stopPropagation();
        
        document.removeEventListener('mousemove', resize);
        document.removeEventListener('mouseup', stopResize);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        wrapper.classList.remove('resizing');
        
        // z-index 복원
        wrapper.style.zIndex = originalZIndex || '';
    }
    
    // 전역 이벤트 리스너 등록
    document.addEventListener('mousemove', resize, { passive: false });
    document.addEventListener('mouseup', stopResize, { once: true, passive: false });
    
    // 커서 설정
    const cursorMap = {
        'nw': 'nwse-resize', 'n': 'ns-resize', 'ne': 'nesw-resize',
        'e': 'ew-resize', 'se': 'nwse-resize', 's': 'ns-resize',
        'sw': 'nesw-resize', 'w': 'ew-resize'
    };
    document.body.style.cursor = cursorMap[resizeType] || 'nwse-resize';
    
    return false;
}

// 업로드된 Word 파일 목록 저장
let uploadedWordFiles = [];

function uploadWordDocuments() {
    const wordDocumentInput = document.getElementById('wordDocumentInput');
    if (wordDocumentInput) wordDocumentInput.click();
}

function removeWordFile(index) {
    uploadedWordFiles.splice(index, 1);
    updateWordFilesList();
}

function updateWordFilesList() {
    const container = document.getElementById('uploadedWordFiles');
    const list = document.getElementById('wordFilesList');
    const countElement = document.getElementById('wordFilesCount');
    
    if (!container || !list) return;
    
    if (uploadedWordFiles.length === 0) {
        container.style.display = 'none';
        if (countElement) countElement.textContent = '0개';
        return;
    }
    
    container.style.display = 'block';
    if (countElement) {
        countElement.textContent = `${uploadedWordFiles.length}개`;
    }
    
    list.innerHTML = uploadedWordFiles.map((file, index) => `
        <div style="display: flex; align-items: center; gap: 10px; padding: 8px 12px; background-color: #fff; border: 1px solid #e0e0e0; border-radius: 4px; margin-bottom: 6px; transition: all 0.2s;">
            <i class="fas fa-file-word" style="color: #2b579a; font-size: 16px;"></i>
            <span style="flex: 1; font-size: 13px; color: #333; font-weight: 500;">${file.name}</span>
            <button type="button" onclick="removeWordFile(${index})" style="background: none; border: none; color: #e74c3c; cursor: pointer; padding: 4px 8px; border-radius: 4px; transition: background-color 0.2s;" title="제거">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
    
    // 제거 버튼 호버 효과
    setTimeout(() => {
        list.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('mouseenter', function() {
                this.style.backgroundColor = '#fee';
            });
            btn.addEventListener('mouseleave', function() {
                this.style.backgroundColor = 'transparent';
            });
        });
    }, 100);
}

// 참가자 관리 페이지용 함수
function openEmailComposeModalForParticipants(participantIds) {
    const modal = document.getElementById('emailComposeModal');
    if (!modal) {
        console.error('이메일 작성 모달을 찾을 수 없습니다.');
        return;
    }
    
    // 초기 선택된 참가자 ID 저장 (모달 닫을 때 동기화용)
    initialSelectedParticipantIds = Array.from(participantIds);
    
    modal.style.display = 'flex';
    populateEmailRecipientsFromParticipantIds(participantIds);
    
    // ESC 키로 모달 닫기
    const handleEscKey = (e) => {
        if (e.key === 'Escape' && modal.style.display === 'flex') {
            closeEmailComposeModal();
            document.removeEventListener('keydown', handleEscKey);
        }
    };
    document.addEventListener('keydown', handleEscKey);
    
    // 모달 외부 클릭 시 닫기
    const handleModalClick = (e) => {
        if (e.target === modal) {
            closeEmailComposeModal();
            modal.removeEventListener('click', handleModalClick);
        }
    };
    modal.addEventListener('click', handleModalClick);
}

async function populateEmailRecipientsFromParticipantIds(participantIds) {
    const recipientsList = document.getElementById('emailRecipientsList');
    if (!recipientsList) return;
    
    recipientsList.innerHTML = '<div style="padding: 20px; text-align: center;">로딩 중...</div>';
    
    try {
        // 이벤트 ID 가져오기
        let eventId = document.body.getAttribute('data-event-id');
        if (!eventId) {
            // URL에서 가져오기 시도
            const urlMatch = window.location.pathname.match(/\/admin_participants\/(\d+)/);
            if (urlMatch) {
                eventId = urlMatch[1];
            }
        }
        
        // API를 통해 참가자 정보 가져오기
        const response = await fetch(`/api/event_program/${eventId}/participants`);
        const data = await response.json();
        
        if (!data.success) {
            throw new Error('참가자 정보를 가져올 수 없습니다.');
        }
        
        const allParticipants = data.participants || [];
        
        // 모든 참가자를 allRecipientsData에 저장 (검색용)
        allRecipientsData = allParticipants.map(participant => {
            const displayName = participant.name_kor || participant.name_eng || 
                (participant.first_name && participant.family_name ? `${participant.first_name} ${participant.family_name}` : '') || '';
            return {
                email: participant.email || '',
                name: displayName,
                type: 'participant',
                participantId: participant.id,
                sessions: []
            };
        });
        
        // 초기 선택된 참가자 ID를 Set으로 저장 (검색 시 체크 상태 확인용)
        const selectedParticipantIds = new Set(participantIds.map(id => String(id)));
        
        // 초기 선택된 참가자들만 표시
        const selectedParticipants = allParticipants.filter(p => participantIds.includes(String(p.id)));
        
        recipientsList.innerHTML = '';
        
        // 수신자 목록 렌더링 (초기 선택된 참가자들은 체크된 상태로 표시)
        selectedParticipants.forEach((participant) => {
            const displayName = participant.name_kor || participant.name_eng || 
                (participant.first_name && participant.family_name ? `${participant.first_name} ${participant.family_name}` : '') || '';
            addRecipientToList(displayName, participant.email || '', participant.id, 'participant', true); // isChecked = true로 설정
        });
        
        // 검색 입력 필드 이벤트 리스너 추가
        const searchInput = document.getElementById('recipientSearchInput');
        if (searchInput) {
            // 검색 시 항상 현재 체크박스 상태를 확인하도록 수정
            searchInput.addEventListener('input', (e) => {
                // 현재 실제로 체크된 체크박스에서 선택된 ID를 가져옴
                const currentSelectedIds = new Set();
                document.querySelectorAll('.recipient-checkbox[data-participant-id]:checked').forEach(cb => {
                    const pid = cb.getAttribute('data-participant-id');
                    if (pid) currentSelectedIds.add(pid);
                });
                filterRecipientsForParticipants(e.target.value, currentSelectedIds);
            });
        }
        
        // 개별 체크박스 이벤트
        setTimeout(() => {
            document.querySelectorAll('.recipient-checkbox').forEach(checkbox => {
                checkbox.addEventListener('change', function() {
                    updateSelectedRecipientsCount();
                    // 실시간으로 참가자 관리 페이지의 체크박스 동기화
                    if (initialSelectedParticipantIds.length > 0) {
                        syncParticipantCheckboxes();
                    }
                    // 체크 해제 시 검색어 상태에 따라 필터링 다시 수행
                    const searchInput = document.getElementById('recipientSearchInput');
                    if (searchInput) {
                        // selectedParticipantIds Set 업데이트
                        const currentSelectedIds = new Set();
                        document.querySelectorAll('.recipient-checkbox[data-participant-id]:checked').forEach(cb => {
                            const pid = cb.getAttribute('data-participant-id');
                            if (pid) currentSelectedIds.add(pid);
                        });
                        filterRecipientsForParticipants(searchInput.value, currentSelectedIds);
                    }
                });
            });
            updateSelectedRecipientsCount();
        }, 100);
    } catch (error) {
        console.error('참가자 정보 로드 오류:', error);
        recipientsList.innerHTML = '<div style="padding: 20px; color: red;">참가자 정보를 불러오는 중 오류가 발생했습니다.</div>';
    }
}

// 참가자용 수신자 필터링 함수
function filterRecipientsForParticipants(searchTerm, selectedParticipantIds = null) {
    const recipientsList = document.getElementById('emailRecipientsList');
    if (!recipientsList) return;
    
    // 선택된 참가자 ID Set 생성 - 항상 현재 체크박스 상태를 우선 확인
    let selectedIds;
    // 먼저 현재 실제로 체크된 체크박스에서 선택된 ID를 가져옴
    const checkedBoxes = document.querySelectorAll('.recipient-checkbox[data-participant-id]:checked');
    selectedIds = new Set();
    checkedBoxes.forEach(cb => {
        const pid = cb.getAttribute('data-participant-id');
        if (pid) selectedIds.add(pid);
    });
    
    // 함수 파라미터로 전달된 경우, 그것도 고려 (하지만 현재 체크박스 상태가 우선)
    // 이 부분은 호환성을 위해 유지하지만, 실제로는 현재 체크박스 상태를 사용
    
    if (!searchTerm || searchTerm.trim() === '') {
        // 검색어가 없으면 선택된 참가자만 표시
        recipientsList.innerHTML = '';
        
        // 선택된 참가자 표시 (체크된 상태로)
        allRecipientsData.forEach(recipient => {
            if (selectedIds.has(String(recipient.participantId))) {
                addRecipientToList(recipient.name, recipient.email, recipient.participantId, recipient.type, true);
            }
        });
        
        setTimeout(() => {
            document.querySelectorAll('.recipient-checkbox').forEach(checkbox => {
                checkbox.addEventListener('change', function() {
                    updateSelectedRecipientsCount();
                    // 실시간으로 참가자 관리 페이지의 체크박스 동기화
                    if (initialSelectedParticipantIds.length > 0) {
                        syncParticipantCheckboxes();
                    }
                });
            });
            updateSelectedRecipientsCount();
        }, 100);
        return;
    }
    
    const searchLower = searchTerm.toLowerCase().trim();
    const filtered = allRecipientsData.filter(recipient => {
        const nameMatch = (recipient.name || '').toLowerCase().includes(searchLower);
        const emailMatch = (recipient.email || '').toLowerCase().includes(searchLower);
        return nameMatch || emailMatch;
    });
    
    // 필터링된 결과에 기존에 선택된 참가자들도 추가 (중복 제거)
    const filteredIds = new Set(filtered.map(r => String(r.participantId)));
    const selectedButNotInFilter = allRecipientsData.filter(recipient => {
        return selectedIds.has(String(recipient.participantId)) && !filteredIds.has(String(recipient.participantId));
    });
    
    // 필터링된 결과 + 기존 선택된 참가자들 결합 (체크된 사람을 맨 위에)
    const displayList = [...selectedButNotInFilter, ...filtered];
    
    recipientsList.innerHTML = '';
    
    // 필터링된 결과와 기존 선택된 참가자들 표시 (선택된 참가자는 체크된 상태로)
    displayList.forEach(recipient => {
        const isChecked = selectedIds.has(String(recipient.participantId));
        addRecipientToList(recipient.name, recipient.email, recipient.participantId, recipient.type, isChecked);
    });
    
    setTimeout(() => {
        document.querySelectorAll('.recipient-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                updateSelectedRecipientsCount();
                // 실시간으로 참가자 관리 페이지의 체크박스 동기화
                if (initialSelectedParticipantIds.length > 0) {
                    syncParticipantCheckboxes();
                }
                // 체크 해제 시 검색어 상태에 따라 필터링 다시 수행
                const searchInput = document.getElementById('recipientSearchInput');
                if (searchInput) {
                    // 현재 선택된 참가자 ID Set 업데이트
                    const currentSelectedIds = new Set();
                    document.querySelectorAll('.recipient-checkbox[data-participant-id]:checked').forEach(cb => {
                        const pid = cb.getAttribute('data-participant-id');
                        if (pid) currentSelectedIds.add(pid);
                    });
                    filterRecipientsForParticipants(searchInput.value, currentSelectedIds);
                }
            });
        });
        updateSelectedRecipientsCount();
    }, 100);
}

// 수신자 목록에 항목 추가하는 헬퍼 함수
function addRecipientToList(name, email, participantId, type, isChecked = false) {
    const recipientsList = document.getElementById('emailRecipientsList');
    if (!recipientsList) return;
    
    // 이미 추가된 이메일인지 확인 (대소문자 무시)
    const emailLower = email.toLowerCase();
    const existingCheckboxes = Array.from(document.querySelectorAll('.recipient-checkbox[data-email]'));
    const existingCheckbox = existingCheckboxes.find(cb => {
        const cbEmail = cb.getAttribute('data-email').toLowerCase();
        const cbParticipantId = cb.getAttribute('data-participant-id');
        return cbEmail === emailLower && cbParticipantId === (participantId || '');
    });
    
    if (existingCheckbox) {
        // 이미 존재하는 경우 체크 상태만 업데이트
        if (isChecked) {
            existingCheckbox.checked = true;
        }
        return;
    }
    
    const recipientDiv = document.createElement('div');
    recipientDiv.className = 'recipient-item';
    recipientDiv.style.cssText = 'display: flex; align-items: center; gap: 10px; padding: 8px; border-bottom: 1px solid #eee;';
    
    const typeLabel = type === 'chair' ? '좌장' : (type === 'speaker' ? '연자' : '참가자');
    const typeColor = type === 'chair' ? '#e3f2fd' : (type === 'speaker' ? '#f3e5f5' : '#e8f5e9');
    const typeTextColor = type === 'chair' ? '#1976d2' : (type === 'speaker' ? '#7b1fa2' : '#2e7d32');
    
    recipientDiv.innerHTML = `
        <input type="checkbox" class="recipient-checkbox" data-email="${email}" data-participant-id="${participantId || ''}" data-type="${type}" ${isChecked ? 'checked' : ''} style="width: 16px; height: 16px;">
        <span style="flex: 1; font-size: 14px;">${name || email}</span>
        <span style="font-size: 12px; color: #666;">${email || '이메일 없음'}</span>
        ${type !== 'participant' ? `<span style="font-size: 11px; padding: 2px 8px; background-color: ${typeColor}; color: ${typeTextColor}; border-radius: 12px;">${typeLabel}</span>` : ''}
    `;
    recipientsList.appendChild(recipientDiv);
}


async function sendEmailToRecipients() {
    const selectedCheckboxes = document.querySelectorAll('.recipient-checkbox:checked');
    if (selectedCheckboxes.length === 0) {
        alert('최소 한 명의 수신자를 선택해주세요.');
        return;
    }
    
    const subjectInput = document.getElementById('emailSubject');
    const editor = document.getElementById('emailEditor');
    
    if (!subjectInput || !editor) {
        alert('이메일 작성 폼을 찾을 수 없습니다.');
        return;
    }
    
    const subject = subjectInput.value.trim();
    if (!subject) {
        alert('제목을 입력해주세요.');
        return;
    }
    
    const body = editor.innerHTML;
    if (!body.trim()) {
        alert('이메일 내용을 입력해주세요.');
        return;
    }
    
    const ccInput = document.getElementById('emailCC');
    const cc = ccInput ? ccInput.value.trim() : '';
    
    // 승인/거절 버튼 포함 여부 확인
    const includeButtonsInput = document.getElementById('includeAcceptButtons');
    const includeButtons = includeButtonsInput ? includeButtonsInput.checked : false;
    
    // 발송 버튼 찾기 및 상태 변경
    const sendButton = document.getElementById('sendEmailButton') || document.querySelector('button[onclick="sendEmailToRecipients()"]');
    const originalButtonText = sendButton ? sendButton.innerHTML : '';
    const originalButtonDisabled = sendButton ? sendButton.disabled : false;
    
    if (sendButton) {
        sendButton.disabled = true;
        sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 발송 중...';
        sendButton.style.cursor = 'not-allowed';
        sendButton.style.opacity = '0.7';
    }
    
    // 선택된 수신자 정보 수집 (세션 정보 포함)
    // allRecipientsData에서 이미 수집된 세션 정보를 사용
    const recipientData = [];
    
    selectedCheckboxes.forEach(cb => {
        const participantId = cb.getAttribute('data-participant-id');
        const email = cb.getAttribute('data-email');
        
        // 참가자 ID가 있는 경우만 처리
        if (participantId && email) {
            // allRecipientsData에서 해당 수신자 찾기
            const recipient = allRecipientsData.find(r => 
                r.email === email && String(r.participantId) === String(participantId)
            );
            
            if (recipient && recipient.sessions) {
                console.log(`✅ 수신자 찾음: ${recipient.name} (${email}), ${recipient.sessions.length}개 세션`);
                if (recipient.sessions.length > 0) {
                    console.log(`첫 번째 세션 정보:`, recipient.sessions[0]);
                }
                
                recipientData.push({
                    participant_id: participantId,
                    sessions: recipient.sessions
                });
            } else {
                console.warn(`⚠️ 수신자 정보를 찾을 수 없음: participantId=${participantId}, email=${email}`);
                // 세션 정보 없이도 추가 (기본 정보만)
                recipientData.push({
                    participant_id: participantId,
                    sessions: []
                });
            }
        }
    });
    
    if (recipientData.length === 0) {
        alert('유효한 수신자를 선택해주세요.');
        return;
    }
    
    const formData = new FormData();
    formData.append('participant_ids', recipientData.map(r => r.participant_id).join(','));
    
    // 세션 정보 전달 (디버깅용 로그 추가)
    const sessionDataJson = JSON.stringify(recipientData);
    console.log('전송할 세션 데이터:', sessionDataJson);
    console.log('수신자별 세션 수:', recipientData.map(r => ({id: r.participant_id, sessions: r.sessions.length})));
    formData.append('session_data', sessionDataJson);
    
    formData.append('subject', subject);
    formData.append('body', body);
    formData.append('cc', cc);
    if (includeButtons) {
        formData.append('include_buttons', 'yes');
    }
    
    // 워드 파일 정보 추가
    console.log('📎 업로드된 워드 파일:', uploadedWordFiles);
    if (uploadedWordFiles && uploadedWordFiles.length > 0) {
        const wordFilesData = uploadedWordFiles.map(file => ({
            name: file.name,
            server_filename: file.server_filename
        }));
        console.log('📎 전송할 워드 파일 데이터:', wordFilesData);
        formData.append('word_files', JSON.stringify(wordFilesData));
    } else {
        console.log('⚠️ 업로드된 워드 파일이 없습니다.');
    }
    
    try {
        const response = await fetch('/send_email', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            alert(`이메일이 ${selectedCheckboxes.length}명에게 성공적으로 발송되었습니다.`);
            closeEmailComposeModal();
        } else {
            alert(result.message || '이메일 발송 실패');
        }
    } catch (error) {
        console.error('이메일 발송 오류:', error);
        alert('이메일 발송 중 오류가 발생했습니다.');
    } finally {
        // 발송 버튼 상태 복구
        if (sendButton) {
            sendButton.disabled = originalButtonDisabled;
            sendButton.innerHTML = originalButtonText;
            sendButton.style.cursor = 'pointer';
            sendButton.style.opacity = '1';
        }
    }
}

// 이미지 업로드 및 삽입 함수
async function uploadAndInsertImage(file) {
    const formData = new FormData();
    formData.append('image', file);
    
    try {
        const response = await fetch('/upload_image', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        
        if (result.status === 'success') {
            const img = document.createElement('img');
            img.src = result.image_url;
            
            // 이미지 로드 완료 후 처리
            img.onload = function() {
                const editor = document.getElementById('emailEditor');
                if (editor) {
                    // 이미지 리사이즈 기능 설정
                    const wrapper = setupImageResize(img);
                    
                    const selection = window.getSelection();
                    if (selection.rangeCount > 0) {
                        const range = selection.getRangeAt(0);
                        range.insertNode(wrapper);
                    } else {
                        editor.appendChild(wrapper);
                    }
                    
                    // 이미지 선택 상태로 만들기
                    setTimeout(() => {
                        selectImage(wrapper);
                    }, 100);
                }
            };
            
            // 이미지 로드 실패 시 처리
            img.onerror = function() {
                alert('이미지를 불러올 수 없습니다.');
            };
        } else {
            alert(result.message || '이미지 업로드 실패');
        }
    } catch (error) {
        console.error('이미지 업로드 오류:', error);
        alert('이미지 업로드 중 오류가 발생했습니다.');
    }
}

// DOMContentLoaded 이벤트 리스너
document.addEventListener('DOMContentLoaded', function() {
    const imageInput = document.getElementById('imageInput');
    if (imageInput) {
        imageInput.addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            await uploadAndInsertImage(file);
            e.target.value = '';
        });
    }
    
    // 붙여넣기 이벤트 처리
    const editor = document.getElementById('emailEditor');
    if (editor) {
        editor.addEventListener('paste', async function(e) {
            const clipboardData = e.clipboardData || window.clipboardData;
            const items = clipboardData.items;
            
            // 먼저 HTML 텍스트 확인 (워드 문서 등)
            const htmlData = clipboardData.getData('text/html');
            if (htmlData) {
                // HTML이 있으면 기본 동작 허용 (브라우저가 자동으로 처리)
                // 단, 이미지만 있는 경우는 제외
                const hasImageOnly = htmlData.match(/<img[^>]*>/i) && !htmlData.match(/<[^>]+>/g) || htmlData.match(/<img[^>]*>/g)?.length === htmlData.match(/<[^>]+>/g)?.length;
                if (!hasImageOnly) {
                    return; // HTML 텍스트가 있으면 기본 동작 허용
                }
            }
            
            // 일반 텍스트 확인
            const textData = clipboardData.getData('text/plain');
            if (textData && !htmlData) {
                // 텍스트만 있고 HTML이 없으면 기본 동작 허용
                return;
            }
            
            // 이미지 처리
            let hasImage = false;
            for (const item of items) {
                if (item.type.indexOf('image') !== -1) {
                    e.preventDefault();
                    hasImage = true;
                    const file = item.getAsFile();
                    if (file) {
                        await uploadAndInsertImage(file);
                    }
                    break;
                }
            }
            
            // 이미지가 없고 HTML도 없으면 기본 동작 허용
            if (!hasImage && !htmlData) {
                return;
            }
        });
    }
    
    const wordDocumentInput = document.getElementById('wordDocumentInput');
    if (wordDocumentInput) {
        wordDocumentInput.addEventListener('change', async function(e) {
            const files = Array.from(e.target.files);
            if (files.length === 0) return;
            
            // 각 파일을 업로드하고 목록에 추가
            for (const file of files) {
                const formData = new FormData();
                formData.append('word_document', file);
                
                try {
                    const response = await fetch('/upload_word_document', {
                        method: 'POST',
                        body: formData
                    });
                    const result = await response.json();
                    
                    if (result.status === 'success') {
                        // 파일 정보 저장 (서버에 저장된 파일명 포함)
                        uploadedWordFiles.push({
                            name: file.name,
                            server_filename: result.server_filename || file.name,
                            file_id: result.file_id || null
                        });
                    } else {
                        alert(`${file.name}: ${result.message || '워드 문서 업로드 실패'}`);
                    }
                } catch (error) {
                    console.error('워드 문서 업로드 오류:', error);
                    alert(`${file.name}: 워드 문서 업로드 중 오류가 발생했습니다.`);
                }
            }
            
            updateWordFilesList();
            e.target.value = '';
        });
    }
});

// 플레이스홀더 리스트 토글
function togglePlaceholderList() {
    const content = document.getElementById('placeholderListContent');
    const icon = document.getElementById('placeholderListIcon');
    
    if (content && icon) {
        const isVisible = content.style.display !== 'none';
        content.style.display = isVisible ? 'none' : 'block';
        icon.style.transform = isVisible ? 'rotate(0deg)' : 'rotate(180deg)';
    }
}

// 플레이스홀더 복사
function copyPlaceholder(element) {
    // data-placeholder 속성에서 플레이스홀더 가져오기 (우선)
    let placeholder = element.getAttribute('data-placeholder');
    
    // data-placeholder가 없으면 code 요소에서 가져오기 (하위 호환성)
    if (!placeholder) {
        const codeElement = element.querySelector('code');
        if (codeElement) {
            placeholder = codeElement.textContent;
        } else {
            return;
        }
    }
    
    // 클립보드에 복사
    navigator.clipboard.writeText(placeholder).then(() => {
        // 시각적 피드백
        const originalBg = element.style.backgroundColor;
        const originalBorder = element.style.borderColor;
        
        element.style.backgroundColor = '#e8f0fe';
        element.style.borderColor = '#4285f4';
        
        // 원래 색상으로 복원
        setTimeout(() => {
            element.style.backgroundColor = originalBg;
            element.style.borderColor = originalBorder;
        }, 300);
        
        // 토스트 메시지 표시
        const toast = document.createElement('div');
        toast.textContent = '복사되었습니다: ' + placeholder;
        toast.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #34a853; color: white; padding: 12px 20px; border-radius: 4px; z-index: 10000; box-shadow: 0 2px 8px rgba(0,0,0,0.2); font-size: 14px;';
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }).catch(err => {
        console.error('복사 실패:', err);
        alert('복사에 실패했습니다. 수동으로 복사해주세요: ' + placeholder);
    });
}

