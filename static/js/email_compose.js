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
    initEmailQuill();
    directRecipientEmails = [];
    setupDirectEmailInput();

    const initRecipients = () => {
        populateEmailRecipients();
    };

    if (typeof loadParticipants === 'function') {
        loadParticipants().then(initRecipients).catch(initRecipients);
    } else {
        initRecipients();
    }
    
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

// Gmail 스타일: "참조" 클릭 시 CC 입력란 표시/숨김
function toggleCcField() {
    const wrapper = document.getElementById('ccFieldWrapper');
    const link = document.getElementById('ccToggleLink');
    if (!wrapper) return;
    const isHidden = wrapper.style.display === 'none' || !wrapper.style.display;
    if (isHidden) {
        wrapper.style.display = 'block';
        if (link) link.style.fontWeight = '600';
        const cc = document.getElementById('emailCC');
        if (cc) cc.focus();
    } else {
        wrapper.style.display = 'none';
        if (link) link.style.fontWeight = 'normal';
        const cc = document.getElementById('emailCC');
        if (cc) cc.value = '';
    }
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
    const ccInput = document.getElementById('emailCC');
    const selectAllChairs = document.getElementById('selectAllChairs');
    const selectAllSpeakers = document.getElementById('selectAllSpeakers');
    const searchInput = document.getElementById('recipientSearchInput');
    
    if (subjectInput) subjectInput.value = '';
    if (emailQuill) emailQuill.setText('');
    if (ccInput) ccInput.value = '';
    directRecipientEmails = [];
    renderDirectEmailChips();
    const ccFieldWrapper = document.getElementById('ccFieldWrapper');
    if (ccFieldWrapper) ccFieldWrapper.style.display = 'none';
    const ccToggleLink = document.getElementById('ccToggleLink');
    if (ccToggleLink) ccToggleLink.style.fontWeight = 'normal';
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

// 검색창에서 직접 입력한(명단에 없는) 이메일 목록
let directRecipientEmails = [];

// 검색창을 Gmail처럼 사용: 이메일 입력 후 Enter/콤마로 직접 수신자 추가
function setupDirectEmailInput() {
    const searchInput = document.getElementById('recipientSearchInput');
    if (!searchInput) return;
    searchInput.onkeydown = function(e) {
        if (e.key === 'Enter' || e.key === ',') {
            const val = searchInput.value.trim().replace(/,+$/, '').trim();
            if (!val) return;
            if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val)) {
                e.preventDefault();
                addDirectRecipientEmail(val);
                searchInput.value = '';
                searchInput.dispatchEvent(new Event('input'));
            } else if (e.key === 'Enter' && val.indexOf('@') !== -1) {
                e.preventDefault();
                alert('올바른 이메일 형식이 아닙니다: ' + val);
            }
        }
    };
    renderDirectEmailChips();
}

function addDirectRecipientEmail(email) {
    email = (email || '').trim();
    if (!email) return;
    if (directRecipientEmails.some(e => e.toLowerCase() === email.toLowerCase())) return;
    directRecipientEmails.push(email);
    renderDirectEmailChips();
    updateSelectedRecipientsCount();
}

function removeDirectRecipientEmail(email) {
    directRecipientEmails = directRecipientEmails.filter(e => e !== email);
    renderDirectEmailChips();
    updateSelectedRecipientsCount();
}

function renderDirectEmailChips() {
    const container = document.getElementById('directEmailChips');
    if (!container) return;
    container.innerHTML = '';
    if (directRecipientEmails.length === 0) {
        container.style.display = 'none';
        return;
    }
    container.style.display = 'flex';
    directRecipientEmails.forEach(email => {
        const chip = document.createElement('span');
        chip.style.cssText = 'display:inline-flex; align-items:center; gap:6px; background:#e8f0fe; color:#1967d2; border:1px solid #d2e3fc; border-radius:16px; padding:4px 10px; font-size:13px;';
        const text = document.createElement('span');
        text.textContent = email;
        chip.appendChild(text);
        const close = document.createElement('span');
        close.textContent = '×';
        close.style.cssText = 'cursor:pointer; font-weight:bold; line-height:1;';
        close.title = '삭제';
        close.onclick = () => removeDirectRecipientEmail(email);
        chip.appendChild(close);
        container.appendChild(chip);
    });
}

function formatAffiliationDepartmentDisplay(affiliation, department) {
    const aff = (affiliation || '').trim();
    const dept = (department || '').trim();
    if (aff && dept) return `${aff} | ${dept}`;
    return aff || dept || '';
}

function addProgramPersonToRecipients(recipients, entity, type, sessionInfo, sessionExtra = null) {
    const contact = typeof resolveProgramPersonContact === 'function'
        ? resolveProgramPersonContact(entity)
        : null;
    if (!contact) return;

    const sessionEntry = sessionExtra ? { ...sessionInfo, ...sessionExtra } : sessionInfo;
    const recipientBase = {
        email: contact.email || '',
        name: contact.name_kor || contact.name_eng || contact.name || '',
        name_kor: contact.name_kor || '',
        name_eng: contact.name_eng || '',
        affiliation: contact.affiliation || '',
        department: contact.department || '',
        affiliationDisplay: formatAffiliationDepartmentDisplay(contact.affiliation, contact.department),
        type,
        participantId: contact.id,
        country: contact.country || '',
        country_code: contact.country_code || '',
        poolRef: contact.poolRef || ''
    };

    const mapKey = recipientBase.email
        ? recipientBase.email.toLowerCase()
        : (recipientBase.poolRef
            ? `pool:${recipientBase.poolRef}`
            : `uid:${type}:${recipientBase.participantId}`);

    if (!recipients.has(mapKey)) {
        recipients.set(mapKey, { ...recipientBase, sessions: [] });
    }

    recipients.get(mapKey).sessions.push(sessionEntry);
}

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
                addProgramPersonToRecipients(recipients, chair, 'chair', sessionInfo);
            });
        } else if (session.chairId || session.chair) {
            addProgramPersonToRecipients(recipients, {
                participantId: session.chairId,
                id: session.chairId,
                name: session.chair
            }, 'chair', sessionInfo);
        }
        
        // 연자 수집
        if (session.speakers && session.speakers.length > 0) {
            session.speakers.forEach(speaker => {
                if (!speaker.name && !speaker.participantId && !speaker.id && !speaker.poolRef) {
                    return;
                }
                addProgramPersonToRecipients(recipients, speaker, 'speaker', sessionInfo, {
                    lecture_title: speaker.topic || '',
                    lecture_time: speaker.startTime && speaker.endTime ? `${speaker.startTime}-${speaker.endTime}` : '',
                    lecture_start_time: speaker.startTime || '',
                    lecture_end_time: speaker.endTime || ''
                });
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
        
        const affiliationText = recipient.affiliationDisplay
            ? `<span style="color: #888; font-size: 12px; margin-left: 8px;">${recipient.affiliationDisplay}</span>`
            : '';

        recipientDiv.innerHTML = `
            <input type="checkbox" class="recipient-checkbox" data-email="${recipient.email}" data-participant-id="${recipient.participantId}" data-type="${recipient.type}" ${isChecked ? 'checked' : ''} style="width: 16px; height: 16px;">
            <span style="flex: 1; font-size: 14px; min-width: 0;">${recipient.name}${affiliationText}</span>
            <span style="font-size: 12px; color: #666; white-space: nowrap;">${recipient.email || '이메일 없음'}</span>
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
        const nameMatch = (recipient.name || '').toLowerCase().includes(searchLower)
            || (recipient.name_kor || '').toLowerCase().includes(searchLower)
            || (recipient.name_eng || '').toLowerCase().includes(searchLower);
        const affiliationMatch = (recipient.affiliation || '').toLowerCase().includes(searchLower)
            || (recipient.department || '').toLowerCase().includes(searchLower)
            || (recipient.affiliationDisplay || '').toLowerCase().includes(searchLower);
        const emailMatch = (recipient.email || '').toLowerCase().includes(searchLower);
        return nameMatch || affiliationMatch || emailMatch;
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
        countElement.textContent = selected + directRecipientEmails.length;
    }
}

// ============================================================
// Quill 에디터 초기화
// ============================================================
let emailQuill = null;

function initEmailQuill() {
    if (emailQuill) return;
    const container = document.getElementById('emailEditorQuill');
    if (!container) return;

    emailQuill = new Quill('#emailEditorQuill', {
        theme: 'snow',
        placeholder: '이메일 내용을 작성하세요...',
        modules: {
            toolbar: {
                container: [
                    [{ 'header': [1, 2, 3, false] }],
                    [{ 'font': [] }],
                    [{ 'size': ['small', false, 'large', 'huge'] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'color': [] }, { 'background': [] }],
                    [{ 'align': [] }],
                    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                    ['link', 'image'],
                    ['clean'],
                    ['wordUpload']
                ],
                handlers: {
                    image: function () {
                        const input = document.createElement('input');
                        input.setAttribute('type', 'file');
                        input.setAttribute('accept', 'image/*');
                        input.click();
                        input.onchange = async function () {
                            const file = input.files[0];
                            if (file) await quillUploadImage(file);
                        };
                    },
                    wordUpload: function () {
                        uploadWordDocuments();
                    }
                }
            }
        }
    });

    // 워드 문서 버튼 커스터마이징
    const wordBtn = document.querySelector('.ql-wordUpload');
    if (wordBtn) {
        wordBtn.innerHTML = '<i class="fas fa-file-word"></i> 워드';
        wordBtn.style.cssText = 'background:#2B579A; color:white; border-radius:4px; padding:2px 8px; font-size:12px; width:auto;';
    }

    // 클립보드 이미지 붙여넣기 → 서버 업로드
    emailQuill.root.addEventListener('paste', function (e) {
        const clipboardData = e.clipboardData || window.clipboardData;
        if (!clipboardData || !clipboardData.items) return;
        for (const item of clipboardData.items) {
            if (item.type.indexOf('image') !== -1) {
                e.preventDefault();
                e.stopPropagation();
                const file = item.getAsFile();
                if (file) quillUploadImage(file);
                return;
            }
        }
    });
}

async function quillUploadImage(file) {
    const formData = new FormData();
    formData.append('image', file);
    try {
        const response = await fetch('/upload_image', { method: 'POST', body: formData });
        const result = await response.json();
        if (result.status === 'success') {
            const range = emailQuill.getSelection(true);
            emailQuill.insertEmbed(range.index, 'image', result.image_url);
            emailQuill.setSelection(range.index + 1);
        } else {
            alert(result.message || '이미지 업로드 실패');
        }
    } catch (error) {
        alert('이미지 업로드 중 오류가 발생했습니다.');
    }
}

// ============================================================
// (제거됨) 기존 커스텀 에디터 함수 - Quill로 대체
// ============================================================
// REMOVED: formatText, updateFontFamilyDisplay, applyFontSize,
// showFontSizePicker, applyFontFamily, applyColorToSelection,
// showColorPicker, insertImage, setupImageResize,
// ensureWrapperStructure, selectImage, deselectAllImages, startImageResize
// ============================================================

void 0; // placeholder to keep file valid

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
    directRecipientEmails = [];
    populateEmailRecipientsFromParticipantIds(participantIds);
    setupDirectEmailInput();
    
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
        const nameMatch = (recipient.name || '').toLowerCase().includes(searchLower)
            || (recipient.name_kor || '').toLowerCase().includes(searchLower)
            || (recipient.name_eng || '').toLowerCase().includes(searchLower);
        const affiliationMatch = (recipient.affiliation || '').toLowerCase().includes(searchLower)
            || (recipient.department || '').toLowerCase().includes(searchLower)
            || (recipient.affiliationDisplay || '').toLowerCase().includes(searchLower);
        const emailMatch = (recipient.email || '').toLowerCase().includes(searchLower);
        return nameMatch || affiliationMatch || emailMatch;
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

    // 검색창에서 직접 추가한(명단에 없는) 이메일 수집
    // 칩으로 추가되지 않고 검색창에 남아있는 이메일도 포함
    const searchInputEl = document.getElementById('recipientSearchInput');
    if (searchInputEl) {
        const leftover = searchInputEl.value.trim().replace(/,+$/, '').trim();
        if (leftover && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(leftover)) {
            addDirectRecipientEmail(leftover);
            searchInputEl.value = '';
            searchInputEl.dispatchEvent(new Event('input'));
        }
    }
    const directEmails = [...directRecipientEmails];

    if (selectedCheckboxes.length === 0 && directEmails.length === 0) {
        alert('최소 한 명의 수신자를 선택하거나 받는 사람 이메일을 직접 입력해주세요.');
        return;
    }
    
    const subjectInput = document.getElementById('emailSubject');
    
    if (!subjectInput || !emailQuill) {
        alert('이메일 작성 폼을 찾을 수 없습니다.');
        return;
    }
    
    const subject = subjectInput.value.trim();
    if (!subject) {
        alert('제목을 입력해주세요.');
        return;
    }
    
    const body = emailQuill.root.innerHTML;
    if (!body.trim() || emailQuill.getText().trim().length === 0) {
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
    
    if (recipientData.length === 0 && directEmails.length === 0) {
        alert('유효한 수신자를 선택해주세요.');
        return;
    }
    
    const formData = new FormData();
    formData.append('participant_ids', recipientData.map(r => r.participant_id).join(','));
    formData.append('extra_emails', directEmails.join(','));
    
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

        if (!response.ok) {
            console.error('이메일 발송 서버 응답:', response.status, result);
        }
        
        if (result.status === 'success') {
            const totalCount = selectedCheckboxes.length + directEmails.length;
            alert(`이메일이 ${totalCount}명에게 성공적으로 발송되었습니다.`);
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

// DOMContentLoaded 이벤트 리스너
document.addEventListener('DOMContentLoaded', function() {
    initEmailQuill();

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

