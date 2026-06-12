// Google Calendar Style Event Program Management

let sessions = [];
let venues = []; // 강의 장소 배열
let currentSessionIndex = -1;
let currentVenueIndex = -1;
let chairCounter = 0; // 좌장 카운터
let speakerCounter = 0;
let isDragging = false;
let isResizing = false;
let dragStartY = 0;
let resizeStartY = 0;
let currentDragSession = null;
let currentResizeSession = null;
let currentResizeHandle = null;
let currentColorSessionIndex = -1;
let dragEndTime = 0; // 드래그 종료 시간을 추적
let resizeEndTime = 0; // 리사이즈 종료 시간을 추적
let dragOffsetY = 0; // 드래그 시작 시 마우스와 세션 블록의 상대적 위치
let lastClickTime = 0; // 더블클릭 감지를 위한 마지막 클릭 시간
let dragAnimationFrame = null; // 드래그 애니메이션 프레임 최적화
let resizeAnimationFrame = null; // 리사이즈 애니메이션 프레임 최적화
let sessionTypeColors = new Map(); // 세션 타입별 색상 매핑
let standaloneSessionColors = new Set(); // 세션 타입이 없는 세션의 색상 추적

const LIGHT_COLOR_PRIORITY = [
    15, 12, 13, 11, 16, 17, 18, 19, 20, 21,
    22, 23, 24, 25, 26, 27, 28, 29, 30
];
const COLOR_ASSIGNMENT_ORDER = [
    ...LIGHT_COLOR_PRIORITY,
    3, 6, 8, 1, 2, 4, 5, 7, 9, 10, 14
];
let availableLightColors = [];
let availableColors = [];

function resetColorPools(excludeColors = []) {
    const excludeSet = new Set(excludeColors);
    availableLightColors = LIGHT_COLOR_PRIORITY.filter(color => !excludeSet.has(color));
    availableColors = COLOR_ASSIGNMENT_ORDER.filter(color => !excludeSet.has(color));
    
    // 모든 색상이 사용 중이면 전체 풀을 다시 채움
    if (availableLightColors.length === 0 && availableColors.length === 0) {
        availableLightColors = [...LIGHT_COLOR_PRIORITY];
        availableColors = [...COLOR_ASSIGNMENT_ORDER];
    }
}

function removeRandomColor(colorArray) {
    if (!colorArray || colorArray.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * colorArray.length);
    const [colorId] = colorArray.splice(randomIndex, 1);
    return colorId;
}

function markColorAsUsed(colorId) {
    if (typeof colorId !== 'number') return;
    availableLightColors = availableLightColors.filter(color => color !== colorId);
    availableColors = availableColors.filter(color => color !== colorId);
}

function getNextRandomColorId(preferLight = true) {
    const usedColorSet = new Set([
        ...sessionTypeColors.values(),
        ...standaloneSessionColors
    ]);
    const usedColors = Array.from(usedColorSet);
    
    // 필요 시 색상 풀 리셋 (사용 중 색상 제외)
    if (availableLightColors.length === 0 && availableColors.length === 0) {
        resetColorPools(usedColors);
    }
    
    if (preferLight && availableLightColors.length > 0) {
        const colorId = removeRandomColor(availableLightColors);
        // 일반 풀에서도 제거
        availableColors = availableColors.filter(color => color !== colorId);
        return colorId;
    }
    
    if (availableColors.length === 0) {
        resetColorPools(usedColors);
    }
    
    let colorId = removeRandomColor(availableColors);
    if (colorId === null || colorId === undefined) {
        colorId = COLOR_ASSIGNMENT_ORDER[Math.floor(Math.random() * COLOR_ASSIGNMENT_ORDER.length)];
    }
    
    // 라이트 풀에서도 제거 (존재하는 경우)
    availableLightColors = availableLightColors.filter(color => color !== colorId);
    
    return colorId;
}

resetColorPools();
const MAX_VENUE_COLUMNS = 4; // UI에서 동시에 표시할 수 있는 최대 강의 장소 수
const UNASSIGNED_VENUE_COLUMN_ID = 'venueColumn_unassigned';
const UNASSIGNED_VENUE_AREA_ID = 'venueSessionsArea_unassigned';
const UNASSIGNED_VENUE_LABEL = '미등록 장소';
const ENGLISH_SESSION_LABEL = 'English Session';
const ENGLISH_SESSION_KEYWORD = ENGLISH_SESSION_LABEL.toLowerCase();
const ENGLISH_SESSION_FONT_COLOR = 'FFD93025';

const SESSION_COLOR_EXPORT_MAP = {
    0: { fill: 'FFFFFFFF', font: 'FF202124' },
    1: { fill: 'FF4285F4', font: 'FFFFFFFF' },
    2: { fill: 'FF34A853', font: 'FFFFFFFF' },
    3: { fill: 'FFFBBC04', font: 'FF3C4043' },
    4: { fill: 'FFEA4335', font: 'FFFFFFFF' },
    5: { fill: 'FF9C27B0', font: 'FFFFFFFF' },
    6: { fill: 'FFFF9800', font: 'FF3C4043' },
    7: { fill: 'FF00BCD4', font: 'FFFFFFFF' },
    8: { fill: 'FF8BC34A', font: 'FF263813' },
    9: { fill: 'FFE91E63', font: 'FFFFFFFF' },
    10: { fill: 'FF795548', font: 'FFFFFFFF' },
    11: { fill: 'FFF6D496', font: 'FF3C4043' },
    12: { fill: 'FFE9DDC7', font: 'FF3C4043' },
    13: { fill: 'FFF3E0BF', font: 'FF3C4043' },
    14: { fill: 'FFDEB765', font: 'FF3C4043' },
    15: { fill: 'FFF0E8D7', font: 'FF3C4043' },
    16: { fill: 'FFF7E890', font: 'FF3C4043' },
    17: { fill: 'FFEEFFB2', font: 'FF344227' },
    18: { fill: 'FFC5C182', font: 'FF2F3522' },
    19: { fill: 'FFA6A56C', font: 'FF20241B' },
    20: { fill: 'FFA3A990', font: 'FF202124' },
    21: { fill: 'FFD6DECA', font: 'FF2F3330' },
    22: { fill: 'FFCFE2C8', font: 'FF2F3330' },
    23: { fill: 'FF91C2BA', font: 'FF1F3330' },
    24: { fill: 'FFF8CDC9', font: 'FF4A2C2A' },
    25: { fill: 'FFFFD5E5', font: 'FF4F2D3C' },
    26: { fill: 'FFF4B6C2', font: 'FF432129' },
    27: { fill: 'FFDCE9FF', font: 'FF21304F' },
    28: { fill: 'FFC3D9FF', font: 'FF1F2F58' },
    29: { fill: 'FFA7C5EB', font: 'FF1E2B45' },
    30: { fill: 'FFB2E2F2', font: 'FF1F3942' }
};

// 세션 타입별 약어 매핑
const sessionTypeAbbreviations = {
    'Special Interest Group': 'SIG',
    'Parallel Symposium': 'PS',
    'Plenary Lecture': 'PL',
    'Plenary Session': 'PS',
    'Keynote Lecture': 'KL',
    'Keynote Speech': 'KS',
    'Workshop': 'WS',
    'Panel Discussion': 'PD',
    'Oral Presentation': 'OP',
    'Poster Session': 'Poster',
    'Luncheon Symposium': 'LS',
    'Breakfast Symposium': 'BS',
    'Satellite Symposium': 'SS',
    'Meet the Expert': 'MTE',
    'Case Presentation': 'CP',
    'Opening Ceremony': 'Opening',
    'Closing Ceremony': 'Closing',
    'Award Lecture': 'AL',
    'Presidential Lecture': 'PreL'
};

// 세션 타입의 약어를 가져오는 함수
function getSessionTypeAbbreviation(sessionType) {
    if (!sessionType) return '';
    
    // 매핑에 정확히 일치하는 것이 있으면 반환
    if (sessionTypeAbbreviations[sessionType]) {
        return sessionTypeAbbreviations[sessionType];
    }
    
    // 대소문자 무시하고 검색
    const lowerSessionType = sessionType.toLowerCase();
    for (const [key, value] of Object.entries(sessionTypeAbbreviations)) {
        if (key.toLowerCase() === lowerSessionType) {
            return value;
        }
    }
    
    // 매핑에 없으면 각 단어의 첫 글자를 조합하여 약어 생성
    const words = sessionType.split(/\s+/);
    if (words.length === 1) {
        // 단어가 하나면 첫 3글자 사용
        return sessionType.substring(0, 3).toUpperCase();
    } else {
        // 여러 단어면 각 단어의 첫 글자
        return words.map(word => word.charAt(0).toUpperCase()).join('');
    }
}

// 다중 선택 관련 변수
let isSelecting = false; // 다중 선택 모드
let selectedSessions = new Set(); // 선택된 세션 인덱스 Set
let selectionBox = null; // 선택 박스 요소
let selectionStartX = 0;
let selectionStartY = 0;

// 날짜 관련 변수
let eventDates = []; // 행사 날짜 배열
let currentSelectedDate = null; // 현재 선택된 날짜

// 세션 블록 표시 설정
let displaySettings = {
    showSessionType: true,
    showSessionTitle: true,
    showSessionChair: true,
    showSessionTime: true,
    showSpeakers: false,
    showSpeakerName: true,
    showSpeakerTopic: true,
    showSpeakerTime: true,
    chairNameLanguage: 'kor',
    speakerNameLanguage: 'kor'
};

let currentViewMode = 'calendar';
const excelViewState = {
    headers: [],
    rows: [],
    filteredRows: [],
    searchTerm: '',
    exportSettings: null,
    initialized: false,
    visibleColumnIndices: [],
    filters: {
        domesticChair: true,
        overseasChair: true,
        noChair: true,
        domesticSpeaker: true,
        overseasSpeaker: true,
        noSpeaker: true
    }
};

// Time settings - 구글 캘린더 스타일
let programStartTime = '08:00'; // 프로그램 시작 시간 (동적으로 변경 가능)
let programEndTime = '20:00';   // 프로그램 종료 시간 (동적으로 변경 가능)
const START_HOUR = 8;  // 기본 8시부터 시작 (하위 호환성)
const END_HOUR = 20;   // 기본 20시까지 표시 (하위 호환성)
const HOUR_HEIGHT = 240; // 240px per hour (넉넉한 간격)
const MINUTE_HEIGHT = 4; // 4px per minute (5분 = 20px, 15분 = 60px)

function getColorIdByPosition(position) {
    return getNextRandomColorId(true);
}

// 세션 타입별 색상 자동 할당 함수
function getColorForSessionType(sessionType) {
    if (!sessionType) {
        const colorId = getNextRandomColorId(true);
        standaloneSessionColors.add(colorId);
        markColorAsUsed(colorId);
        return colorId;
    }
    
    // 이미 할당된 색상이 있으면 반환
    if (sessionTypeColors.has(sessionType)) {
        return sessionTypeColors.get(sessionType);
    }
    
    // 새로운 세션 타입이면 우선순위가 높은 색상을 랜덤으로 할당
    const nextColor = getNextRandomColorId(true);
    sessionTypeColors.set(sessionType, nextColor);
    markColorAsUsed(nextColor);
    console.log(`🎨 Assigned color ${nextColor} to session type "${sessionType}"`);
    
    return nextColor;
}

// 세션 타입별 자동 번호 부여 함수 (날짜, 시간, 장소 순서로 정렬)
function assignSessionNumbers() {
    console.log('🔢 Assigning session numbers...');
    
    // 번호가 필요 없는 세션 타입/제목
    const noNumberingRequired = [
        'break', 'coffee break', 'lunch', 'lunch break',
        'opening ceremony', 'closing ceremony', 
        'general assembly', 'press conference',
        'presidential dinner', 'dinner', 'reception',
        'preparing dinner', '상임운영위원회',
        'poster', 'e-poster', 'eposter'
    ];
    
    // 세션 타입별로 그룹화 (번호가 필요한 세션만)
    const sessionsByType = new Map();
    
    sessions.forEach(session => {
        if (session.sessionType) {
            // 번호가 필요 없는 세션인지 확인
            const sessionTitleLower = (session.title || '').toLowerCase();
            const sessionTypeLower = (session.sessionType || '').toLowerCase();
            const isNoNumberingSession = noNumberingRequired.some(keyword => 
                sessionTitleLower.includes(keyword) || sessionTypeLower.includes(keyword)
            );
            
            if (!isNoNumberingSession) {
                // 번호가 필요한 세션만 그룹화
            if (!sessionsByType.has(session.sessionType)) {
                sessionsByType.set(session.sessionType, []);
            }
            sessionsByType.get(session.sessionType).push(session);
            } else {
                // 번호가 필요 없는 세션은 약어만 설정 (엑셀에서 가져온 약어만 사용)
                const abbreviation = session.sessionAbbreviation || session.displayAbbreviation || '';
                session.displaySessionType = session.sessionType;
                session.displayAbbreviation = abbreviation;
                console.log(`  ⏭️ Skipping numbering for "${session.title}": ${abbreviation || '(no abbreviation)'}`);
            }
        }
    });
    
    // 각 세션 타입별로 번호 부여
    sessionsByType.forEach((typeSessions, sessionType) => {
        console.log(`📋 Processing ${typeSessions.length} sessions of type "${sessionType}"`);
        
        // 고유한 세션 그룹 수 계산 (같은 제목, 시간, 날짜, 좌장은 하나로 카운트)
        const uniqueGroups = new Set();
        typeSessions.forEach(session => {
            const chairInfo = session.chair || 'no-chair';
            const groupKey = `${session.title}_${session.startTime}_${session.date || 'no-date'}_${chairInfo}`;
            uniqueGroups.add(groupKey);
        });
        
        const uniqueGroupCount = uniqueGroups.size;
        console.log(`  📊 Unique session groups: ${uniqueGroupCount}`);
        
        // 고유 세션 그룹이 1개만 있으면 번호를 붙이지 않음
        if (uniqueGroupCount === 1) {
            typeSessions.forEach(session => {
                // 엑셀에서 가져온 원본 약어(sessionAbbreviation) 우선 사용
                // displayAbbreviation에 번호가 포함되어 있을 수 있으므로, 원본 약어를 추출
                let abbreviation = session.sessionAbbreviation || '';
                
                // sessionAbbreviation이 없고 displayAbbreviation이 있으면, 번호를 제거한 원본 약어 추출
                if (!abbreviation && session.displayAbbreviation) {
                    // displayAbbreviation에서 끝의 숫자와 공백 제거 (예: "SIG 4" -> "SIG")
                    const match = session.displayAbbreviation.match(/^(.+?)\s*\d+$/);
                    if (match) {
                        abbreviation = match[1].trim();
                    } else {
                        abbreviation = session.displayAbbreviation.trim();
                    }
                }
                
                // 번호 없이 저장
                session.displaySessionType = sessionType;
                session.displayAbbreviation = abbreviation;
                console.log(`  ${abbreviation || '(no abbreviation)'} [${sessionType}] (단일 세션 - 번호 없음): ${session.date || 'no-date'}, ${session.startTime}-${session.endTime} at ${session.venue}`);
            });
            return;
        }
        
        // 해당 세션 타입의 세션들만 추출하여 날짜, 시간, 장소 순서로 정렬
        const sortedTypeSessions = [...typeSessions].sort((a, b) => {
            // 1. 날짜 순서 (빠른 날짜가 먼저)
            const dateA = a.date || '9999-12-31'; // 날짜 없으면 가장 뒤로
            const dateB = b.date || '9999-12-31';
            const dateCompare = dateA.localeCompare(dateB);
            if (dateCompare !== 0) {
                console.log(`  📅 Date compare: "${dateA}" vs "${dateB}" = ${dateCompare}`);
                return dateCompare;
            }
            
            // 2. 시간 순서 (시작 시간)
            const timeCompare = a.startTime.localeCompare(b.startTime);
            if (timeCompare !== 0) {
                console.log(`  ⏰ Time compare: "${a.startTime}" vs "${b.startTime}"`);
                return timeCompare;
            }
            
            // 3. 장소 순서 (알파벳 순)
            const venueCompare = a.venue.localeCompare(b.venue);
            if (venueCompare !== 0) {
                console.log(`  📍 Venue compare: "${a.venue}" vs "${b.venue}"`);
            }
            return venueCompare;
        });
        
        console.log(`  📊 Sorted ${sortedTypeSessions.length} sessions by date → time → venue`);
        
        // 정렬된 순서대로 번호 부여
        // 같은 세션 (제목, 시간, 날짜가 동일)은 같은 번호 부여
        let sessionNumber = 1;
        const processedSessions = new Set(); // 이미 번호를 부여한 세션 그룹 추적
        
        sortedTypeSessions.forEach(session => {
            // 세션 그룹 키 생성 (제목 + 시작시간 + 날짜 + 좌장)
            // 제목이 "TBD" 같은 일반적인 경우 좌장 정보 포함
            const chairInfo = session.chair || 'no-chair';
            const sessionGroupKey = `${session.title}_${session.startTime}_${session.date || 'no-date'}_${chairInfo}`;
            
            // 이미 번호를 부여한 그룹인지 확인
            let currentNumber;
            if (processedSessions.has(sessionGroupKey)) {
                // 같은 그룹의 세션 찾기
                const sameGroupSession = sortedTypeSessions.find(s => 
                    s.title === session.title &&
                    s.startTime === session.startTime &&
                    (s.date || 'no-date') === (session.date || 'no-date') &&
                    (s.chair || 'no-chair') === (session.chair || 'no-chair') &&
                    s.displayAbbreviation  // 이미 번호가 부여된 세션
                );
                if (sameGroupSession) {
                    // 같은 그룹의 번호 사용
                    const match = sameGroupSession.displayAbbreviation.match(/(\d+)$/);
                    currentNumber = match ? parseInt(match[1]) : sessionNumber;
                    console.log(`  🔗 Same group session found, using number: ${currentNumber}`);
                } else {
                    currentNumber = sessionNumber;
                }
            } else {
                // 새 그룹
                currentNumber = sessionNumber;
                processedSessions.add(sessionGroupKey);
                sessionNumber++; // 다음 그룹을 위해 증가
            }
            
            // 약어 결정: 엑셀에서 업로드된 원본 약어(sessionAbbreviation) 우선 사용
            // displayAbbreviation에 번호가 포함되어 있을 수 있으므로, 원본 약어를 추출
            let abbreviation = session.sessionAbbreviation || '';
            
            // sessionAbbreviation이 없고 displayAbbreviation이 있으면, 번호를 제거한 원본 약어 추출
            if (!abbreviation && session.displayAbbreviation) {
                // displayAbbreviation에서 끝의 숫자와 공백 제거 (예: "SIG 4" -> "SIG")
                const match = session.displayAbbreviation.match(/^(.+?)\s*\d+$/);
                if (match) {
                    abbreviation = match[1].trim();
                } else {
                    abbreviation = session.displayAbbreviation.trim();
                }
            }
            
            if (abbreviation) {
                console.log(`  📝 Using abbreviation: "${abbreviation}" (from sessionAbbreviation: ${session.sessionAbbreviation || 'none'}, displayAbbreviation: ${session.displayAbbreviation || 'none'})`);
            } else {
                console.log(`  📝 No abbreviation provided`);
            }
            
            // 약어와 번호를 함께 저장
            session.displaySessionType = `${sessionType} ${currentNumber}`;
            session.displayAbbreviation = abbreviation ? `${abbreviation} ${currentNumber}` : '';
            console.log(`  ✅ ${abbreviation ? `${abbreviation} ${currentNumber}` : '(no abbreviation)'} [${sessionType} ${currentNumber}]: ${session.date || 'no-date'}, ${session.startTime}-${session.endTime} at ${session.venue}`);
        });
    });
    
    console.log('✅ Session numbers assigned');
}

// ============================================================
// 날짜 탭 관련 함수들
// ============================================================

function initializeDateTabs() {
    const startDate = document.body.getAttribute('data-start-date');
    const endDate = document.body.getAttribute('data-end-date');
    
    if (!startDate || !endDate) {
        console.log('No event dates found');
        return;
    }
    
    // 날짜 배열 생성
    eventDates = generateDateRange(startDate, endDate);
    console.log('📅 Event dates:', eventDates);
    
    // 행사가 하루만인 경우 탭 표시 안 함
    if (eventDates.length <= 1) {
        currentSelectedDate = normalizeDateValue(eventDates[0]) || eventDates[0];
        console.log('Single day event, no tabs needed');
        return;
    }
    
    // 날짜 탭 생성
    const dateTabsContainer = document.getElementById('dateTabs');
    dateTabsContainer.style.display = 'flex';
    
    dateTabsContainer.innerHTML = '<span class="date-tabs-label">날짜 선택:</span>';
    
    eventDates.forEach((date, index) => {
        const tab = document.createElement('div');
        tab.className = 'date-tab';
        tab.onclick = () => selectDate(date);
        
        const dateObj = new Date(date);
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        const dayName = dayNames[dateObj.getDay()];
        const formattedDate = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
        
        tab.innerHTML = `
            <div class="date-tab-date">${formattedDate}</div>
            <div class="date-tab-day">${dayName}요일</div>
        `;
        
        dateTabsContainer.appendChild(tab);
    });
    
    // 첫 번째 날짜 선택
    selectDate(eventDates[0]);
}

function generateDateRange(startDate, endDate) {
    const dates = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    let current = new Date(start);
    while (current <= end) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
    }
    
    return dates;
}

function selectDate(date) {
    console.log(`📅 Selecting date: ${date}`);
    const normalizedDate = normalizeDateValue(date) || date;
    const hasSessionsForDate = sessions.length > 0 && sessions.some(session =>
        datesMatchForFilter(session.date, normalizedDate)
    );

    if (sessions.length > 0 && !hasSessionsForDate) {
        console.log(`⚠️ No sessions found for ${normalizedDate}, clearing date filter`);
        currentSelectedDate = null;
        const tabs = document.querySelectorAll('.date-tab');
        tabs.forEach(tab => tab.classList.remove('active'));
        renderSessions();
        return;
    }

    currentSelectedDate = normalizedDate;

    // 탭 활성화 상태 업데이트
    const tabs = document.querySelectorAll('.date-tab');
    tabs.forEach((tab, index) => {
        const tabDateNormalized = normalizeDateValue(eventDates[index]) || eventDates[index];
        if (datesMatchForFilter(tabDateNormalized, normalizedDate)) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    // 선택된 날짜의 세션만 표시
    renderSessions();
}

// ============================================================
// Initialize the page
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    initializeDateTabs(); // 날짜 탭 초기화
    initializeCalendar();
    loadDisplaySettings(); // 표시 설정 로드
    loadProgram();
    loadVenues();
    loadParticipants();
    setupEventListeners();
    initializeViewModeControls();
    // startCurrentTimeIndicator(); // 현재 시간 표시선 제거됨
    
    // 자동 충돌 해결 비활성화 (날짜별 세션 혼합 방지)
    // 레이어링 시스템이 이미 겹치는 세션을 처리하므로 불필요
    // setTimeout(() => {
    //     console.log('🚀 Auto-executing collision resolution...');
    //     forceResolveAllCollisions();
    // }, 2000);
});

function initializeCalendar() {
    createTimeSlots();
    setupGridClickHandlers();
}

function createTimeSlots() {
    const timeSlotsContainer = document.getElementById('scrollTimeSlots');
    timeSlotsContainer.innerHTML = '';
    
    // programStartTime과 programEndTime을 사용하여 동적으로 시간 슬롯 생성
    const startMinutes = timeToMinutes(programStartTime);
    const endMinutes = timeToMinutes(programEndTime);
    const startHour = Math.floor(startMinutes / 60);
    const endHour = Math.ceil(endMinutes / 60);
    
    console.log('🕐 Creating time slots:', {
        programStartTime,
        programEndTime,
        startHour,
        endHour,
        totalHours: endHour - startHour
    });
    
    for (let hour = startHour; hour < endHour; hour++) {
        const timeSlot = document.createElement('div');
        const timeString = formatTime12Hour(hour);
        
        timeSlot.className = 'time-slot';
        timeSlot.textContent = timeString;
        timeSlotsContainer.appendChild(timeSlot);
    }
}

/**
 * 시간 그리드 렌더링 (별칭)
 */
function renderTimeGrid() {
    createTimeSlots();
}

function formatTime12Hour(hour, minute = 0) {
    let displayHour = hour;
    let period = 'AM';
    
    if (hour === 0) {
        displayHour = 12;
    } else if (hour > 12) {
        displayHour = hour - 12;
        period = 'PM';
    } else if (hour === 12) {
        period = 'PM';
    }
    
    if (minute === 0) {
        return `${displayHour} ${period}`;
    } else {
        return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
    }
}

function formatTimeRange12Hour(startTime, endTime) {
    const startHour = parseInt(startTime.split(':')[0]);
    const startMinute = parseInt(startTime.split(':')[1]);
    const endHour = parseInt(endTime.split(':')[0]);
    const endMinute = parseInt(endTime.split(':')[1]);
    
    // 올바른 12시간 형식으로 변환
    const startStr = formatTime12Hour(startHour, startMinute);
    const endStr = formatTime12Hour(endHour, endMinute);
    
    return `${startStr} - ${endStr}`;
}

function setupGridClickHandlers() {
    // 모든 장소의 세션 영역에 클릭 핸들러 추가
    venues.forEach((venue, venueIndex) => {
        const venueSessionsArea = document.getElementById(`venueSessionsArea_${venueIndex}`);
        if (!venueSessionsArea) return;
        
        venueSessionsArea.addEventListener('click', function(e) {
            // 드래그 중이거나 리사이즈 중일 때는 클릭 이벤트 무시
            if (isDragging || isResizing) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            
            // 드래그 또는 리사이즈 종료 후 300ms 동안 클릭 이벤트 무시 (빠른 세션 추가 방지)
            const now = Date.now();
            if (now - dragEndTime < 300 || now - resizeEndTime < 300) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            
            if (e.target === venueSessionsArea) {
                const rect = venueSessionsArea.getBoundingClientRect();
            const scrollTop = document.getElementById('scrollContainer').scrollTop;
            const y = e.clientY - rect.top + scrollTop;
            const time = calculateTimeFromY(y);
                showQuickAddModal(time, venue.name);
            }
        });
        
        venueSessionsArea.addEventListener('dblclick', function(e) {
            // 드래그 중이거나 리사이즈 중일 때는 더블클릭 이벤트 무시
            if (isDragging || isResizing) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            
            // 드래그 또는 리사이즈 종료 후 300ms 동안 더블클릭 이벤트 무시
            const now = Date.now();
            if (now - dragEndTime < 300 || now - resizeEndTime < 300) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            
            if (e.target === venueSessionsArea) {
                const rect = venueSessionsArea.getBoundingClientRect();
            const scrollTop = document.getElementById('scrollContainer').scrollTop;
            const y = e.clientY - rect.top + scrollTop;
            const time = calculateTimeFromY(y);
                showQuickAddModal(time, venue.name);
        }
        });
    });
}

function snapToGrid(time) {
    const [hours, minutes] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;
    const snappedMinutes = Math.round(totalMinutes / 5) * 5; // 5분 단위로 스냅
    const snappedHours = Math.floor(snappedMinutes / 60);
    const snappedMins = snappedMinutes % 60;
    return `${snappedHours.toString().padStart(2, '0')}:${snappedMins.toString().padStart(2, '0')}`;
}

function calculateTimeFromY(y) {
    // MINUTE_HEIGHT px per minute (4px per minute)
    const totalMinutes = Math.floor(y / MINUTE_HEIGHT);
    
    // programStartTime을 기준으로 계산
    const startMinutes = timeToMinutes(programStartTime);
    const actualMinutes = startMinutes + totalMinutes;
    
    const hours = Math.floor(actualMinutes / 60);
    const minutes = actualMinutes % 60;
    
    // Round to nearest 5 minutes
    const roundedMinutes = Math.round(minutes / 5) * 5;
    
    return `${hours.toString().padStart(2, '0')}:${roundedMinutes.toString().padStart(2, '0')}`;
}

function calculateYFromTime(time) {
    const [hours, minutes] = time.split(':').map(Number);
    const timeMinutes = hours * 60 + minutes;
    
    // programStartTime을 기준으로 계산
    const startMinutes = timeToMinutes(programStartTime);
    const relativeMinutes = timeMinutes - startMinutes;
    
    // MINUTE_HEIGHT를 곱하여 픽셀 단위로 변환
    return relativeMinutes * MINUTE_HEIGHT; // 4px per minute, 240px per hour
}

// 현재 시간 표시선 기능 제거됨 (사용자 요청)
// function startCurrentTimeIndicator() {
//     updateCurrentTimeIndicator();
//     // Update every minute
//     setInterval(updateCurrentTimeIndicator, 60000);
// }

// function updateCurrentTimeIndicator() {
//     const now = new Date();
//     const currentHour = now.getHours();
//     const currentMinute = now.getMinutes();
//     
//     // Only show indicator if within our time range
//     if (currentHour >= START_HOUR && currentHour < END_HOUR) {
//         const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
//         const y = calculateYFromTime(currentTime);
//         
//         let indicator = document.querySelector('.current-time-indicator');
//         if (!indicator) {
//             indicator = document.createElement('div');
//             indicator.className = 'current-time-indicator';
//             
//             // 새로운 구조에서는 scrollVenuesArea를 사용
//             const venuesArea = document.getElementById('scrollVenuesArea');
//             if (venuesArea) {
//                 venuesArea.appendChild(indicator);
//             } else {
//                 console.log('scrollVenuesArea not found, cannot add current time indicator');
//                 return;
//             }
//         }
//         
//         indicator.style.top = `${y}px`;
//         indicator.style.display = 'block';
//     } else {
//         const indicator = document.querySelector('.current-time-indicator');
//         if (indicator) {
//             indicator.style.display = 'none';
//         }
//     }
// }

function showQuickAddModal(startTime, venueName = null) {
    const snappedStartTime = snapToGrid(startTime);
    const endTime = addMinutesToTime(snappedStartTime, 60); // Default 1 hour
    document.getElementById('selectedTimeRange').textContent = `${snappedStartTime} - ${endTime}`;
    document.getElementById('quickSessionModal').style.display = 'block';
    
    // Store the selected time for later use
    window.selectedStartTime = snappedStartTime;
    window.selectedEndTime = endTime;
    
    // 장소가 지정된 경우 해당 장소를 선택
    if (venueName) {
        const venueSelect = document.getElementById('quickSessionVenue');
        venueSelect.value = venueName;
    }
}

function addMinutesToTime(time, minutes) {
    const [hours, mins] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60);
    const newMins = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
}
function setupEventListeners() {
    // Sidebar toggle functionality
    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    const sidebar = document.getElementById('sidebar');
    
    if (sidebarToggleBtn && sidebar) {
        sidebarToggleBtn.addEventListener('click', function() {
            sidebar.classList.toggle('collapsed');
        });
    }
    
    // Participant search input event listener
    const searchInput = document.getElementById('participantSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            searchParticipants(e.target.value);
        });
    }

    // ESC 키로 모달 닫기, Delete 키로 세션 삭제
    document.addEventListener('keydown', function(event) {
        // Delete 키로 선택된 세션 삭제
        if ((event.key === 'Delete' || event.key === 'Backspace' || event.keyCode === 46 || event.keyCode === 8) && 
            isSelecting && selectedSessions.size > 0) {
            // 입력 필드에서 타이핑 중이 아닌지 확인
            const activeElement = document.activeElement;
            const isTyping = activeElement && (
                activeElement.tagName === 'INPUT' || 
                activeElement.tagName === 'TEXTAREA' || 
                activeElement.isContentEditable
            );
            
            if (!isTyping) {
                console.log(`Delete key pressed - deleting ${selectedSessions.size} selected sessions`);
                event.preventDefault(); // 브라우저 뒤로가기 방지 (Backspace)
                deleteSelectedSessions();
                return;
            }
        }
        
        if (event.key === 'Escape' || event.keyCode === 27) {
            console.log('ESC key pressed - closing modals');
            
            // 모달이 보이는지 확인하는 헬퍼 함수
            const isModalVisible = (modal) => {
                if (!modal) return false;
                const display = window.getComputedStyle(modal).display;
                return display === 'block' || display === 'flex';
            };
            
            // 엑셀 업로드 관련 모달들 (업로드 취소)
            const confirmMissingModal = document.getElementById('confirmMissingParticipantModal');
            if (isModalVisible(confirmMissingModal)) {
                console.log('Closing confirm missing participant modal and cancelling upload');
                skipMissingParticipant(); // 업로드 취소
                return;
            }
            
            const duplicateModal = document.getElementById('duplicateNameModal');
            if (isModalVisible(duplicateModal)) {
                console.log('Closing duplicate name modal - ESC pressed');
                
                // callback에 null을 전달하여 건너뛰기 처리 (임시 참가자로 추가)
                if (currentDuplicateModal && currentDuplicateModal.callback) {
                    console.log('Calling callback with null (skip)');
                    currentDuplicateModal.callback(null);
                }
                
                closeDuplicateNameModal();
                return;
            }
            
            const excelSearchModal = document.getElementById('excelParticipantSearchModal');
            if (isModalVisible(excelSearchModal)) {
                console.log('Closing excel participant search modal');
                closeExcelParticipantSearchModal();
                return;
            }
            
            const addParticipantModal = document.getElementById('addParticipantModal');
            if (isModalVisible(addParticipantModal)) {
                console.log('Closing add participant modal');
                closeAddParticipantModal();
                return;
            }
            
            // 엑셀 업로드 모달
            const excelUploadModal = document.getElementById('excelUploadModal');
            if (isModalVisible(excelUploadModal)) {
                console.log('Closing excel upload modal');
                closeExcelUploadModal();
                return;
            }
            
            // 일반 모달들
            const sessionModal = document.getElementById('sessionModal');
            if (isModalVisible(sessionModal)) {
                closeSessionModal();
                return;
            }
            
            const quickModal = document.getElementById('quickSessionModal');
            if (isModalVisible(quickModal)) {
                closeQuickSessionModal();
                return;
            }
            
            const colorModal = document.getElementById('colorPickerModal');
            if (isModalVisible(colorModal)) {
                closeColorPickerModal();
                return;
            }
            
            const participantModal = document.getElementById('participantSearchModal');
            if (isModalVisible(participantModal)) {
                closeParticipantSearchModal();
                return;
            }
            
            const venueModal = document.getElementById('venueModal');
            if (isModalVisible(venueModal)) {
                closeVenueModal();
                return;
            }
            
            const timeSettingsModal = document.getElementById('timeSettingsModal');
            if (isModalVisible(timeSettingsModal)) {
                closeTimeSettingsModal();
                return;
            }
            
            const displaySettingsModal = document.getElementById('displaySettingsModal');
            if (isModalVisible(displaySettingsModal)) {
                closeDisplaySettingsModal();
                return;
            }
            
            const exportSettingsModal = document.getElementById('exportSettingsModal');
            if (isModalVisible(exportSettingsModal)) {
                closeExportSettingsModal();
                return;
            }
        }
    });

    // Modal close on outside click
    window.onclick = function(event) {
        const sessionModal = document.getElementById('sessionModal');
        const quickModal = document.getElementById('quickSessionModal');
        const colorModal = document.getElementById('colorPickerModal');
        const participantModal = document.getElementById('participantSearchModal');
        const exportSettingsModal = document.getElementById('exportSettingsModal');
        
        if (event.target === sessionModal) {
            closeSessionModal();
        }
        if (event.target === quickModal) {
            closeQuickSessionModal();
        }
        if (event.target === colorModal) {
            closeColorPickerModal();
        }
        if (event.target === participantModal) {
            closeParticipantSearchModal();
        }
        if (event.target === exportSettingsModal) {
            closeExportSettingsModal();
        }
    }
    
    // Global mouse events for drag and drop and resize
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // Add resize event listeners to session blocks (delegated)
    document.addEventListener('mousedown', handleResizeStart);
}

// Resize event handlers
function handleResizeStart(e) {
    // 이메일 모달이나 다른 모달이 열려있으면 리사이즈 처리하지 않음
    const emailModal = document.getElementById('emailComposeModal');
    const sessionModal = document.getElementById('sessionModal');
    const exportModal = document.getElementById('exportSettingsModal');
    const displayModal = document.getElementById('displaySettingsModal');
    
    if ((emailModal && emailModal.style.display === 'block') ||
        (sessionModal && sessionModal.style.display === 'block') ||
        (exportModal && exportModal.style.display === 'block') ||
        (displayModal && displayModal.style.display === 'block')) {
        return;
    }
    
    // 모달 내부 요소에서 발생한 이벤트는 무시
    if (e.target.closest('.modal')) {
        return;
    }
    
    const resizeHandle = e.target.closest('.resize-handle');
    
    if (!resizeHandle) {
        return;
    }
    
    // 툴팁 숨기기 및 타이머 취소
    if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
        tooltipTimeout = null;
    }
    hideSessionTooltip();
    
    e.preventDefault();
    e.stopPropagation();
    
    const sessionBlock = resizeHandle.closest('.session-block');
    
    if (!sessionBlock) {
        return;
    }
    
    isResizing = true;
    currentResizeSession = sessionBlock;
    currentResizeHandle = resizeHandle.dataset.resize;
    resizeStartY = e.clientY;
    resizeStartHeight = sessionBlock.offsetHeight;
    resizeStartTop = parseInt(sessionBlock.style.top);
    
    // Add resizing class for visual feedback
    sessionBlock.classList.add('resizing');
    
    // 마우스 커서 스타일 변경
    document.body.style.cursor = 'ns-resize';
}

function handleResizeMove(e) {
    if (!isResizing || !currentResizeSession || currentResizeHandle !== 'bottom') return;
    
    // requestAnimationFrame으로 성능 최적화
    if (resizeAnimationFrame) {
        cancelAnimationFrame(resizeAnimationFrame);
    }
    
    resizeAnimationFrame = requestAnimationFrame(() => {
        const deltaY = e.clientY - resizeStartY;
        const newHeight = Math.max(30, resizeStartHeight + deltaY);
        
        // Snap to time grid (15-minute intervals)
        const HOUR_HEIGHT = 60; // 1시간 = 60px
        const snappedHeight = Math.round(newHeight / 15) * 15; // 15분 단위로 스냅
        
        // Apply the resize (only height changes for bottom handle)
        currentResizeSession.style.height = snappedHeight + 'px';
        
        // 시간 표시도 즉시 업데이트
        const sessionIndex = parseInt(currentResizeSession.dataset.sessionIndex);
        if (!isNaN(sessionIndex) && sessionIndex >= 0 && sessionIndex < sessions.length) {
            const session = sessions[sessionIndex];
            const currentTop = parseFloat(currentResizeSession.style.top);
            const currentHeight = parseFloat(currentResizeSession.style.height);
            
            const startTime = calculateTimeFromY(currentTop);
            const endTime = calculateTimeFromY(currentTop + currentHeight);
            
            const timeElement = currentResizeSession.querySelector('.session-time');
            if (timeElement) {
                const newTimeText = formatTimeRange12Hour(startTime, endTime);
                timeElement.textContent = newTimeText;
            }
        }
    });
}

function updateSessionTimeAfterResize() {
    if (!currentResizeSession || currentResizeHandle !== 'bottom') return;
    
    const sessionIndex = parseInt(currentResizeSession.dataset.sessionIndex);
    const session = sessions[sessionIndex];
    if (!session) return;
    
    const currentTop = parseInt(currentResizeSession.style.top);
    const currentHeight = parseInt(currentResizeSession.style.height);
    
    // Convert pixels to time (only end time changes for bottom resize)
    const HOUR_HEIGHT = 60; // 1시간 = 60px
    
    // Start time remains the same, only end time changes
    const startMinutes = Math.round((currentTop / HOUR_HEIGHT) * 60);
    const endMinutes = Math.round(((currentTop + currentHeight) / HOUR_HEIGHT) * 60);
    
    const newStartTime = minutesToTimeString(startMinutes);
    const newEndTime = minutesToTimeString(endMinutes);
    
    console.log('=== UPDATE SESSION TIME (BOTTOM RESIZE) ===');
    console.log('Session index:', sessionIndex);
    console.log('Old time:', session.startTime, '-', session.endTime);
    console.log('New time:', newStartTime, '-', newEndTime);
    console.log('Top:', currentTop, 'Height:', currentHeight);
    
    // Update session data (only end time changes)
    session.endTime = newEndTime;
    
    // Update the time display in the session block
    const timeElement = currentResizeSession.querySelector('.session-time');
    if (timeElement) {
        timeElement.textContent = formatTimeRange12Hour(session.startTime, newEndTime);
    }
    
    console.log('✅ Session end time updated successfully');
}

function minutesToTimeString(minutes) {
    const hours = Math.floor(minutes / 60) + 8; // 8:00 AM부터 시작
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function handleMouseMove(e) {
    // 마우스 위치 저장 (venue 변경 감지용)
    window.lastMouseX = e.clientX;
    window.lastMouseY = e.clientY;
    
    // 드래그 중 텍스트 선택 방지
    if (isDragging || isResizing) {
        e.preventDefault();
    }
    
    // Handle resize
    if (isResizing && currentResizeSession) {
        handleResizeMove(e);
        return;
    }
    
    if (isDragging && currentDragSession && currentDragSession.dataset) {
        // requestAnimationFrame으로 성능 최적화
        if (dragAnimationFrame) {
            cancelAnimationFrame(dragAnimationFrame);
        }
        
        dragAnimationFrame = requestAnimationFrame(() => {
            // 마우스 위치에서 가장 가까운 venue 찾기
            const mouseX = e.clientX;
            const mouseY = e.clientY;
            
            let targetVenueArea = null;
            let targetVenueIndex = -1;
            let minDistance = Infinity;
            
            // 모든 venue area의 하이라이트 제거
            venues.forEach((venue, venueIndex) => {
                const venueArea = document.getElementById(`venueSessionsArea_${venueIndex}`);
                if (venueArea) {
                    venueArea.classList.remove('drag-over');
                }
            });
            
            // 모든 venue area를 순회하며 마우스와 가장 가까운 것 찾기
            venues.forEach((venue, venueIndex) => {
                const venueArea = document.getElementById(`venueSessionsArea_${venueIndex}`);
                if (venueArea) {
                    const rect = venueArea.getBoundingClientRect();
                    // 마우스가 venue 영역 안에 있는지 확인
                    if (mouseX >= rect.left && mouseX <= rect.right &&
                        mouseY >= rect.top && mouseY <= rect.bottom) {
                        targetVenueArea = venueArea;
                        targetVenueIndex = venueIndex;
                        minDistance = 0;
                    } else if (minDistance > 0) {
                        // 영역 밖이면 가장 가까운 venue 계산
                        const centerX = rect.left + rect.width / 2;
                        const distance = Math.abs(mouseX - centerX);
                        if (distance < minDistance) {
                            minDistance = distance;
                            targetVenueArea = venueArea;
                            targetVenueIndex = venueIndex;
                        }
                    }
                }
            });
            
            // 타겟 venue가 없으면 원래 venue 사용
            if (!targetVenueArea) {
                targetVenueArea = currentDragSession.closest('.venue-sessions-area');
            }
            
            if (!targetVenueArea) {
                console.log('No venue sessions area found');
                return;
            }
            
            // 타겟 venue에 하이라이트 추가
            targetVenueArea.classList.add('drag-over');
            
            // 세션 블록이 다른 venue로 이동해야 하는지 확인
            const currentParent = currentDragSession.parentElement;
            if (currentParent !== targetVenueArea) {
                // 세션 블록을 새로운 venue로 실시간 이동
                console.log(`🔄 Moving session block to venue ${targetVenueIndex} during drag`);
                targetVenueArea.appendChild(currentDragSession);
            }
            
            const venueRect = targetVenueArea.getBoundingClientRect();
        const scrollTop = document.getElementById('scrollContainer').scrollTop;
            const relativeMouseY = e.clientY - venueRect.top + scrollTop;
            
            // 드래그 오프셋을 고려하여 세션 블록의 새로운 위치 계산
            const targetY = relativeMouseY - dragOffsetY;
            const newTime = snapToGrid(calculateTimeFromY(targetY));
            
            // 실시간 드래그 - DOM 위치만 즉시 업데이트 (성능 최적화)
        const sessionIndex = parseInt(currentDragSession.dataset.sessionIndex);
            if (isNaN(sessionIndex) || sessionIndex < 0 || sessionIndex >= sessions.length) {
                console.log('Invalid session index during drag:', sessionIndex);
                return;
            }
            
        const session = sessions[sessionIndex];
        const duration = getTimeDifference(session.startTime, session.endTime);
            
            // 시간 제한 적용
            const constrainedTime = constrainTimeToRange(newTime, duration);
            
            // 실시간 DOM 위치 업데이트 (빠른 시각적 피드백)
            const startY = calculateYFromTime(constrainedTime);
            const endY = calculateYFromTime(addMinutesToTime(constrainedTime, duration));
            const height = endY - startY;
            
            // 즉시 DOM 업데이트 (성능 최적화)
            currentDragSession.style.top = `${startY}px`;
            currentDragSession.style.height = `${height}px`;
            
            // 시간 표시도 즉시 업데이트
            const timeElement = currentDragSession.querySelector('.session-time');
            if (timeElement) {
                const newTimeText = formatTimeRange12Hour(constrainedTime, addMinutesToTime(constrainedTime, duration));
                timeElement.textContent = newTimeText;
            }
            
            // 세션 데이터는 드래그 완료 시에만 업데이트 (성능 최적화)
            // session.startTime과 session.endTime은 handleMouseUp에서 업데이트
        });
    }
    
    if (isResizing && currentResizeSession && currentResizeSession.dataset) {
        console.log('=== RESIZE MOVE ===');
        // 즉시 실행하여 더 반응성 있는 리사이즈
        const sessionsArea = document.getElementById('scrollSessionsArea');
        if (!sessionsArea) {
            console.log('No sessions area found during resize');
            return;
        }
        
        const rect = sessionsArea.getBoundingClientRect();
        const scrollTop = document.getElementById('scrollContainer').scrollTop;
        const y = e.clientY - rect.top + scrollTop;
        const newTime = snapToGrid(calculateTimeFromY(y));
        
        console.log('Resize move calculations:', {
            y: y,
            newTime: newTime,
            handle: currentResizeHandle
        });
        
        const sessionIndex = parseInt(currentResizeSession.dataset.sessionIndex);
        if (isNaN(sessionIndex) || sessionIndex < 0 || sessionIndex >= sessions.length) {
            console.log('Invalid session index during resize:', sessionIndex);
            return;
        }
        
        const session = sessions[sessionIndex];
        
        if (currentResizeHandle === 'top') {
            // 시작 시간이 종료 시간보다 이전이고, 최소 시작 시간(8AM) 이후여야 함
            const minStartTime = `${START_HOUR.toString().padStart(2, '0')}:00`;
            const constrainedStartTime = constrainTime(newTime, minStartTime, session.endTime);
            session.startTime = constrainedStartTime;
            console.log('Updated start time:', session.startTime);
        } else if (currentResizeHandle === 'bottom') {
            // 종료 시간이 시작 시간보다 이후이고, 최대 종료 시간(8PM) 이전이어야 함
            const maxEndTime = `${END_HOUR.toString().padStart(2, '0')}:00`;
            const constrainedEndTime = constrainTime(newTime, session.startTime, maxEndTime);
            session.endTime = constrainedEndTime;
            console.log('Updated end time:', session.endTime);
        }
        
        updateSessionPosition(currentResizeSession, session);
    }
}

function handleMouseUp() {
    if (!isDragging && !isResizing) {
        return;
    }

    if (isDragging) {
        dragEndTime = Date.now();

        if (currentDragSession) {
            const sessionIndex = parseInt(currentDragSession.dataset.sessionIndex);
            if (!isNaN(sessionIndex) && sessionIndex >= 0 && sessionIndex < sessions.length) {
                const session = sessions[sessionIndex];
                const currentTop = parseFloat(currentDragSession.style.top);
                const newStartTime = calculateTimeFromY(currentTop);
                const duration = getTimeDifference(session.startTime, session.endTime);

                const oldStartTime = session.startTime;
                const newConstrainedStartTime = constrainTimeToRange(newStartTime, duration);
                const timeShiftMinutes = getTimeDifference(oldStartTime, newConstrainedStartTime);

                console.log(`⏰ Time shift: ${timeShiftMinutes} minutes (${oldStartTime} → ${newConstrainedStartTime})`);

                session.startTime = newConstrainedStartTime;
                session.endTime = addMinutesToTime(session.startTime, duration);

                if (session.speakers && session.speakers.length > 0 && timeShiftMinutes !== 0) {
                    console.log(`📢 Adjusting ${session.speakers.length} speaker times by ${timeShiftMinutes} minutes`);
                    session.speakers.forEach((speaker, idx) => {
                        const oldSpeakerStart = speaker.startTime;
                        const oldSpeakerEnd = speaker.endTime;

                        speaker.startTime = addMinutesToTime(speaker.startTime, timeShiftMinutes);
                        speaker.endTime = addMinutesToTime(speaker.endTime, timeShiftMinutes);

                        console.log(`  Speaker ${idx + 1}: ${oldSpeakerStart}-${oldSpeakerEnd} → ${speaker.startTime}-${speaker.endTime}`);
                    });
                }

                const mouseX = window.lastMouseX || 0;
                const mouseY = window.lastMouseY || 0;

                let newVenueName = session.venue;

                venues.forEach((venue, venueIndex) => {
                    const venueArea = document.getElementById(`venueSessionsArea_${venueIndex}`);
                    if (venueArea) {
                        const rect = venueArea.getBoundingClientRect();
                        if (mouseX >= rect.left && mouseX <= rect.right &&
                            mouseY >= rect.top && mouseY <= rect.bottom) {
                            newVenueName = venue.name;
                        }
                    }
                });

                if (session.venue !== newVenueName) {
                    console.log(`🔄 Venue changed: "${session.venue}" → "${newVenueName}"`);
                    session.venue = newVenueName;
                    saveProgram();
                    renderSessions();
                } else {
                    console.log('Final session time update:', {
                        startTime: session.startTime,
                        endTime: session.endTime,
                        venue: session.venue
                    });
                }
            }
        }

        dragOffsetY = 0;
    }

    if (isResizing) {
        resizeEndTime = Date.now();
        updateSessionTimeAfterResize();
        console.log('💾 Saving after resize');
        saveProgram();
    }

    if (isDragging) {
        console.log('💾 Saving after drag');
        saveProgram();
    }

    isDragging = false;
    isResizing = false;
    currentDragSession = null;
    currentResizeSession = null;
    currentResizeHandle = null;

    if (dragAnimationFrame) {
        cancelAnimationFrame(dragAnimationFrame);
        dragAnimationFrame = null;
    }
    if (resizeAnimationFrame) {
        cancelAnimationFrame(resizeAnimationFrame);
        resizeAnimationFrame = null;
    }

    document.body.style.cursor = 'default';

    document.querySelectorAll('.session-block').forEach(block => {
        block.classList.remove('dragging', 'resizing');
    });

    document.querySelectorAll('.venue-sessions-area').forEach(venueArea => {
        venueArea.classList.remove('drag-over');
    });

    if (isDragging) {
        checkAndResolveSessionCollisions();
    }

    assignSessionNumbers();
    renderSessions();
    resetAllSessionScrolls();
    saveProgram();
}

// 세션 충돌 감지 및 자동 해결
function checkAndResolveSessionCollisions() {
    console.log('🔍 Checking for session collisions after drag...');
    
    venues.forEach((venue, venueIndex) => {
        const venueSessions = sessions.filter(session => {
            const sessionVenue = (session.venue || '').trim();
            const targetVenue = (venue.name || '').trim();
            return sessionVenue === targetVenue;
        });
        
        if (venueSessions.length <= 1) return; // 충돌 가능성 없음
        
        console.log(`📍 Checking collisions in venue "${venue.name}" with ${venueSessions.length} sessions`);
        
        // 각 세션에 대해 충돌 검사
        venueSessions.forEach((session, index) => {
            const sessionStart = timeToMinutes(session.startTime);
            const sessionEnd = timeToMinutes(session.endTime);
            
            console.log(`🔍 Checking session "${session.title}": ${session.startTime}-${session.endTime}`);
            
            // 다른 세션들과 충돌 검사
            const collisions = venueSessions.filter((otherSession, otherIndex) => {
                if (index === otherIndex) return false;
                
                const otherStart = timeToMinutes(otherSession.startTime);
                const otherEnd = timeToMinutes(otherSession.endTime);
                
                // 시간 겹침 검사
                const hasOverlap = (sessionStart < otherEnd && sessionEnd > otherStart);
                
                if (hasOverlap) {
                    console.log(`⚠️ Collision detected between "${session.title}" and "${otherSession.title}"`);
                }
                
                return hasOverlap;
            });
            
            // 충돌이 발견되면 자동으로 해결
            if (collisions.length > 0) {
                console.log(`🔧 Resolving collisions for "${session.title}"`);
                resolveSessionCollision(session, collisions, venueSessions);
            }
        });
    });
    
    // 모든 충돌 해결 후 세션 다시 렌더링
    console.log('🔄 Re-rendering sessions after collision resolution');
    renderSessions();
}

// 강제 충돌 해결 함수 (디버깅용)
function forceResolveAllCollisions() {
    console.log('🔧 FORCE RESOLVING ALL COLLISIONS...');
    
    if (venues.length === 0) {
        console.log('❌ No venues available');
        return;
    }
    
    let totalResolved = 0;
    
    // 날짜별로 충돌 해결 (중요!)
    const datesToCheck = eventDates.length > 0 ? eventDates : [null];
    
    datesToCheck.forEach(date => {
        console.log(`\n📅 Processing date: ${date || 'no-date'}`);
    
    venues.forEach((venue, venueIndex) => {
            console.log(`\n📍 Processing venue ${venueIndex}: "${venue.name}" on date ${date || 'no-date'}`);
        
            // 해당 장소와 날짜의 세션들만 필터링
        const venueSessions = sessions.filter(session => {
            const sessionVenue = (session.venue || '').trim();
            const targetVenue = (venue.name || '').trim();
                const venueMatch = sessionVenue === targetVenue;
                
                // 날짜 필터링
                let dateMatch = true;
                if (date) {
                    if (session.date) {
                        dateMatch = session.date === date;
                    }
                } else {
                    // 날짜 정보가 없는 경우만 포함
                    dateMatch = !session.date;
                }
                
                return venueMatch && dateMatch;
            });
            
            console.log(`📊 Venue "${venue.name}" on ${date || 'no-date'} has ${venueSessions.length} sessions`);
        
        if (venueSessions.length > 1) {
            console.log('🔍 Checking for collisions...');
            const hasCollisions = checkForTimeOverlaps(venueSessions);
            
            if (hasCollisions) {
                console.log('⚠️ Collisions found, resolving...');
                resolveInitialCollisions(venueSessions);
                totalResolved++;
                    console.log('✅ Collisions resolved for venue:', venue.name, 'on date:', date || 'no-date');
            } else {
                    console.log('✅ No collisions in venue:', venue.name, 'on date:', date || 'no-date');
            }
        } else {
                console.log('ℹ️ Only one session in venue:', venue.name, 'on date:', date || 'no-date');
        }
        });
    });
    
    console.log(`🎉 Force resolution completed. ${totalResolved} venue-date combinations had collisions resolved.`);
    
    // 충돌 해결 후 다시 렌더링
    renderSessions();
}
// 시간 겹침 확인
function checkForTimeOverlaps(sessions) {
    console.log('🔍 Checking for time overlaps in', sessions.length, 'sessions');
    
    if (sessions.length <= 1) {
        console.log('✅ Only one session, no overlaps possible');
        return false;
    }
    
    // Break 등은 충돌 검사에서 제외할 세션 타입/제목
    const noCollisionCheck = [
        'break', 'coffee break', 'lunch', 'lunch break',
        'opening ceremony', 'closing ceremony', 
        'general assembly', 'press conference',
        'presidential dinner', 'dinner', 'reception',
        'preparing dinner', '상임운영위원회'
    ];
    
    const shouldSkipCollisionCheck = (session) => {
        const titleLower = (session.title || '').toLowerCase();
        const typeLower = (session.sessionType || '').toLowerCase();
        return noCollisionCheck.some(keyword => 
            titleLower.includes(keyword) || typeLower.includes(keyword)
        );
    };
    
    for (let i = 0; i < sessions.length; i++) {
        for (let j = i + 1; j < sessions.length; j++) {
            const session1 = sessions[i];
            const session2 = sessions[j];
            
            // Break와의 충돌은 무시 (레이어링으로 처리)
            if (shouldSkipCollisionCheck(session1) || shouldSkipCollisionCheck(session2)) {
                continue;
            }
            
            console.log(`🔍 Comparing: "${session1.title}" (${session1.startTime}-${session1.endTime}) vs "${session2.title}" (${session2.startTime}-${session2.endTime})`);
            
            const start1 = timeToMinutes(session1.startTime);
            const end1 = timeToMinutes(session1.endTime);
            const start2 = timeToMinutes(session2.startTime);
            const end2 = timeToMinutes(session2.endTime);
            
            // 시간 파싱 실패 시 건너뛰기
            if (start1 === 0 || end1 === 0 || start2 === 0 || end2 === 0) {
                console.warn(`⚠️ Invalid time format, skipping: ${session1.title} or ${session2.title}`);
                continue;
            }
            
            console.log(`  📊 Minutes: ${start1}-${end1} vs ${start2}-${end2}`);
            
            // 시간 겹침 검사 (더 엄격한 조건)
            const hasOverlap = (start1 < end2 && end1 > start2);
            
            console.log(`  🔍 Overlap check: ${start1} < ${end2} && ${end1} > ${start2} = ${hasOverlap}`);
            
            if (hasOverlap) {
                console.log(`⚠️ Time overlap detected: "${session1.title}" (${session1.startTime}-${session1.endTime}) and "${session2.title}" (${session2.startTime}-${session2.endTime})`);
                return true;
            }
        }
    }
    
    console.log('✅ No time overlaps found');
    return false;
}

// 초기 충돌 해결
function resolveInitialCollisions(venueSessions) {
    console.log('🔧 Resolving initial collisions for', venueSessions.length, 'sessions');
    
    if (venueSessions.length <= 1) {
        console.log('ℹ️ Only one session, no collisions to resolve');
        return;
    }
    
    // 충돌 해결에서 제외할 세션 타입/제목
    const noCollisionResolution = [
        'break', 'coffee break', 'lunch', 'lunch break',
        'opening ceremony', 'closing ceremony', 
        'general assembly', 'press conference',
        'presidential dinner', 'dinner', 'reception',
        'preparing dinner', '상임운영위원회'
    ];
    
    const shouldSkipCollisionResolution = (session) => {
        const titleLower = (session.title || '').toLowerCase();
        const typeLower = (session.sessionType || '').toLowerCase();
        return noCollisionResolution.some(keyword => 
            titleLower.includes(keyword) || typeLower.includes(keyword)
        );
    };
    
    // 시간순으로 정렬
    venueSessions.sort((a, b) => {
        const timeA = timeToMinutes(a.startTime);
        const timeB = timeToMinutes(b.startTime);
        if (timeA === 0 || timeB === 0) {
            console.warn(`⚠️ Invalid time in session: ${a.title} (${a.startTime}) or ${b.title} (${b.startTime})`);
        }
        return timeA - timeB;
    });
    console.log('📊 Sessions after sorting:', venueSessions.map(s => `${s.title} (${s.startTime}-${s.endTime})`));
    
    let resolved = false;
    let maxIterations = 10; // 무한 루프 방지
    let iteration = 0;
    
    while (iteration < maxIterations) {
        iteration++;
        console.log(`🔄 Collision resolution iteration ${iteration}`);
        
        let hasAnyCollision = false;
        
        for (let i = 0; i < venueSessions.length; i++) {
            const currentSession = venueSessions[i];
            
            // Break 등은 충돌 해결 건너뛰기 (레이어링으로 처리)
            if (shouldSkipCollisionResolution(currentSession)) {
                console.log(`⏭️ Skipping collision resolution for "${currentSession.title}" (Break/Opening Ceremony etc.)`);
                continue;
            }
            
            const currentStart = timeToMinutes(currentSession.startTime);
            const currentEnd = timeToMinutes(currentSession.endTime);
            
            // 시간 파싱 실패 시 건너뛰기
            if (currentStart === 0 || currentEnd === 0) {
                console.warn(`⚠️ Skipping session "${currentSession.title}" - invalid time format`);
                continue;
            }
            
            const currentDuration = currentEnd - currentStart;
            
            if (currentDuration <= 0) {
                console.warn(`⚠️ Skipping session "${currentSession.title}" - invalid duration`);
                continue;
            }
            
            console.log(`🔍 Checking session "${currentSession.title}": ${currentSession.startTime}-${currentSession.endTime} (${currentStart}-${currentEnd} minutes)`);
            
            // 이전 세션들과 충돌 검사 (Break는 제외하고 충돌 검사)
            let hasCollision = false;
            let collisionWith = null;
            
            for (let j = 0; j < i; j++) {
                const previousSession = venueSessions[j];
                
                // Break와의 충돌은 무시 (레이어링으로 처리)
                if (shouldSkipCollisionResolution(previousSession)) {
                    continue;
                }
                
                const prevStart = timeToMinutes(previousSession.startTime);
                const prevEnd = timeToMinutes(previousSession.endTime);
                
                // 시간 파싱 실패 시 건너뛰기
                if (prevStart === 0 || prevEnd === 0) {
                    continue;
                }
                
                // 시간 겹침 검사
                if (currentStart < prevEnd && currentEnd > prevStart) {
                    hasCollision = true;
                    collisionWith = previousSession;
                    console.log(`⚠️ Collision with "${previousSession.title}" (${previousSession.startTime}-${previousSession.endTime})`);
                    break;
                }
            }
            
            // 충돌이 있으면 자동으로 해결
            if (hasCollision) {
                hasAnyCollision = true;
                console.log(`🔧 Resolving collision for "${currentSession.title}" with "${collisionWith.title}"`);
                
                // 이전 세션들의 종료 시간 중 가장 늦은 시간 찾기 (Break 제외)
                let latestEndTime = 8 * 60; // 8:00 AM
                for (let j = 0; j < i; j++) {
                    if (shouldSkipCollisionResolution(venueSessions[j])) {
                        continue; // Break는 무시
                    }
                    const prevEnd = timeToMinutes(venueSessions[j].endTime);
                    if (prevEnd > latestEndTime) {
                        latestEndTime = prevEnd;
                    }
                }
                
                // 충돌이 없는 새로운 위치 계산 (5분 단위로 스냅)
                let newStartTime = Math.ceil(latestEndTime / 5) * 5; // 5분 단위로 반올림
                let newEndTime = newStartTime + currentDuration;
                
                // 최대 시간(20:00)을 넘지 않도록 조정
                if (newEndTime > 20 * 60) {
                    newEndTime = 20 * 60;
                    newStartTime = newEndTime - currentDuration;
                    // 시작 시간이 8:00 AM보다 이르면 조정
                    if (newStartTime < 8 * 60) {
                        console.log(`❌ Cannot resolve collision for "${currentSession.title}" - no available time slot`);
                        continue;
                    }
                }
                
                const newStartTimeStr = minutesToTime(newStartTime);
                const newEndTimeStr = minutesToTime(newEndTime);
                
                console.log(`✅ Moving "${currentSession.title}" from ${currentSession.startTime}-${currentSession.endTime} to ${newStartTimeStr}-${newEndTimeStr}`);
                
                currentSession.startTime = newStartTimeStr;
                currentSession.endTime = newEndTimeStr;
                
                // 다시 정렬
                venueSessions.sort((a, b) => {
                    const timeA = timeToMinutes(a.startTime);
                    const timeB = timeToMinutes(b.startTime);
                    return timeA - timeB;
                });
                break; // 다시 처음부터 검사
            }
        }
        
        if (!hasAnyCollision) {
            console.log('✅ All collisions resolved');
            resolved = true;
            break;
        }
    }
    
    if (!resolved) {
        console.log(`❌ Could not resolve all collisions after ${maxIterations} iterations`);
    }
}

// 개별 세션 충돌 해결
function resolveSessionCollision(session, collisions, allVenueSessions) {
    console.log(`🔧 Resolving collision for session "${session.title}"`);
    
    const sessionDuration = timeToMinutes(session.endTime) - timeToMinutes(session.startTime);
    const sessionStart = timeToMinutes(session.startTime);
    const sessionEnd = timeToMinutes(session.endTime);
    
    // 충돌하는 세션들의 시간 범위 계산
    const collisionTimes = collisions.map(collision => ({
        start: timeToMinutes(collision.startTime),
        end: timeToMinutes(collision.endTime)
    }));
    
    // 가능한 새로운 위치 찾기
    let bestPosition = null;
    let minConflict = Infinity;
    
    // 10분 단위로 가능한 모든 위치 검사
    for (let minute = 8 * 60; minute <= 20 * 60 - sessionDuration; minute += 10) {
        const testStart = minute;
        const testEnd = minute + sessionDuration;
        
        // 이 위치에서 충돌하는 세션 수 계산
        let conflictCount = 0;
        for (const collision of collisionTimes) {
            if (testStart < collision.end && testEnd > collision.start) {
                conflictCount++;
            }
        }
        
        // 충돌이 가장 적은 위치 선택
        if (conflictCount < minConflict) {
            minConflict = conflictCount;
            bestPosition = minute;
        }
        
        // 충돌이 없는 위치를 찾으면 즉시 사용
        if (conflictCount === 0) {
            bestPosition = minute;
            break;
        }
    }
    
    if (bestPosition !== null) {
        const newStartTime = minutesToTime(bestPosition);
        const newEndTime = minutesToTime(bestPosition + sessionDuration);
        
        console.log(`✅ Moving "${session.title}" from ${session.startTime}-${session.endTime} to ${newStartTime}-${newEndTime}`);
        
        session.startTime = newStartTime;
        session.endTime = newEndTime;
    } else {
        console.log(`❌ Could not find suitable position for "${session.title}"`);
    }
}

function getTimeDifference(startTime, endTime) {
    const [startHours, startMins] = startTime.split(':').map(Number);
    const [endHours, endMins] = endTime.split(':').map(Number);
    return (endHours * 60 + endMins) - (startHours * 60 + startMins);
}

function updateSessionPosition(sessionElement, session) {
    console.log('=== UPDATE SESSION POSITION ===');
    const startY = calculateYFromTime(session.startTime);
    const endY = calculateYFromTime(session.endTime);
    const height = endY - startY;
    
    console.log('Position calculations:', {
        startTime: session.startTime,
        endTime: session.endTime,
        startY: startY,
        endY: endY,
        height: height
    });
    
    sessionElement.style.top = `${startY}px`;
    sessionElement.style.height = `${height}px`;
    
    // Update time display
    const timeElement = sessionElement.querySelector('.session-time');
    if (timeElement) {
        const newTimeText = formatTimeRange12Hour(session.startTime, session.endTime);
        timeElement.textContent = newTimeText;
        console.log('Updated time display:', newTimeText);
    } else {
        console.log('Time element not found');
    }
    
    console.log('Session position updated successfully');
}

// 시간 제한 함수들
function constrainTime(time, minTime, maxTime) {
    const timeMinutes = timeToMinutes(time);
    const minMinutes = timeToMinutes(minTime);
    const maxMinutes = timeToMinutes(maxTime);
    
    const constrainedMinutes = Math.max(minMinutes, Math.min(maxMinutes, timeMinutes));
    return minutesToTime(constrainedMinutes);
}

function constrainTimeToRange(startTime, duration) {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = startMinutes + duration;
    
    // programStartTime과 programEndTime을 사용하여 동적으로 제약
    const minStartMinutes = timeToMinutes(programStartTime);
    const maxEndMinutes = timeToMinutes(programEndTime);
    
    // 시작 시간이 너무 이르면 조정
    if (startMinutes < minStartMinutes) {
        return minutesToTime(minStartMinutes);
    }
    
    // 종료 시간이 너무 늦으면 시작 시간을 조정
    if (endMinutes > maxEndMinutes) {
        return minutesToTime(maxEndMinutes - duration);
    }
    
    return startTime;
}

// Load program data from server
function loadProgram() {
    const eventId = document.body.getAttribute('data-event-id');
    console.log('Event ID:', eventId); // 디버깅용 로그
    
    if (!eventId) {
        console.error('Event ID not found');
        renderSessions(); // Show empty state
        return;
    }
    
    fetch(`/api/event_program/${eventId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Loaded data from server:', data);
            sessions = data.sessions || [];
            
            // 로드된 세션의 날짜 정보 확인
            console.log(`📊 Loaded ${sessions.length} sessions:`);
            sessions.forEach((session, index) => {
                console.log(`  ${index + 1}. "${session.title}" - Date: ${session.date || 'NO DATE'}, Time: ${session.startTime}-${session.endTime}, Venue: ${session.venue}`);
            });
            
            // 프로그램 시간 설정 로드
            if (data.programStartTime && data.programEndTime) {
                programStartTime = data.programStartTime;
                programEndTime = data.programEndTime;
                console.log('⏰ Loaded program time settings:', {
                    programStartTime,
                    programEndTime
                });
                updateTimeRangeDisplay();
                renderTimeGrid(); // 시간 그리드 다시 렌더링
            }
            
            // 세션 타입별 색상 매핑 복원
            sessionTypeColors.clear();
            standaloneSessionColors.clear();
            resetColorPools();
            sessions.forEach(session => {
                if (session.sessionType && session.color) {
                    if (!sessionTypeColors.has(session.sessionType)) {
                        sessionTypeColors.set(session.sessionType, session.color);
                        console.log(`🎨 Restored color ${session.color} for session type "${session.sessionType}"`);
                    }
                    markColorAsUsed(session.color);
                } else if (!session.sessionType && session.color) {
                    standaloneSessionColors.add(session.color);
                    markColorAsUsed(session.color);
                }
            });
            
            // 사용 중인 색상을 제외한 나머지 색상 풀 재정비
            resetColorPools([
                ...sessionTypeColors.values(),
                ...standaloneSessionColors
            ]);
            
            console.log('Sessions after loading:', sessions);
            // 기존 데이터 정리
            cleanSessionData();
            console.log('Sessions after cleaning:', sessions);
            // 오래된 데이터 마이그레이션 (참가자 로드 후 실행)
            if (participants.length > 0) {
                migrateOldSessionData();
            }
            
            // 날짜 탭 다시 초기화 (세션 로드 후)
            // 세션에 날짜 정보가 없으면 현재 선택된 날짜 또는 첫 날짜로 설정
            // 또한 세션 날짜가 행사 날짜 범위에 속하지 않으면 행사 날짜로 수정
            let hasDateInfo = false;
            sessions.forEach(session => {
                if (session.date) {
                    const normalizedSessionDate = normalizeDateValue(session.date);
                    // 세션 날짜가 행사 날짜 범위에 속하는지 확인 (년도 포함)
                    let isDateInRange = false;
                    if (eventDates.length > 0) {
                        isDateInRange = eventDates.some(eventDate => {
                            const normalizedEventDate = normalizeDateValue(eventDate);
                            // 년도까지 정확히 일치하는지 확인
                            return normalizedSessionDate === normalizedEventDate;
                        });
                    }
                    
                    if (!isDateInRange && eventDates.length > 0) {
                        // 행사 날짜 범위에 속하지 않으면 첫 번째 행사 날짜로 수정
                        const correctedDate = normalizeDateValue(eventDates[0]);
                        console.log(`⚠️ Session "${session.title}" date ${session.date} is not in event date range (${eventDates.join(', ')}), correcting to ${correctedDate}`);
                        session.date = correctedDate;
                    } else {
                        session.date = normalizedSessionDate || session.date;
                    }
                    hasDateInfo = true;
                } else if (!session.date && (currentSelectedDate || eventDates[0])) {
                    const fallbackDate = currentSelectedDate || normalizeDateValue(eventDates[0]);
                    session.date = normalizeDateValue(fallbackDate) || null;
                    console.log(`⚠️ Session "${session.title}" has no date, setting to ${session.date}`);
                }
            });
            
            if (!hasDateInfo && sessions.length > 0) {
                console.warn('⚠️ No sessions have date information - all sessions will show on all dates');
            }
            
            // Venue가 로드된 후에만 세션 렌더링 (loadVenues에서 호출됨)
            // renderSessions(); // 제거: loadVenues에서 호출됨
        })
        .catch(error => {
            console.error('Error loading program:', error);
            // renderSessions(); // 제거: loadVenues에서 호출됨
        });
}

// 오래된 세션 데이터 형식 마이그레이션
function migrateOldSessionData() {
    console.log('🔄 Migrating old session data...');
    let migrated = 0;
    
    sessions.forEach((session, index) => {
        // chairId가 없고 chair만 있는 경우 (오래된 형식)
        if (!session.chairId && session.chair) {
            // chair가 숫자(ID)인 경우
            if (!isNaN(session.chair)) {
                const participant = participants.find(p => p.id == session.chair);
                if (participant) {
                    session.chairId = session.chair;
                    session.chair = participant.name;
                    migrated++;
                    console.log(`✅ Migrated session ${index}: chair ID ${session.chairId} -> ${session.chair}`);
                }
            }
        }
        
        // speakers에 participantId가 없는 경우
        if (session.speakers && session.speakers.length > 0) {
            session.speakers.forEach((speaker, speakerIndex) => {
                if (!speaker.participantId && speaker.name) {
                    // 이름으로 참가자 찾기 (추정)
                    const participant = participants.find(p => p.name === speaker.name);
                    if (participant) {
                        speaker.participantId = participant.id;
                        migrated++;
                        console.log(`✅ Migrated speaker ${speakerIndex} in session ${index}`);
                    }
                }
            });
        }
    });
    
    if (migrated > 0) {
        console.log(`✅ Migrated ${migrated} old data items`);
        saveProgram(); // 마이그레이션 후 저장
    } else {
        console.log('✅ No migration needed');
    }
}

// 세션 블록 바깥의 독립적인 텍스트 노드만 정리하는 안전한 함수
function cleanupStandaloneTextNodes() {
    const container = document.getElementById('scrollSessionsArea');
    if (!container) return;
    
    console.log('Cleaning up standalone text nodes...');
    
    // 세션 블록을 제외한 독립적인 텍스트 노드만 제거
    const childNodes = Array.from(container.childNodes);
    childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent.trim();
            if (text && !text.match(/^\s*$/)) {
                console.log('Removing standalone text node:', text);
                node.remove();
            }
        }
    });
    
    // 세션 블록 내부 요소들이 제대로 있는지 확인
    const sessionBlocks = container.querySelectorAll('.session-block');
    sessionBlocks.forEach((block, index) => {
        console.log(`Session block ${index} children after cleanup:`, block.children.length);
        Array.from(block.children).forEach((child, childIndex) => {
            console.log(`  Child ${childIndex}:`, child.className || child.tagName);
        });
    });
    
    console.log('Standalone text nodes cleanup completed');
}

// 기존 세션 데이터 정리 함수
function cleanSessionData() {
    console.log('Cleaning session data, original count:', sessions.length);
    
    // 시간 형식 검증 함수
    const isValidTimeFormat = (timeString) => {
        if (!timeString || typeof timeString !== 'string') return false;
        
        // HH:MM 형식 체크
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        return timeRegex.test(timeString);
    };
    
    sessions = sessions.filter(session => {
        console.log('Checking session:', session);
        
        // 필수 필드 검증 (좌장은 선택사항)
        if (!session.title || !session.startTime || !session.endTime) {
            console.log('Invalid session data found, removing:', session);
            return false;
        }
        
        if (session.date) {
            const normalizedDate = normalizeDateValue(session.date);
            session.date = normalizedDate || null;
        }

        // 시간 형식 검증
        if (!isValidTimeFormat(session.startTime) || !isValidTimeFormat(session.endTime)) {
            console.warn(`⚠️ Invalid time format in session "${session.title}": ${session.startTime} - ${session.endTime}`);
            console.log('Removing session with invalid time format:', session);
            return false;
        }
        
        // 시간이 NaN이 아닌지 확인
        const startMinutes = timeToMinutes(session.startTime);
        const endMinutes = timeToMinutes(session.endTime);
        
        if (isNaN(startMinutes) || isNaN(endMinutes) || startMinutes === 0 && session.startTime !== '00:00') {
            console.warn(`⚠️ Time parsing failed for session "${session.title}": ${session.startTime} - ${session.endTime}`);
            console.log('Removing session with unparseable time:', session);
            return false;
        }
        
        // 종료 시간이 시작 시간보다 늦은지 확인
        if (startMinutes >= endMinutes) {
            console.warn(`⚠️ Invalid time range in session "${session.title}": ${session.startTime} - ${session.endTime}`);
            console.log('Removing session with invalid time range:', session);
            return false;
        }
        
        // 의미 없는 텍스트 검증 (더 구체적으로)
        const title = session.title.trim();
        const chair = (session.chair || '').trim();
        
        // 제목이 의미 없는 텍스트인지 확인
        if (title.toLowerCase() === 'aaaa' || title.toLowerCase() === 'test' || title.length === 0) {
            console.log('Meaningless session data found, removing:', session);
            return false;
        }
        
        // 좌장이 있고 의미 없는 텍스트인 경우만 필터링
        if (chair && (chair.toLowerCase() === 'aaaa' || chair.toLowerCase() === 'test')) {
            console.log('Meaningless chair data found, removing:', session);
            return false;
        }
        
        // 발표자 데이터 정리
        if (session.speakers && session.speakers.length > 0) {
            session.speakers = session.speakers.filter(speaker => {
                if (!speaker.name || !speaker.topic || !speaker.startTime || !speaker.endTime) {
                    return false;
                }
                
                const name = speaker.name.trim();
                const topic = speaker.topic.trim();
                
                // 실제 의미 없는 텍스트만 필터링
                if (name.toLowerCase() === 'aaaa' || name.toLowerCase() === 'test' || name.length === 0 ||
                    topic.toLowerCase() === 'aaaa' || topic.toLowerCase() === 'test' || topic.length === 0) {
                    return false;
                }
                
                return true;
            });
        }
        
        console.log('Session passed validation:', session);
        return true;
    });
    
    console.log('Session data cleaning completed, final count:', sessions.length);
}

// Render sessions in the calendar grid
function renderSessions() {
    console.log('=== RENDER SESSIONS ===');
    console.log('Venues count:', venues.length);
    console.log('Venues:', venues);
    console.log('Sessions count:', sessions.length);
    console.log('Sessions data:', JSON.stringify(sessions, null, 2));
    
    // 세션 렌더링 전에 툴팁 숨기기 (DOM 변경으로 인한 툴팁 정리)
    hideSessionTooltip();
    clearTimeout(tooltipTimeout);
    
    // 세션 타입별 자동 번호 부여
    assignSessionNumbers();
    
    if (venues.length === 0) {
        console.warn('⚠️ No venues available. Rendering sessions in placeholder column.');
    } else {
        console.log('✅ Venues exist, calling renderSessionsByVenue()');
    }
    
    // venue sessions area가 존재하는지 확인
    venues.forEach((venue, index) => {
        const venueArea = document.getElementById(`venueSessionsArea_${index}`);
        console.log(`🔍 Venue ${index} "${venue.name}" area exists:`, !!venueArea);
        if (venueArea) {
            console.log(`  Area dimensions:`, {
                offsetWidth: venueArea.offsetWidth,
                offsetHeight: venueArea.offsetHeight,
                clientWidth: venueArea.clientWidth,
                clientHeight: venueArea.clientHeight
            });
        }
    });
    
    // 장소별로 세션 렌더링
    renderSessionsByVenue();
    
    console.log('✅ renderSessionsByVenue() completed');
    // Re-add current time indicator (제거됨)
    // updateCurrentTimeIndicator();
    // console.log('✅ updateCurrentTimeIndicator() completed');
    
    if (currentViewMode === 'excel') {
        refreshExcelViewData(true);
    } else {
        excelViewState.initialized = false;
    }
}

// 툴팁 관련 함수들
function showSessionTooltip(event, sessionBlock) {
    console.log('=== SHOW SESSION TOOLTIP ===');
    
    const tooltip = document.getElementById('sessionTooltip');
    console.log('Tooltip element found:', tooltip);
    
    if (!tooltip) {
        console.error('Tooltip element not found!');
        return;
    }
    
    const tooltipContent = sessionBlock.getAttribute('data-tooltip-content');
    console.log('Tooltip content from attribute:', tooltipContent);
    
    if (tooltipContent) {
        try {
            const decodedContent = decodeURIComponent(tooltipContent);
            console.log('Decoded tooltip content:', decodedContent);
            tooltip.innerHTML = decodedContent;
            tooltip.style.display = 'block';
            updateTooltipPosition(event);
            console.log('Tooltip displayed successfully');
            console.log('Tooltip style.display:', tooltip.style.display);
            console.log('Tooltip innerHTML:', tooltip.innerHTML);
        } catch (error) {
            console.error('Error decoding tooltip content:', error);
            // Fallback tooltip
            const sessionIndex = parseInt(sessionBlock.dataset.sessionIndex);
            const session = sessions[sessionIndex];
            if (session) {
                // 발표자 그룹화
                const groupedSpeakers = [];
                if (session.speakers && session.speakers.length > 0) {
                    const speakerGroups = new Map();
                    
                    session.speakers.forEach(speaker => {
                        const key = `${speaker.topic}_${speaker.startTime}_${speaker.endTime}`;
                        if (!speakerGroups.has(key)) {
                            speakerGroups.set(key, {
                                topic: speaker.topic,
                                startTime: speaker.startTime,
                                endTime: speaker.endTime,
                                speakers: []
                            });
                        }
                        speakerGroups.get(key).speakers.push(speaker);
                    });
                    
                    groupedSpeakers.push(...speakerGroups.values());
                }
                
                const chairDisplayText = getSessionChairDisplayText(session, displaySettings.chairNameLanguage);
                const fallbackContent = `
                    <div class="tooltip-header">
                        ${session.language ? `<div class="tooltip-session-language">${session.language}</div>` : ''}
                        ${session.displayAbbreviation && session.displaySessionType ? `<div class="tooltip-session-type">${session.displayAbbreviation} [${session.displaySessionType}]</div>` : (session.displaySessionType ? `<div class="tooltip-session-type">[${session.displaySessionType}]</div>` : (session.sessionType ? `<div class="tooltip-session-type">[${session.sessionType}]</div>` : ''))}
                        <div class="tooltip-session-title">${session.title}</div>
                        ${chairDisplayText ? `<div class="tooltip-session-chair">좌장: ${chairDisplayText}</div>` : ''}
                        <div class="tooltip-session-time">${formatTimeRange12Hour(session.startTime, session.endTime)}</div>
                </div>
                    <div class="tooltip-speakers">
                        ${groupedSpeakers.length > 0 
                            ? groupedSpeakers.map(group => `
                                <div class="tooltip-speaker-group">
                                    ${group.topic ? `<div class="tooltip-speaker-topic" style="font-weight: 600; margin-bottom: 4px;">${group.topic}</div>` : ''}
                                    <div class="tooltip-speaker-time" style="color: #888; font-size: 12px; margin-bottom: 4px;">${group.startTime} - ${group.endTime}</div>
                                    ${group.speakers.map(speaker => `
                                        ${(function() {
                                            const speakerDisplayName = getSpeakerDisplayName(speaker, displaySettings.speakerNameLanguage);
                                            if (speakerDisplayName) {
                                                return `<div class="tooltip-speaker-name" style="padding-left: 8px; margin-bottom: 2px;">• ${speakerDisplayName}</div>`;
                                            }
                                            if (!speakerDisplayName && speaker.topic) {
                                                return `<div class="tooltip-speaker-topic" style="padding-left: 8px; margin-bottom: 2px; color: #aaa;">${speaker.topic}</div>`;
                                            }
                                            return '';
                                        })()}
                                    `).join('')}
                                </div>
                            `).join('<div style="height: 8px;"></div>')
                            : '<div class="tooltip-no-speakers">발표자가 없습니다</div>'
                        }
            </div>
        `;
                tooltip.innerHTML = fallbackContent;
                tooltip.style.display = 'block';
                updateTooltipPosition(event);
                console.log('Fallback tooltip displayed');
                console.log('Fallback tooltip content:', fallbackContent);
            }
        }
    } else {
        console.log('No tooltip content found, using fallback');
        // Fallback tooltip
        const sessionIndex = parseInt(sessionBlock.dataset.sessionIndex);
        const session = sessions[sessionIndex];
        if (session) {
            const chairDisplayText = getSessionChairDisplayText(session, displaySettings.chairNameLanguage);
            const fallbackContent = `
                <div class="tooltip-header">
                    ${session.language ? `<div class="tooltip-session-language">${session.language}</div>` : ''}
                    <div class="tooltip-session-title">${session.title}</div>
                    ${chairDisplayText ? `<div class="tooltip-session-chair">좌장: ${chairDisplayText}</div>` : ''}
                    <div class="tooltip-session-time">${formatTimeRange12Hour(session.startTime, session.endTime)}</div>
                </div>
                <div class="tooltip-speakers">
                    ${session.speakers && session.speakers.length > 0 
                        ? session.speakers.map(speaker => {
                            const speakerDisplayName = getSpeakerDisplayName(speaker, displaySettings.speakerNameLanguage);
                            return `
                                <div class="tooltip-speaker">
                                    ${speakerDisplayName ? `<div class="tooltip-speaker-name">${speakerDisplayName}</div>` : ''}
                                    ${speaker.topic ? `<div class="tooltip-speaker-topic">${speaker.topic}</div>` : ''}
                                    <div class="tooltip-speaker-time">${speaker.startTime} - ${speaker.endTime}</div>
                                </div>
                            `;
                        }).join('')
                        : '<div class="tooltip-no-speakers">발표자가 없습니다</div>'
                    }
                </div>
            `;
            tooltip.innerHTML = fallbackContent;
            tooltip.style.display = 'block';
            updateTooltipPosition(event);
            console.log('Fallback tooltip displayed (no content)');
        }
    }
}

function hideSessionTooltip() {
    const tooltip = document.getElementById('sessionTooltip');
    tooltip.style.display = 'none';
}
function updateTooltipPosition(event) {
    const tooltip = document.getElementById('sessionTooltip');
    if (tooltip.style.display === 'block') {
        const offset = 15;
        let x = event.clientX + offset;
        let y = event.clientY + offset;
        
        // 화면 경계 체크
        const tooltipRect = tooltip.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        // 오른쪽 경계 체크
        if (x + tooltipRect.width > windowWidth - 20) {
            x = event.clientX - tooltipRect.width - offset;
        }
        
        // 아래쪽 경계 체크
        if (y + tooltipRect.height > windowHeight - 20) {
            y = event.clientY - tooltipRect.height - offset;
        }
        
        // 왼쪽 경계 체크
        if (x < 20) {
            x = 20;
        }
        
        // 위쪽 경계 체크
        if (y < 20) {
            y = 20;
        }
        
        tooltip.style.left = x + 'px';
        tooltip.style.top = y + 'px';
    }
}

// 세션 블록에 이벤트 리스너 추가
function addSessionEventListeners() {
    console.log('Adding session event listeners to all venue areas');
    
    // 모든 장소의 세션 영역에 이벤트 리스너 추가
    venues.forEach((venue, venueIndex) => {
        const venueSessionsArea = document.getElementById(`venueSessionsArea_${venueIndex}`);
        if (!venueSessionsArea) return;
        
        console.log(`Adding event listeners to venue ${venueIndex}: ${venue.name}`);
        
        // 기존 이벤트 리스너 제거 (중복 방지)
        venueSessionsArea.removeEventListener('mousedown', handleSessionMouseDown);
        venueSessionsArea.removeEventListener('dblclick', handleSessionDoubleClick);
        venueSessionsArea.removeEventListener('click', handleSessionClick);
        venueSessionsArea.removeEventListener('mouseenter', handleSessionMouseEnter);
        venueSessionsArea.removeEventListener('mouseleave', handleSessionMouseLeave);
        venueSessionsArea.removeEventListener('mousemove', handleSessionMouseMove);
        
        // 새로운 이벤트 리스너 등록
        venueSessionsArea.addEventListener('mousedown', handleSessionMouseDown);
        venueSessionsArea.addEventListener('dblclick', handleSessionDoubleClick);
        venueSessionsArea.addEventListener('click', handleSessionClick);
        venueSessionsArea.addEventListener('mouseenter', handleSessionMouseEnter);
        venueSessionsArea.addEventListener('mouseleave', handleSessionMouseLeave);
        venueSessionsArea.addEventListener('mousemove', handleSessionMouseMove);
        
        // 세션 블록 확인
        const sessionBlocks = venueSessionsArea.querySelectorAll('.session-block');
        console.log(`Found ${sessionBlocks.length} session blocks in venue ${venueIndex}`);
        
        // 세션 블록에 직접 이벤트 리스너 추가 (이벤트 위임 대신)
        sessionBlocks.forEach((block, index) => {
            console.log(`Adding direct event listeners to session block ${index} in venue ${venueIndex}`);
            
            // 기존 이벤트 리스너 제거
            block.removeEventListener('mouseenter', handleSessionMouseEnter);
            block.removeEventListener('mouseleave', handleSessionMouseLeave);
            block.removeEventListener('mousemove', handleSessionMouseMove);
            
            // 새로운 이벤트 리스너 추가
            block.addEventListener('mouseenter', handleSessionMouseEnter);
            block.addEventListener('mouseleave', handleSessionMouseLeave);
            block.addEventListener('mousemove', handleSessionMouseMove);
            
            // 리사이즈 핸들에 직접 이벤트 리스너 추가 (핵심!)
            const resizeHandle = block.querySelector('.resize-handle.bottom');
            if (resizeHandle) {
                console.log(`  ✅ Adding mousedown listener to resize handle in block ${index}`);
                
                // 기존 리스너 제거
                resizeHandle.removeEventListener('mousedown', handleResizeStart);
                
                // 새로운 리스너 추가
                resizeHandle.addEventListener('mousedown', function(e) {
                    console.log('🎯 RESIZE HANDLE MOUSEDOWN - Direct listener');
                    handleResizeStart(e);
                });
            } else {
                console.warn(`  ⚠️ No resize handle found in block ${index}`);
            }
        });
    });
    
    console.log('Event listeners registered successfully');
}

// 이벤트 핸들러 함수들
function handleSessionMouseDown(e) {
    // Check if clicking on resize handle first (리사이즈 핸들 우선 처리)
    const resizeHandle = e.target.closest('.resize-handle');
    if (resizeHandle) {
        console.log('=== RESIZE HANDLE CLICKED ===');
        // Let handleResizeStart handle this
        // Don't preventDefault here to allow handleResizeStart to work
        return;
    }
    
    // 텍스트 선택 방지 (리사이즈가 아닐 때만)
    e.preventDefault();
    
    const sessionBlock = e.target.closest('.session-block');
    
    console.log('=== MOUSE DOWN EVENT (DRAG) ===');
    console.log('Target element:', e.target);
    console.log('Target classList:', e.target.classList);
    console.log('Target tagName:', e.target.tagName);
    console.log('Session block found:', sessionBlock);
    console.log('Is dragging:', isDragging);
    console.log('Is resizing:', isResizing);
    
    if (!sessionBlock) return;
    
    const sessionIndex = parseInt(sessionBlock.dataset.sessionIndex);
    const rect = sessionBlock.getBoundingClientRect();
    const mouseY = e.clientY;
    const bottomEdge = rect.bottom;
    const isNearBottom = mouseY >= bottomEdge - 4 && mouseY <= bottomEdge + 4;
    
    console.log('Mouse Y:', mouseY, 'Bottom edge:', bottomEdge, 'Is near bottom:', isNearBottom);
    
    // 액션 버튼 클릭 시 드래그 방지
    if (e.target.closest('.session-actions')) {
        console.log('Clicked on session actions, not starting drag');
        return;
    }
    
    // 세션 블록 드래그 처리
    if (!e.target.closest('.session-actions')) {
        console.log('Session block drag started:', sessionIndex);
        startDrag(e, sessionIndex);
    } else {
        console.log('No action taken - clicked on session actions');
    }
}

function handleSessionDoubleClick(e) {
    const sessionBlock = e.target.closest('.session-block');
    console.log('Double click event:', e.target, 'Session block:', sessionBlock);
    
    if (sessionBlock && !e.target.closest('.session-actions')) {
        const sessionIndex = parseInt(sessionBlock.dataset.sessionIndex);
        console.log('Edit session via double click:', sessionIndex);
        editSession(sessionIndex);
    }
}

function handleSessionClick(e) {
    const actionBtn = e.target.closest('.session-action-btn');
    if (actionBtn) {
        console.log('Action button clicked:', actionBtn);
        const sessionIndex = parseInt(actionBtn.dataset.sessionIndex);
        const icon = actionBtn.querySelector('i');
        
        console.log('Session index:', sessionIndex, 'Icon classes:', icon.classList);
        
        if (icon.classList.contains('fa-edit')) {
            console.log('Edit session clicked');
            editSession(sessionIndex);
        } else if (icon.classList.contains('fa-palette')) {
            console.log('Change color clicked');
            changeSessionColor(sessionIndex);
        } else if (icon.classList.contains('fa-trash')) {
            console.log('Delete session clicked');
            deleteSession(sessionIndex);
        }
    } else {
        // 세션 블록이 아닌 빈 공간을 클릭한 경우
        const sessionBlock = e.target.closest('.session-block');
        if (!sessionBlock) {
            // 모든 세션 블록의 스크롤을 맨 위로 리셋
            resetAllSessionScrolls();
        }
    }
}

// 모든 세션 블록의 스크롤을 맨 위로 리셋
function resetAllSessionScrolls() {
    const allSessionContents = document.querySelectorAll('.session-content');
    allSessionContents.forEach(content => {
        content.scrollTop = 0;
    });
    console.log('🔄 All session scrolls reset to top');
}

let tooltipTimeout;
let lastMouseMoveTime = 0;

function handleSessionMouseEnter(e) {
    console.log('=== MOUSE ENTER EVENT ===');
    console.log('Target element:', e.target);
    console.log('Target classList:', e.target.classList);
    
    const sessionBlock = e.target.closest('.session-block');
    console.log('Session block found:', sessionBlock);
    console.log('Session actions check:', e.target.closest('.session-actions'));
    
    if (sessionBlock && !e.target.closest('.session-actions')) {
        console.log('Setting up tooltip timeout...');
        lastMouseMoveTime = Date.now();
        
        // 툴팁 표시 지연 (300ms)
        tooltipTimeout = setTimeout(() => {
            // 드래그/리사이즈 중이면 툴팁 표시하지 않음
            if (isDragging || isResizing) {
                console.log('Tooltip blocked - dragging or resizing');
                return;
            }
            
            // 마우스가 움직이지 않고 300ms가 지났는지 확인
            const timeSinceLastMove = Date.now() - lastMouseMoveTime;
            if (timeSinceLastMove >= 300) {
                console.log('Tooltip timeout triggered - mouse stationary for 300ms');
                showSessionTooltip(e, sessionBlock);
            } else {
                console.log('Tooltip blocked - mouse moved recently');
            }
        }, 300);
    } else {
        console.log('Tooltip not triggered - conditions not met');
    }
}

function handleSessionMouseLeave(e) {
    console.log('=== MOUSE LEAVE EVENT ===');
    console.log('Target element:', e.target);
    
    const sessionBlock = e.target.closest('.session-block');
    if (sessionBlock) {
        console.log('Clearing tooltip timeout and hiding tooltip');
        // 툴팁 표시 지연 취소
        if (tooltipTimeout) {
            clearTimeout(tooltipTimeout);
            tooltipTimeout = null;
        }
        hideSessionTooltip();
    }
}

function handleSessionMouseMove(e) {
    const sessionBlock = e.target.closest('.session-block');
    if (sessionBlock && !e.target.closest('.session-actions')) {
        // 마우스가 움직이면 타이머 리셋
        lastMouseMoveTime = Date.now();
        
        // 기존 타이머 취소하고 새로 시작
        if (tooltipTimeout) {
            clearTimeout(tooltipTimeout);
            tooltipTimeout = null;
        }
        
        // 툴팁이 이미 표시되어 있으면 위치만 업데이트
        const tooltip = document.getElementById('sessionTooltip');
        if (tooltip && tooltip.style.display === 'block') {
            updateTooltipPosition(e);
        } else {
            // 툴팁이 없으면 새로운 타이머 시작
            tooltipTimeout = setTimeout(() => {
                // 드래그/리사이즈 중이면 툴팁 표시하지 않음
                if (isDragging || isResizing) {
                    console.log('Tooltip blocked - dragging or resizing');
                    return;
                }
                
                // 마우스가 움직이지 않고 300ms가 지났는지 확인
                const timeSinceLastMove = Date.now() - lastMouseMoveTime;
                if (timeSinceLastMove >= 300) {
                    console.log('Tooltip triggered after mouse stopped moving');
                    showSessionTooltip(e, sessionBlock);
                }
            }, 300);
        }
    }
}

function startDrag(event, sessionIndex) {
    console.log('=== START DRAG ===');
    console.log('Session index:', sessionIndex);
    console.log('Event target:', event.target);
    
    // 텍스트 선택 방지
    event.preventDefault();
    
    // 툴팁 숨기기 및 타이머 취소
    if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
        tooltipTimeout = null;
    }
    hideSessionTooltip();
    
    if (event.target.closest('.session-actions')) {
        console.log('Drag prevented - clicking on actions');
        return; // Don't start drag if clicking on actions
    }
    
    const sessionBlock = event.target.closest('.session-block');
    if (!sessionBlock || !sessionBlock.dataset) {
        console.log('Drag prevented - no valid session block');
        return;
    }
    
    // sessionIndex 유효성 검사
    if (isNaN(sessionIndex) || sessionIndex < 0 || sessionIndex >= sessions.length) {
        console.log('Drag prevented - invalid session index:', sessionIndex);
        return;
    }
    
    // 더블클릭 감지 - 300ms 내에 두 번째 클릭이 있으면 드래그 방지
    const now = Date.now();
    if (now - lastClickTime < 300) {
        console.log('Drag prevented - double click detected');
        return;
    }
    lastClickTime = now;
    
    console.log('Starting drag for session:', sessionIndex);
    isDragging = true;
    currentDragSession = sessionBlock;
    currentDragSession.classList.add('dragging');
    dragStartY = event.clientY;
    
    // 드래그 시작 시 마우스와 세션 블록의 상대적 위치 계산
    // 해당 세션 블록이 속한 venue의 sessions area를 기준으로 계산
    const venueSessionsArea = sessionBlock.closest('.venue-sessions-area');
    if (!venueSessionsArea) {
        console.error('Venue sessions area not found for session block');
        return;
    }
    
    const venueRect = venueSessionsArea.getBoundingClientRect();
    const scrollTop = document.getElementById('scrollContainer').scrollTop;
    const mouseY = event.clientY - venueRect.top + scrollTop;
    const sessionTop = parseFloat(sessionBlock.style.top);
    dragOffsetY = mouseY - sessionTop;
    
    console.log('Drag start parameters:', {
        dragStartY: dragStartY,
        mouseY: mouseY,
        sessionTop: sessionTop,
        dragOffsetY: dragOffsetY,
        venueSessionsArea: venueSessionsArea.id
    });
    
    // 마우스 커서 스타일 변경
    document.body.style.cursor = 'grabbing';
    
    event.preventDefault();
    console.log('Drag started successfully');
}

function startResize(event, sessionIndex, handle) {
    console.log('=== START RESIZE ===');
    console.log('Session index:', sessionIndex);
    console.log('Handle:', handle);
    console.log('Event target:', event.target);
    
    const sessionBlock = event.target.closest('.session-block');
    if (!sessionBlock || !sessionBlock.dataset) {
        console.log('Resize prevented - no valid session block');
        return;
    }
    
    // sessionIndex 유효성 검사
    if (isNaN(sessionIndex) || sessionIndex < 0 || sessionIndex >= sessions.length) {
        console.log('Resize prevented - invalid session index:', sessionIndex);
        return;
    }
    
    console.log('Starting resize for session:', sessionIndex, 'handle:', handle);
    isResizing = true;
    currentResizeSession = sessionBlock;
    currentResizeHandle = handle;
    currentResizeSession.classList.add('resizing');
    resizeStartY = event.clientY;
    
    console.log('Resize parameters:', {
        resizeStartY: resizeStartY,
        currentResizeHandle: handle
    });
    
    // 마우스 커서 스타일 변경
    document.body.style.cursor = 'ns-resize';
    
    event.preventDefault();
    event.stopPropagation();
    console.log('Resize started successfully');
}

// Add new session
function addSession() {
    currentSessionIndex = -1;
    document.getElementById('modalTitle').textContent = '세션 추가';
    document.getElementById('sessionForm').reset();
    
    // 좌장 목록 초기화 (기본 좌장 추가 안 함 - 선택사항)
    document.getElementById('chairsContainer').innerHTML = '';
    chairCounter = 0;
    
    // 발표자 목록 초기화
    document.getElementById('speakersContainer').innerHTML = '';
    speakerCounter = 0;
    
    // 세션 종류 드롭다운 업데이트
    updateSessionTypeDropdown();
    
    openSessionModal();
}

// Edit existing session
function editSession(index) {
    console.log(`🔧 === EDIT SESSION ${index} ===`);
    currentSessionIndex = index;
    const session = sessions[index];
    console.log('Session data:', session);
    
    document.getElementById('modalTitle').textContent = '세션 편집';
    
    // 세션 종류 드롭다운 업데이트 (현재 세션의 타입 유지)
    updateSessionTypeDropdown(session.sessionType);
    
    document.getElementById('sessionTitle').value = session.title;
    document.getElementById('sessionLanguage').value = session.language || '';
    document.getElementById('sessionVenue').value = session.venue || '';
    document.getElementById('sessionStartTime').value = session.startTime;
    document.getElementById('sessionEndTime').value = session.endTime;
    
    console.log('📂 Setting session type:', session.sessionType);
    
    console.log('📍 Setting venue:', session.venue);
    console.log('⏰ Setting start time:', session.startTime);
    console.log('⏰ Setting end time:', session.endTime);
    
    // 좌장 정보 설정 - 여러 좌장 지원
    console.log('Setting chair info - chairs array:', session.chairs);
    console.log('Setting chair info - chairId:', session.chairId);
    console.log('Setting chair info - chair name:', session.chair);
    
    // 좌장 컨테이너 초기화
    const chairsContainer = document.getElementById('chairsContainer');
    chairsContainer.innerHTML = '';
    chairCounter = 0;
    
    // 여러 좌장이 있는지 확인
    if (session.chairs && session.chairs.length > 0) {
        // 여러 좌장 개별 추가
        console.log(`✅ Multiple chairs found: ${session.chairs.length}`);
        session.chairs.forEach(chair => {
            addChairToForm(chair);
        });
        console.log(`✅ All ${session.chairs.length} chairs loaded in edit modal`);
    } else if (session.chairId) {
        // 단일 좌장 (기존 방식) - 좌장 추가 폼 사용
        const chairParticipant = participants.find(p => p.id == session.chairId);
        if (chairParticipant) {
            addChairToForm({ id: session.chairId, participantId: session.chairId, name: chairParticipant.name, email: chairParticipant.email });
            console.log('✅ Single chair added to edit modal:', chairParticipant.name);
        } else {
            // Fallback: try to find by name if ID doesn't match
            const chairByName = participants.find(p => p.name === session.chair);
            if (chairByName) {
                addChairToForm({ id: chairByName.id, participantId: chairByName.id, name: chairByName.name, email: chairByName.email });
                console.log('✅ Chair added by name fallback:', chairByName.name);
            } else {
                console.log('⚠️ No chair found - leaving empty (no chair session)');
                // 좌장 없는 세션은 빈 폼 추가 안 함
            }
        }
    } else if (session.chair) {
        console.log('❌ No chairId in session data, trying fallback');
        // Fallback: use session.chair (name) to find participant
            const chairByName = participants.find(p => p.name === session.chair);
            if (chairByName) {
            addChairToForm({ id: chairByName.id, participantId: chairByName.id, name: chairByName.name, email: chairByName.email });
            console.log('✅ Chair added by name fallback:', chairByName.name);
            } else {
            console.log('⚠️ No chair found - leaving empty (no chair session)');
            // 좌장 없는 세션은 빈 폼 추가 안 함
            }
        } else {
        console.log('ℹ️ No chair data at all - this is a no-chair session (Break, Opening Ceremony, etc.)');
        // 좌장이 전혀 없는 세션 (Break 등) - 빈 폼 추가 안 함
    }
    
    // Load speakers
    const speakersContainer = document.getElementById('speakersContainer');
    speakersContainer.innerHTML = '';
    speakerCounter = 0;
    
    console.log(`🔍 Loading ${session.speakers ? session.speakers.length : 0} speakers for session "${session.title}"`);
    console.log('📋 Session speakers data:', session.speakers);
    
    if (session.speakers && session.speakers.length > 0) {
        session.speakers.forEach((speaker, index) => {
            console.log(`🔍 Loading speaker ${index + 1}:`, speaker);
        addSpeakerToForm(speaker);
    });
        console.log(`✅ Loaded ${session.speakers.length} speakers into edit modal`);
    } else {
        console.log('⚠️ No speakers found in session data');
    }
    
    openSessionModal();
    console.log('✅ Edit session modal opened');
}

// Change session color
function changeSessionColor(sessionIndex) {
    currentColorSessionIndex = sessionIndex;
    const session = sessions[sessionIndex];
    
    if (!session.color) {
        if (session.sessionType) {
            session.color = getColorForSessionType(session.sessionType);
        } else {
            session.color = getNextRandomColorId(true);
            standaloneSessionColors.add(session.color);
            markColorAsUsed(session.color);
        }
    }
    
    const currentColor = session.color;
    
    // Reset all color options
    document.querySelectorAll('.color-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    // Select current color
    const currentColorOption = document.querySelector(`[data-color="${currentColor}"]`);
    if (currentColorOption) {
        currentColorOption.classList.add('selected');
    }
    
    document.getElementById('colorPickerModal').style.display = 'block';
}

// Select color
function selectColor(colorNumber) {
    if (currentColorSessionIndex !== -1) {
        const session = sessions[currentColorSessionIndex];
        const previousColor = session.color;
        session.color = colorNumber;
        
        // 세션 타입의 색상 매핑도 업데이트 (수동으로 변경한 경우)
        if (session.sessionType) {
            sessionTypeColors.set(session.sessionType, colorNumber);
            console.log(`🎨 Updated color for session type "${session.sessionType}" to ${colorNumber}`);
            
            // 동일한 세션 타입의 모든 세션 색상 업데이트
            sessions.forEach(s => {
                if (s.sessionType === session.sessionType) {
                    s.color = colorNumber;
                }
            });
        } else {
            if (previousColor !== undefined) {
                standaloneSessionColors.delete(previousColor);
            }
            standaloneSessionColors.add(colorNumber);
        }
        
        markColorAsUsed(colorNumber);
        resetColorPools([
            ...sessionTypeColors.values(),
            ...standaloneSessionColors
        ]);
        
        renderSessions();
        saveProgram();
    }
    
    closeColorPickerModal();
}

// Close color picker modal
function closeColorPickerModal() {
    document.getElementById('colorPickerModal').style.display = 'none';
    currentColorSessionIndex = -1;
}

// Delete session
function deleteSession(index) {
    if (confirm('이 세션을 삭제하시겠습니까?')) {
        // 툴팁 숨기기
        hideSessionTooltip();
        clearTimeout(tooltipTimeout);
        
        const sessionToDelete = sessions[index];
        const removedColor = sessionToDelete?.color;
        const removedSessionType = sessionToDelete?.sessionType;
        
        sessions.splice(index, 1);
        
        if (!removedSessionType && removedColor !== undefined) {
            standaloneSessionColors.delete(removedColor);
        }
        
        if (removedSessionType) {
            const stillExists = sessions.some(s => s.sessionType === removedSessionType);
            if (!stillExists) {
                sessionTypeColors.delete(removedSessionType);
            }
        }
        
        resetColorPools([
            ...sessionTypeColors.values(),
            ...standaloneSessionColors
        ]);
        
        renderSessions();
        saveProgram();
    }
}

// ============================================================
// 다중 선택 기능
// ============================================================

// 다중 선택 모드 토글
function toggleMultiSelectMode() {
    const btn = document.getElementById('multiSelectBtn');
    const deleteBtn = document.getElementById('deleteSelectedBtn');
    const selectAllBtn = document.getElementById('selectAllBtn');
    isSelecting = !isSelecting;
    
    if (isSelecting) {
        btn.classList.add('active');
        btn.innerHTML = '<i class="fas fa-check"></i> 선택 완료';
        selectAllBtn.style.display = 'inline-block'; // 전체 선택 버튼 표시
        // 모든 세션 블록에 선택 모드 클래스 추가
        document.querySelectorAll('.session-block').forEach(block => {
            block.classList.add('selecting');
        });
        setupSelectionListeners();
    } else {
        btn.classList.remove('active');
        btn.innerHTML = '<i class="fas fa-mouse-pointer"></i> 다중 선택';
        selectAllBtn.style.display = 'none'; // 전체 선택 버튼 숨김
        // 선택 해제
        clearSelection();
        deleteBtn.style.display = 'none';
    }
}

// 선택 초기화
function clearSelection() {
    selectedSessions.clear();
    document.querySelectorAll('.session-block').forEach(block => {
        block.classList.remove('selected', 'selecting');
    });
    updateSelectedCount();
    
    // 전체 선택 버튼 초기화
    const selectAllBtn = document.getElementById('selectAllBtn');
    if (selectAllBtn) {
        selectAllBtn.innerHTML = '<i class="fas fa-check-double"></i> 전체 선택';
    }
}

// 선택된 세션 수 업데이트
function updateSelectedCount() {
    const count = selectedSessions.size;
    document.getElementById('selectedCount').textContent = count;
    const deleteBtn = document.getElementById('deleteSelectedBtn');
    deleteBtn.style.display = count > 0 ? 'inline-block' : 'none';
    
    // 전체 선택 버튼 텍스트 업데이트
    const selectAllBtn = document.getElementById('selectAllBtn');
    if (selectAllBtn && isSelecting) {
        // 현재 날짜의 세션들만 필터링
        const currentDateSessions = sessions
            .map((session, index) => ({ session, index }))
            .filter(({ session }) => {
                if (!currentSelectedDate) return true;
                return datesMatchForFilter(session.date, currentSelectedDate);
            });
        
        // 모든 세션이 선택되어 있는지 확인
        const allSelected = currentDateSessions.length > 0 && 
                           currentDateSessions.every(({ index }) => selectedSessions.has(index));
        
        if (allSelected) {
            selectAllBtn.innerHTML = '<i class="fas fa-times"></i> 전체 해제';
        } else {
            selectAllBtn.innerHTML = '<i class="fas fa-check-double"></i> 전체 선택';
        }
    }
}

// 전체 선택/해제 토글
function toggleSelectAll() {
    if (!isSelecting) return; // 다중 선택 모드가 아니면 무시
    
    const selectAllBtn = document.getElementById('selectAllBtn');
    
    // 현재 날짜의 세션들만 필터링
    const currentDateSessions = sessions
        .map((session, index) => ({ session, index }))
        .filter(({ session }) => {
            if (!currentSelectedDate) return true;
            return datesMatchForFilter(session.date, currentSelectedDate);
        });
    
    console.log(`📋 Current date sessions: ${currentDateSessions.length} sessions on ${currentSelectedDate}`);
    
    // 모든 세션이 이미 선택되어 있는지 확인
    const allSelected = currentDateSessions.every(({ index }) => selectedSessions.has(index));
    
    if (allSelected) {
        // 전체 해제
        console.log('🔄 Deselecting all sessions');
        currentDateSessions.forEach(({ index }) => {
            selectedSessions.delete(index);
        });
        document.querySelectorAll('.session-block').forEach(block => {
            const sessionIndex = parseInt(block.dataset.sessionIndex);
            if (currentDateSessions.some(({ index }) => index === sessionIndex)) {
                block.classList.remove('selected');
            }
        });
        selectAllBtn.innerHTML = '<i class="fas fa-check-double"></i> 전체 선택';
    } else {
        // 전체 선택
        console.log('✅ Selecting all sessions');
        currentDateSessions.forEach(({ index }) => {
            selectedSessions.add(index);
        });
        document.querySelectorAll('.session-block').forEach(block => {
            const sessionIndex = parseInt(block.dataset.sessionIndex);
            if (currentDateSessions.some(({ index }) => index === sessionIndex)) {
                block.classList.add('selected');
            }
        });
        selectAllBtn.innerHTML = '<i class="fas fa-times"></i> 전체 해제';
    }
    
    updateSelectedCount();
    console.log(`📊 Selected sessions: ${selectedSessions.size}/${currentDateSessions.length}`);
}
// 선택 리스너 설정
function setupSelectionListeners() {
    const scrollVenuesArea = document.getElementById('scrollVenuesArea');
    const selectionBox = document.getElementById('selectionBox');
    
    if (!scrollVenuesArea || !selectionBox) return;
    
    let isDraggingSelection = false;
    let startX = 0;
    let startY = 0;
    
    // 마우스 다운 - 선택 시작
    const handleMouseDown = function(e) {
        if (!isSelecting) return;
        if (e.target.closest('.session-block, .session-action-btn')) return;
        
        isDraggingSelection = true;
        
        const rect = scrollVenuesArea.getBoundingClientRect();
        const containerRect = scrollVenuesArea.parentElement.getBoundingClientRect();
        
        startX = e.clientX - containerRect.left;
        startY = e.clientY - containerRect.top + scrollVenuesArea.scrollTop;
        
        selectionStartX = startX;
        selectionStartY = startY;
        
        selectionBox.style.display = 'block';
        selectionBox.style.left = startX + 'px';
        selectionBox.style.top = startY + 'px';
        selectionBox.style.width = '0px';
        selectionBox.style.height = '0px';
        
        e.preventDefault();
    };
    
    // 마우스 이동 - 선택 박스 확장
    const handleMouseMove = function(e) {
        if (!isSelecting || !isDraggingSelection) return;
        
        const containerRect = scrollVenuesArea.parentElement.getBoundingClientRect();
        const currentX = e.clientX - containerRect.left;
        const currentY = e.clientY - containerRect.top + scrollVenuesArea.scrollTop;
        
        const left = Math.min(startX, currentX);
        const top = Math.min(startY, currentY);
        const width = Math.abs(currentX - startX);
        const height = Math.abs(currentY - startY);
        
        selectionBox.style.left = left + 'px';
        selectionBox.style.top = top + 'px';
        selectionBox.style.width = width + 'px';
        selectionBox.style.height = height + 'px';
        
        // 선택 박스와 겹치는 세션 블록 선택
        updateSelectionFromBox(left, top, width, height);
    };
    
    // 마우스 업 - 선택 종료
    const handleMouseUp = function(e) {
        if (!isSelecting || !isDraggingSelection) return;
        
        isDraggingSelection = false;
        selectionBox.style.display = 'none';
        selectionBox.style.width = '0px';
        selectionBox.style.height = '0px';
    };
    
    // 이벤트 리스너 추가 (한 번만)
    scrollVenuesArea.removeEventListener('mousedown', handleMouseDown);
    scrollVenuesArea.removeEventListener('mousemove', handleMouseMove);
    scrollVenuesArea.removeEventListener('mouseup', handleMouseUp);
    
    scrollVenuesArea.addEventListener('mousedown', handleMouseDown);
    scrollVenuesArea.addEventListener('mousemove', handleMouseMove);
    scrollVenuesArea.addEventListener('mouseup', handleMouseUp);
    
    // 세션 블록 클릭으로 개별 선택/해제
    scrollVenuesArea.addEventListener('click', function(e) {
        if (!isSelecting) return;
        if (e.target.closest('.session-action-btn')) return; // 액션 버튼 클릭 무시
        
        const sessionBlock = e.target.closest('.session-block');
        if (sessionBlock && !isDraggingSelection) {
            e.preventDefault();
            e.stopPropagation();
            
            const sessionIndex = parseInt(sessionBlock.dataset.sessionIndex);
            toggleSessionSelection(sessionIndex);
        }
    });
}

// 선택 박스로부터 세션 선택 업데이트
function updateSelectionFromBox(left, top, width, height) {
    const scrollVenuesArea = document.getElementById('scrollVenuesArea');
    const sessionBlocks = scrollVenuesArea.querySelectorAll('.session-block');
    
    sessionBlocks.forEach(block => {
        const blockRect = block.getBoundingClientRect();
        const containerRect = scrollVenuesArea.parentElement.getBoundingClientRect();
        
        // 블록 위치를 컨테이너 기준으로 변환
        const blockLeft = blockRect.left - containerRect.left;
        const blockTop = blockRect.top - containerRect.top + scrollVenuesArea.scrollTop;
        const blockWidth = blockRect.width;
        const blockHeight = blockRect.height;
        
        // 선택 박스와 겹치는지 확인
        const isOverlapping = !(left + width < blockLeft || 
                                 blockLeft + blockWidth < left ||
                                 top + height < blockTop || 
                                 blockTop + blockHeight < top);
        
        if (isOverlapping) {
            const sessionIndex = parseInt(block.dataset.sessionIndex);
            if (!selectedSessions.has(sessionIndex)) {
                selectedSessions.add(sessionIndex);
                block.classList.add('selected');
            }
        }
    });
    
    updateSelectedCount();
}

// 세션 선택 토글
function toggleSessionSelection(index) {
    if (selectedSessions.has(index)) {
        selectedSessions.delete(index);
        const block = document.querySelector(`.session-block[data-session-index="${index}"]`);
        if (block) block.classList.remove('selected');
    } else {
        selectedSessions.add(index);
        const block = document.querySelector(`.session-block[data-session-index="${index}"]`);
        if (block) block.classList.add('selected');
    }
    updateSelectedCount();
}

// 선택된 세션 삭제
function deleteSelectedSessions() {
    const count = selectedSessions.size;
    if (count === 0) {
        alert('삭제할 세션을 선택해주세요.');
        return;
    }
    
    if (!confirm(`선택한 ${count}개의 세션을 삭제하시겠습니까?`)) {
        return;
    }
    
    // 선택된 세션들을 인덱스 내림차순으로 정렬하여 삭제 (뒤에서부터 삭제하여 인덱스 문제 방지)
    const indicesToDelete = Array.from(selectedSessions).sort((a, b) => b - a);
    
    indicesToDelete.forEach(index => {
        sessions.splice(index, 1);
    });
    
    // 툴팁 숨기기
    hideSessionTooltip();
    clearTimeout(tooltipTimeout);
    
    // 선택 초기화 및 재렌더링
    clearSelection();
    renderSessions();
    saveProgram();
    
    // 다중 선택 모드 해제
    if (isSelecting) {
        toggleMultiSelectMode();
    }
    
    alert(`${count}개의 세션이 삭제되었습니다.`);
}

// Open session modal
function openSessionModal() {
    // 세션 타입 드롭다운 업데이트
    updateSessionTypeDropdown();
    document.getElementById('sessionModal').style.display = 'block';
}

// Close session modal
function closeSessionModal() {
    document.getElementById('sessionModal').style.display = 'none';
    // 폼 초기화
    document.getElementById('sessionForm').reset();
    // 좌장 목록 초기화
    document.getElementById('chairsContainer').innerHTML = '';
    chairCounter = 0;
    // 발표자 목록 초기화
    document.getElementById('speakersContainer').innerHTML = '';
    speakerCounter = 0;
}

// Close quick session modal
function closeQuickSessionModal() {
    document.getElementById('quickSessionModal').style.display = 'none';
    // 폼 초기화
    document.getElementById('quickSessionForm').reset();
    // 선택된 좌장 정보 초기화
    const selectedQuickChair = document.getElementById('selectedQuickChair');
    if (selectedQuickChair) {
        selectedQuickChair.innerHTML = '<span class="placeholder">좌장을 선택하세요</span>';
    }
}

// Save quick session
function saveQuickSession() {
    const form = document.getElementById('quickSessionForm');
    const formData = new FormData(form);
    
    // 입력 데이터 검증 및 정리
    const title = formData.get('quickSessionTitle')?.trim();
    const chairId = formData.get('quickSessionChair');
    
    if (!title || title.length === 0) {
        alert('세션 제목을 입력해주세요.');
        return;
    }
    
    if (!chairId) {
        alert('좌장을 선택해주세요.');
        return;
    }
    
    // 참가자 ID로 좌장 이름 찾기
    const chairParticipant = participants.find(p => p.id == chairId);
    if (!chairParticipant) {
        alert('선택한 좌장 정보를 찾을 수 없습니다.');
        return;
    }
    const chair = chairParticipant.name;
    
    // 시간 범위 제한 확인 (8AM-8PM)
    const minStartTime = `${START_HOUR.toString().padStart(2, '0')}:00`;
    const maxEndTime = `${END_HOUR.toString().padStart(2, '0')}:00`;
    
    if (window.selectedStartTime < minStartTime) {
        alert(`시작 시간은 ${minStartTime} 이후여야 합니다.`);
        return;
    }
    
    if (window.selectedEndTime > maxEndTime) {
        alert(`종료 시간은 ${maxEndTime} 이전이어야 합니다.`);
        return;
    }
    
    const venue = formData.get('quickSessionVenue')?.trim();
    
    if (!venue || venue.length === 0) {
        alert('강의 장소를 선택해주세요.');
        return;
    }
    
    const sessionData = {
        title: title,
        language: '',
        chairId: chairId,
        chair: chair,
        venue: venue,
        startTime: window.selectedStartTime,
        endTime: window.selectedEndTime,
        speakers: [],
        color: getColorIdByPosition(sessions.length) // Auto-assign color
    };
    
    standaloneSessionColors.add(sessionData.color);
    markColorAsUsed(sessionData.color);
    resetColorPools([
        ...sessionTypeColors.values(),
        ...standaloneSessionColors
    ]);
    
    console.log('=== SAVE QUICK SESSION ===');
    console.log('Quick session data to save:', sessionData);
    
    sessions.push(sessionData);
    console.log('Added quick session, total sessions:', sessions.length);
    console.log('All sessions after quick save:', sessions);
    
    closeQuickSessionModal();
    renderSessions();
    saveProgram();
    
    // Reset form
    form.reset();
}

// Add speaker to the form
// ===== 좌장 관리 함수들 =====

function addChair() {
    addChairToForm();
}

function addChairToForm(chairData = null) {
    const container = document.getElementById('chairsContainer');
    const chairId = chairCounter++;
    
    console.log(`📝 Adding chair ${chairId} to form:`, chairData);
    
    const chairHtml = `
        <div class="chair-form" data-chair-id="${chairId}" style="margin-bottom: 15px; padding: 15px; border: 1px solid #ddd; border-radius: 4px; background-color: #f9f9f9;">
            <div class="speaker-form-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h5 class="speaker-form-title" style="margin: 0; font-size: 14px; font-weight: 600; color: #333;">좌장 ${chairId + 1}</h5>
                <button type="button" class="remove-speaker-btn" onclick="removeChair(${chairId})" style="background: none; border: none; color: #dc3545; cursor: pointer; font-size: 18px; padding: 0; width: 24px; height: 24px;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="speaker-form-row">
                <div class="form-group" style="flex: 1;">
                    <label>좌장</label>
                    <div class="participant-selector">
                        <input type="hidden" name="chair_participant_${chairId}" value="${chairData ? (chairData.participantId || chairData.id || '') : ''}" required>
                        <div class="selected-participant" id="selectedChair${chairId}">
                            <span class="placeholder">좌장을 선택하세요</span>
                        </div>
                        <button type="button" class="btn btn-secondary participant-search-btn" onclick="openParticipantSearch('chair_${chairId}')">
                            <i class="fas fa-search"></i> 검색
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', chairHtml);
    
    // 좌장 정보가 있으면 표시
    if (chairData && (chairData.participantId || chairData.id)) {
        console.log(`🔍 Looking for chair with participantId/id: ${chairData.participantId || chairData.id}`);
        const chairParticipant = participants.find(p => p.id == (chairData.participantId || chairData.id));
        console.log('Found chair participant:', chairParticipant);
        
        if (chairParticipant) {
            const selectedChair = document.getElementById(`selectedChair${chairId}`);
            selectedChair.innerHTML = `
                <div class="participant-info">
                    <div class="participant-name">${chairParticipant.name}</div>
                    <div class="participant-details">${chairParticipant.email}</div>
                </div>
            `;
            console.log(`✅ Chair ${chairId} displayed:`, chairParticipant.name);
        }
    }
}

function removeChair(chairId) {
    const chairElement = document.querySelector(`.chair-form[data-chair-id="${chairId}"]`);
    if (chairElement) {
        chairElement.remove();
    }
}

// ===== 발표자 관리 함수들 =====

function addSpeaker() {
    addSpeakerToForm();
}

function addSpeakerToForm(speakerData = null) {
    const container = document.getElementById('speakersContainer');
    const speakerId = speakerCounter++;
    
    console.log(`📝 Adding speaker ${speakerId} to form:`, speakerData);
    
    const speakerHtml = `
        <div class="speaker-form" data-speaker-id="${speakerId}">
            <div class="speaker-form-header">
                <h5 class="speaker-form-title">발표자 ${speakerId + 1}</h5>
                <button type="button" class="remove-speaker-btn" onclick="removeSpeaker(${speakerId})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="speaker-form-row">
                <div class="form-group">
                    <label>발표자</label>
                    <div class="participant-selector">
                        <input type="hidden" name="speaker_participant_${speakerId}" value="${speakerData ? (speakerData.participantId || '') : ''}" required>
                        <div class="selected-participant" id="selectedSpeaker${speakerId}">
                            <span class="placeholder">발표자를 선택하세요</span>
                        </div>
                        <button type="button" class="btn btn-secondary participant-search-btn" onclick="openParticipantSearch('speaker_${speakerId}')">
                            <i class="fas fa-search"></i> 검색
                        </button>
                    </div>
                </div>
                <div class="form-group">
                    <label>주제</label>
                    <input type="text" name="speaker_topic_${speakerId}" value="${speakerData ? (speakerData.topic || '') : ''}" required>
                </div>
            </div>
            <div class="speaker-form-row">
                <div class="form-group">
                    <label>시작 시간</label>
                    <input type="time" name="speaker_start_${speakerId}" value="${speakerData ? (speakerData.startTime || '') : ''}" step="300" required>
                </div>
                <div class="form-group">
                    <label>종료 시간</label>
                    <input type="time" name="speaker_end_${speakerId}" value="${speakerData ? (speakerData.endTime || '') : ''}" step="300" required>
                </div>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', speakerHtml);
    
    // 발표자 정보가 있으면 표시
    if (speakerData && speakerData.participantId) {
        console.log(`🔍 Looking for speaker with participantId: ${speakerData.participantId}`);
        const speakerParticipant = participants.find(p => p.id == speakerData.participantId);
        console.log('Found speaker participant:', speakerParticipant);
        
        if (speakerParticipant) {
            const selectedSpeaker = document.getElementById(`selectedSpeaker${speakerId}`);
            selectedSpeaker.innerHTML = `
                <div class="participant-info">
                    <div class="participant-name">${speakerParticipant.name}</div>
                    <div class="participant-details">${speakerParticipant.email}</div>
                </div>
            `;
            console.log(`✅ Speaker ${speakerId} displayed:`, speakerParticipant.name);
        } else {
            console.log(`❌ Speaker participant not found for ID: ${speakerData.participantId}`);
            // Fallback: try to find by name
            if (speakerData.name) {
                const speakerByName = participants.find(p => p.name === speakerData.name);
                if (speakerByName) {
                    console.log('Found speaker by name:', speakerByName);
                    document.querySelector(`input[name="speaker_participant_${speakerId}"]`).value = speakerByName.id;
                    const selectedSpeaker = document.getElementById(`selectedSpeaker${speakerId}`);
                    selectedSpeaker.innerHTML = `
                        <div class="participant-info">
                            <div class="participant-name">${speakerByName.name}</div>
                            <div class="participant-details">${speakerByName.email}</div>
                        </div>
                    `;
                    console.log(`✅ Speaker ${speakerId} displayed by name:`, speakerByName.name);
                } else {
                    console.log(`❌ No speaker found by name: ${speakerData.name}`);
                }
            }
        }
    }
}

// Remove speaker from form
function removeSpeaker(speakerId) {
    const speakerElement = document.querySelector(`[data-speaker-id="${speakerId}"]`);
    if (speakerElement) {
        speakerElement.remove();
    }
}

// Save session
function saveSession() {
    console.log('\n🚀 === SAVE SESSION START ===');
    const form = document.getElementById('sessionForm');
    const formData = new FormData(form);
    
    // 입력 데이터 검증 및 정리
    const sessionType = formData.get('sessionType')?.trim();
    const title = formData.get('sessionTitle')?.trim();
    const language = formData.get('sessionLanguage')?.trim() || '';
    
    console.log('📂 Session Type:', sessionType);
    console.log('📝 Title:', title);
    console.log('🗣️ Language:', language);
    
    if (!sessionType || sessionType.length === 0) {
        alert('세션 종류를 선택해주세요.');
        return;
    }
    
    if (!title || title.length === 0) {
        alert('세션 제목을 입력해주세요.');
        return;
    }
    
    // 여러 좌장 수집
    const chairForms = document.querySelectorAll('.chair-form');
    const chairs = [];
    
    for (const chairForm of chairForms) {
        const chairId = chairForm.dataset.chairId;
        const chairParticipantId = formData.get(`chair_participant_${chairId}`);
        
        if (!chairParticipantId) {
            // 빈 좌장 폼은 건너뛰기
            console.log(`⏭️ Skipping empty chair form: ${chairId}`);
            continue;
        }
        
        const chairParticipant = participants.find(p => p.id == chairParticipantId);
    if (!chairParticipant) {
        alert('선택한 좌장 정보를 찾을 수 없습니다.');
        return;
    }
        
        chairs.push({
            id: chairParticipant.id,
            participantId: chairParticipant.id,
            name: chairParticipant.name,
            email: chairParticipant.email
        });
    }
    
    console.log(`👥 Chairs collected: ${chairs.length}`, chairs);
    
    // 좌장 정보 설정 (없을 수도 있음)
    let chairId = null;
    let chair = '';
    
    if (chairs.length > 0) {
        // 첫 번째 좌장을 주 좌장으로 (하위 호환성)
        const primaryChair = chairs[0];
        chairId = primaryChair.id;
        chair = chairs.map(c => c.name).join(' / '); // "김원주 / 김성은"
    }
    
    // Validate session times
    const startTime = snapToGrid(formData.get('sessionStartTime'));
    const endTime = snapToGrid(formData.get('sessionEndTime'));
    
    if (startTime >= endTime) {
        alert('종료 시간은 시작 시간보다 늦어야 합니다.');
        return;
    }
    
    // 시간 범위 제한 확인 (8AM-8PM)
    const minStartTime = `${START_HOUR.toString().padStart(2, '0')}:00`;
    const maxEndTime = `${END_HOUR.toString().padStart(2, '0')}:00`;
    
    if (startTime < minStartTime) {
        alert(`시작 시간은 ${minStartTime} 이후여야 합니다.`);
        return;
    }
    
    if (endTime > maxEndTime) {
        alert(`종료 시간은 ${maxEndTime} 이전이어야 합니다.`);
        return;
    }
    
    // Collect speakers data
    const speakers = [];
    const speakerForms = document.querySelectorAll('.speaker-form');
    
    for (let i = 0; i < speakerForms.length; i++) {
        const form = speakerForms[i];
        const speakerId = form.getAttribute('data-speaker-id');
        const participantId = formData.get(`speaker_participant_${speakerId}`);
        const topic = formData.get(`speaker_topic_${speakerId}`)?.trim();
        const speakerStart = formData.get(`speaker_start_${speakerId}`);
        const speakerEnd = formData.get(`speaker_end_${speakerId}`);
        
        if (participantId && topic && speakerStart && speakerEnd) {
            // 참가자 ID로 이름 찾기
            const participant = participants.find(p => p.id == participantId);
            if (!participant) {
                alert('선택한 발표자 정보를 찾을 수 없습니다.');
                return;
            }
            
            const name = participant.name;
            
            // 발표자 데이터 검증
            if (topic.length === 0) {
                alert('발표 주제를 입력해주세요.');
                return;
            }
            
            const snappedSpeakerStart = snapToGrid(speakerStart);
            const snappedSpeakerEnd = snapToGrid(speakerEnd);
            
            // Validate speaker times within session time
            if (snappedSpeakerStart < startTime || snappedSpeakerEnd > endTime) {
                alert('발표자 시간은 세션 시간 내에 있어야 합니다.');
                return;
            }
            
            speakers.push({
                participantId: participantId,
                name: name,
                topic: topic,
                startTime: snappedSpeakerStart,
                endTime: snappedSpeakerEnd
            });
        }
    }
    
    // Sort speakers by start time
    speakers.sort((a, b) => new Date(`2000-01-01 ${a.startTime}`) - new Date(`2000-01-01 ${b.startTime}`));
    
    const venue = formData.get('sessionVenue')?.trim();
    console.log('📍 Venue:', venue);
    
    if (!venue || venue.length === 0) {
        alert('강의 장소를 선택해주세요.');
        return;
    }
    
    console.log('✅ All validations passed, creating session data');
    
    // 세션 타입에 따라 자동으로 색상 할당
    let sessionColor;
    if (currentSessionIndex !== -1) {
        // 기존 세션 수정 시
        const oldSession = sessions[currentSessionIndex];
        if (oldSession.sessionType === sessionType) {
            // 세션 타입이 동일하면 기존 색상 유지
            sessionColor = oldSession.color;
            console.log(`🎨 Keeping existing color for same session type: ${sessionType}`);
        } else {
            // 세션 타입이 변경되면 새로운 타입에 맞는 색상 할당
            sessionColor = getColorForSessionType(sessionType);
            console.log(`🎨 Session type changed from "${oldSession.sessionType}" to "${sessionType}", updating color`);
        }
    } else {
        // 새 세션 생성 시 세션 타입에 따라 색상 자동 할당
        sessionColor = getColorForSessionType(sessionType);
        console.log(`🎨 Assigning color for new session type: ${sessionType}`);
    }
    
    // 날짜 설정: 기존 세션 수정 시에는 기존 날짜 유지, 새 세션 생성 시에는 현재 선택된 날짜 사용
    let sessionDate;
    if (currentSessionIndex !== -1) {
        // 기존 세션 수정 시: 기존 세션의 날짜 유지 (정규화하여 일관성 유지)
        const oldSession = sessions[currentSessionIndex];
        // 원본 날짜가 존재하는 경우 (null/undefined가 아닌 경우) 항상 보존
        if (oldSession.date != null) {
            // normalizeDateValue는 파싱 가능하면 정규화된 문자열 반환, 
            // 파싱 불가능하면 원본 문자열 반환, null/undefined/빈 문자열이면 '' 반환
            const normalized = normalizeDateValue(oldSession.date);
            // 정규화된 값이 빈 문자열이면 원본 날짜 보존 (파싱 실패 또는 원본이 null/undefined/빈 문자열인 경우)
            // 정규화된 값이 원본과 다르면 정규화된 값 사용 (성공적으로 파싱된 경우)
            // 정규화된 값이 원본과 같으면 원본 사용 (파싱 불가능하지만 원본 문자열 반환된 경우)
            if (normalized === '') {
                // normalizeDateValue가 빈 문자열을 반환한 경우: 원본이 null/undefined/빈 문자열
                // 원본 날짜 보존 (null/undefined/빈 문자열도 그대로 보존)
                sessionDate = oldSession.date;
            } else {
                // 정규화된 값이 있으면 사용 (파싱 성공 또는 원본 문자열)
                sessionDate = normalized;
            }
        } else {
            // 원본 날짜가 null/undefined인 경우 fallback 사용
            sessionDate = (currentSelectedDate ? normalizeDateValue(currentSelectedDate) : null) || 
                         (eventDates[0] ? normalizeDateValue(eventDates[0]) : null) || null;
        }
        console.log(`📅 Keeping existing date for session update: ${sessionDate} (original: ${oldSession.date})`);
    } else {
        // 새 세션 생성 시: 현재 선택된 날짜 사용 (정규화하여 일관성 유지)
        const selectedDate = currentSelectedDate ? normalizeDateValue(currentSelectedDate) : null;
        const fallbackDate = eventDates[0] ? normalizeDateValue(eventDates[0]) : null;
        sessionDate = (selectedDate && selectedDate !== '') ? selectedDate : 
                     ((fallbackDate && fallbackDate !== '') ? fallbackDate : null);
        console.log(`📅 Using current selected date for new session: ${sessionDate} (normalized from: ${currentSelectedDate})`);
    }
    
    // 기존 세션의 약어 및 표시 정보 유지 (좌장 수정 시에도 약어가 사라지지 않도록)
    let sessionAbbreviation = '';
    let displayAbbreviation = '';
    let displaySessionType = '';
    
    if (currentSessionIndex !== -1) {
        // 기존 세션 수정 시: 약어 및 표시 정보 유지
        const oldSession = sessions[currentSessionIndex];
        sessionAbbreviation = oldSession.sessionAbbreviation || '';
        displayAbbreviation = oldSession.displayAbbreviation || '';
        displaySessionType = oldSession.displaySessionType || '';
        console.log(`📝 Preserving session abbreviation: "${sessionAbbreviation}", displayAbbreviation: "${displayAbbreviation}", displaySessionType: "${displaySessionType}"`);
    }
    
    const sessionData = {
        sessionType: sessionType,
        language: language,
        title: title,
        chairId: chairId,
        chair: chair,
        chairs: chairs,  // 여러 좌장 배열 추가
        venue: venue,
        startTime: startTime,
        endTime: endTime,
        speakers: speakers,
        color: sessionColor,
        date: sessionDate,  // 기존 세션 수정 시 날짜 유지, 새 세션 생성 시 현재 선택된 날짜 사용
        sessionAbbreviation: sessionAbbreviation,  // 엑셀에서 업로드된 원본 약어
        displayAbbreviation: displayAbbreviation,  // 표시용 약어 (번호 포함 가능)
        displaySessionType: displaySessionType  // 표시용 세션 타입 (번호 포함 가능)
    };
    
    console.log('=== SAVE SESSION ===');
    console.log('Session data to save:', sessionData);
    console.log('Current session index:', currentSessionIndex);
    
    if (currentSessionIndex === -1) {
        // Add new session
        sessions.push(sessionData);
        console.log('Added new session, total sessions:', sessions.length);
    } else {
        // Update existing session
        sessions[currentSessionIndex] = sessionData;
        console.log('Updated existing session at index:', currentSessionIndex);
    }
    
    console.log('All sessions after save:', sessions);
    console.log('About to close modal and render sessions');
    
    closeSessionModal();
    console.log('Modal closed, calling renderSessions()');
    renderSessions();
    console.log('renderSessions() completed, saving program');
    saveProgram(); // 세션 수정 시 저장
}

// Save program to server
function saveProgram() {
    const eventId = document.body.getAttribute('data-event-id');
    
    const programData = {
        sessions: sessions,
        programStartTime: programStartTime,
        programEndTime: programEndTime
    };
    
    console.log('💾 Saving program data:', programData);
    console.log(`💾 Saving ${sessions.length} sessions with date info:`);
    sessions.forEach((session, index) => {
        console.log(`  ${index + 1}. "${session.title}" - Date: ${session.date || 'NO DATE'}, Time: ${session.startTime}-${session.endTime}, Venue: ${session.venue}`);
    });
    
    fetch(`/api/event_program/${eventId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(programData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('Program saved successfully');
        } else {
            alert('프로그램 저장에 실패했습니다.');
        }
    })
    .catch(error => {
        console.error('Error saving program:', error);
        alert('프로그램 저장 중 오류가 발생했습니다.');
    });
}

// Export program - 설정 모달 열기
function exportProgram() {
    if (!sessions || sessions.length === 0) {
        alert('내보낼 세션 데이터가 없습니다.');
        return;
    }
    if (typeof XLSX === 'undefined') {
        alert('엑셀 라이브러리를 불러오지 못했습니다. 네트워크 상태를 확인한 후 다시 시도해주세요.');
        return;
    }
    openExportSettingsModal();
}

function exportChairsSpeakers() {
    if (!sessions || sessions.length === 0) {
        alert('내보낼 세션 데이터가 없습니다.');
        return;
    }
    const eventId = document.body.getAttribute('data-event-id');
    if (!eventId) {
        alert('이벤트 ID를 찾을 수 없습니다.');
        return;
    }
    window.location.href = `/api/event_program/${eventId}/chairs_speakers_excel`;
}

// 엑셀 내보내기 설정 모달 열기
function openExportSettingsModal() {
    const modal = document.getElementById('exportSettingsModal');
    modal.style.display = 'flex';
    
    // 형식 선택 라디오 버튼 이벤트 리스너
    const formatRadios = document.getElementsByName('exportFormat');
    formatRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            const rowOptions = document.getElementById('rowFormatOptions');
            const calendarOptions = document.getElementById('calendarFormatOptions');
            
            if (this.value === 'rows') {
                rowOptions.style.display = 'block';
                calendarOptions.style.display = 'none';
            } else {
                rowOptions.style.display = 'none';
                calendarOptions.style.display = 'block';
            }
        });
    });

    // 캘린더 추가 옵션 표시 제어
    const detailRadios = document.getElementsByName('calendarDetailLevel');
    const calendarDetailColorOption = document.getElementById('calendarDetailColorOption');
    const calendarSimpleColorOption = document.getElementById('calendarSimpleColorOption');

    const updateCalendarDetailOptions = () => {
        const selectedDetail = document.querySelector('input[name="calendarDetailLevel"]:checked');
        
        // 세부 캘린더 색상 옵션
        if (calendarDetailColorOption) {
            if (selectedDetail && selectedDetail.value === 'speaker') {
                calendarDetailColorOption.style.display = 'block';
            } else {
                calendarDetailColorOption.style.display = 'none';
                const applyColorsCheckbox = document.getElementById('calendarDetailedApplySessionColors');
                if (applyColorsCheckbox) {
                    applyColorsCheckbox.checked = false;
                }
            }
        }
        
        // 일반 캘린더 색상 옵션
        if (calendarSimpleColorOption) {
            if (selectedDetail && selectedDetail.value === 'session') {
                calendarSimpleColorOption.style.display = 'block';
            } else {
                calendarSimpleColorOption.style.display = 'none';
                const applyColorsCheckbox = document.getElementById('calendarSimpleApplySessionColors');
                if (applyColorsCheckbox) {
                    applyColorsCheckbox.checked = false;
                }
            }
        }
    };

    detailRadios.forEach(radio => {
        radio.addEventListener('change', updateCalendarDetailOptions);
    });

    updateCalendarDetailOptions();
}

// 엑셀 내보내기 설정 모달 닫기
function closeExportSettingsModal() {
    const modal = document.getElementById('exportSettingsModal');
    modal.style.display = 'none';
}

// 참가자 정보 조회 헬퍼 함수
function getParticipantInfo(participantId) {
    if (!participantId) return null;
    return participants.find(p => p.id === participantId);
}

function pickFirstNonEmpty(values) {
    if (!Array.isArray(values)) return '';
    for (const value of values) {
        if (value === null || value === undefined) continue;
        const stringValue = typeof value === 'string' ? value.trim() : String(value).trim();
        if (stringValue.length > 0) {
            return stringValue;
        }
    }
    return '';
}

function composeNameFromParts(first, family) {
    const parts = [];
    if (first && String(first).trim().length > 0) {
        parts.push(String(first).trim());
    }
    if (family && String(family).trim().length > 0) {
        parts.push(String(family).trim());
    }
    return parts.join(' ').trim();
}

function getPreferredNameForEntity(entity, preference = 'kor') {
    if (!entity) return '';
    
    const participantInfo = getParticipantInfo(entity.participantId || entity.id) || null;
    const participantFirstLast = participantInfo
        ? composeNameFromParts(participantInfo.first_name || participantInfo.firstName, participantInfo.family_name || participantInfo.familyName)
        : '';
    const entityFirstLast = composeNameFromParts(entity.first_name || entity.firstName, entity.family_name || entity.familyName);
    
    const korName = pickFirstNonEmpty([
        entity.name_kor,
        participantInfo?.name_kor,
        participantInfo?.name,
        entity.name
    ]);
    
    const engName = pickFirstNonEmpty([
        participantFirstLast,
        entityFirstLast,
        entity.name_eng,
        participantInfo?.name_eng,
        participantInfo?.name,
        entity.name
    ]);
    
    const primary = preference === 'eng' ? engName : korName;
    const secondary = preference === 'eng' ? korName : engName;
    return primary || secondary || pickFirstNonEmpty([entity.name, participantInfo?.name]);
}

function getSessionChairDisplayText(session, preference = 'kor') {
    if (!session) return '';
    
    if (session.chairs && session.chairs.length > 0) {
        const names = session.chairs
            .map(chair => getPreferredNameForEntity(chair, preference))
            .filter(name => name && name.trim().length > 0);
        if (names.length > 0) {
            return names.join(' / ');
        }
    }
    
    if (session.chairId) {
        const singleChairName = getPreferredNameForEntity(
            { participantId: session.chairId, name: session.chair },
            preference
        );
        if (singleChairName) {
            return singleChairName;
        }
    }
    
    return session.chair || '';
}

function getSpeakerDisplayName(speaker, preference = 'kor') {
    if (!speaker) return '';
    return getPreferredNameForEntity(speaker, preference) || speaker.name || '';
}

function collectRowExportSettings(overrides = null) {
    const defaultSettings = {
        date: true,
        sessionType: true,
        sessionAbbr: true,
        sessionTitle: true,
        venue: true,
        sessionTime: true,
        chairName: true,
        chairCountry: false,
        chairAffiliation: false,
        chairEmail: false,
        chairPhone: false,
        chairAffiliationEng: false,
        chairDepartmentEng: false,
        chairPosition: false,
        speakerName: true,
        speakerCountry: false,
        speakerAffiliation: false,
        speakerEmail: false,
        speakerPhone: false,
        speakerAffiliationEng: false,
        speakerDepartmentEng: false,
        speakerPosition: false,
        speakerTopic: true,
        speakerTime: true
    };
    
    if (overrides && typeof overrides === 'object') {
        return { ...defaultSettings, ...overrides };
    }
    
    const getCheckboxValue = (id, fallback) => {
        const element = document.getElementById(id);
        if (!element) return fallback;
        return element.checked;
    };
    
    return {
        ...defaultSettings,
        chairCountry: getCheckboxValue('exportChairCountry', defaultSettings.chairCountry),
        chairAffiliation: getCheckboxValue('exportChairAffiliation', defaultSettings.chairAffiliation),
        chairEmail: getCheckboxValue('exportChairEmail', defaultSettings.chairEmail),
        chairPosition: getCheckboxValue('exportChairPosition', defaultSettings.chairPosition),
        speakerCountry: getCheckboxValue('exportSpeakerCountry', defaultSettings.speakerCountry),
        speakerAffiliation: getCheckboxValue('exportSpeakerAffiliation', defaultSettings.speakerAffiliation),
        speakerEmail: getCheckboxValue('exportSpeakerEmail', defaultSettings.speakerEmail),
        speakerPosition: getCheckboxValue('exportSpeakerPosition', defaultSettings.speakerPosition)
    };
}

// 엑셀/캘린더 뷰보내기용 세션 필드 (캘린더 뷰와 동일하게 번호 반영)
function getExportSessionFields(session) {
    const sessionType = session.sessionType || '';
    const sessionAbbr = session.displayAbbreviation || session.sessionAbbreviation || '';
    const numberedType = session.displaySessionType || session.sessionType || '';
    const topic = session.title || '';

    // 세션명: 캘린더 뷰처럼 번호가 붙은 세션 종류 + 주제 (예: "Special Interest Group 4 - AI 기술 동향")
    let sessionTitle = topic;
    if (numberedType && topic) {
        sessionTitle = `${numberedType} - ${topic}`;
    } else if (numberedType) {
        sessionTitle = numberedType;
    }

    return { sessionType, sessionAbbr, sessionTitle };
}

function generateRowExportData(overrides = null) {
    const exportSettings = collectRowExportSettings(overrides);
    
    const headers = [
        '날짜 (Date)',
        '세션 종류 (Session Type)',
        '언어 (Language)',
        '세션약어 (Session Abbreviation)',
        '세션명 (Session Topic)',
        '장소 (Venue)',
        '세션 시간 (Session Time)',
        '좌장 (한글) (Chair KOR)',
        '좌장 (영문) (Chair ENG)'
    ];
    
    if (exportSettings.chairCountry) headers.push('좌장 국가 (Chair Country)');
    if (exportSettings.chairAffiliation) headers.push('좌장 소속 (Chair Affiliation)');
    if (exportSettings.chairEmail) headers.push('좌장 이메일 (Chair Email)');
    if (exportSettings.chairPhone) headers.push('좌장 전화번호 (Chair Phone)');
    if (exportSettings.chairAffiliationEng) headers.push('좌장 소속(ENG) (Chair Affiliation ENG)');
    if (exportSettings.chairDepartmentEng) headers.push('좌장 과(ENG) (Chair Department ENG)');
    if (exportSettings.chairPosition) headers.push('좌장 직위 (Chair Position)');
    
    headers.push('발표자 (한글) (Speaker KOR)');
    headers.push('발표자 (영문) (Speaker ENG)');
    
    if (exportSettings.speakerCountry) headers.push('발표자 국가 (Speaker Country)');
    if (exportSettings.speakerAffiliation) headers.push('발표자 소속 (Speaker Affiliation)');
    if (exportSettings.speakerEmail) headers.push('발표자 이메일 (Speaker Email)');
    if (exportSettings.speakerPhone) headers.push('발표자 전화번호 (Speaker Phone)');
    if (exportSettings.speakerAffiliationEng) headers.push('발표자 소속(ENG) (Speaker Affiliation ENG)');
    if (exportSettings.speakerDepartmentEng) headers.push('발표자 과(ENG) (Speaker Department ENG)');
    if (exportSettings.speakerPosition) headers.push('발표자 직위 (Speaker Position)');
    
    headers.push('발표 주제 (Lecture Title)');
    headers.push('발표 시간 (Lecture Time)');
    
    const rows = [];
    
    const sortedSessions = [...sessions].sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        
        const timeA = a.startTime || '';
        const timeB = b.startTime || '';
        if (timeA !== timeB) return timeA.localeCompare(timeB);
        
        const venueA = a.venue || '';
        const venueB = b.venue || '';
        return venueA.localeCompare(venueB);
    });
    
    for (const session of sortedSessions) {
        const { sessionType, sessionAbbr, sessionTitle } = getExportSessionFields(session);
        const language = session.language || '';
        const venue = session.venue || '';
        const sessionTime = `${session.startTime || ''}-${session.endTime || ''}`;
        const date = session.date || '';
        
        // 좌장 정보를 배열로 저장 (각 좌장별로 분리)
        const chairsData = [];
        
        if (session.chairs && session.chairs.length > 0) {
            for (const chair of session.chairs) {
                const chairId = chair.id || chair.participantId;
                const chairInfo = getParticipantInfo(chairId);
                
                const chairData = {
                    nameKor: '',
                    nameEng: '',
                    country: '',
                    affiliation: '',
                    affiliationEng: '',
                    email: '',
                    phone: '',
                    departmentEng: '',
                    position: ''
                };
                
                if (chairInfo) {
                    chairData.nameKor = chairInfo.name_kor || '';
                    chairData.nameEng = chairInfo.name_eng || '';
                    chairData.country = chairInfo.country || '';
                    chairData.affiliation = chairInfo.affiliation_eng || chairInfo.affiliation_kor || '';
                    chairData.affiliationEng = chairInfo.affiliation_eng || '';
                    chairData.email = chairInfo.email || '';
                    chairData.phone = chairInfo.phone || '';
                    chairData.departmentEng = chairInfo.department_eng || '';
                    chairData.position = chairInfo.position || '';
                } else {
                    chairData.nameKor = chair.name || chair.name_kor || '';
                    chairData.nameEng = chair.name_eng || '';
                    chairData.email = chair.email || '';
                }
                
                chairsData.push(chairData);
            }
        } else {
            const chairInfo = getParticipantInfo(session.chairId);
            if (chairInfo) {
                chairsData.push({
                    nameKor: chairInfo.name_kor || '',
                    nameEng: chairInfo.name_eng || '',
                    country: chairInfo.country || '',
                    affiliation: chairInfo.affiliation_eng || chairInfo.affiliation_kor || '',
                    affiliationEng: chairInfo.affiliation_eng || '',
                    email: chairInfo.email || '',
                    phone: chairInfo.phone || '',
                    departmentEng: chairInfo.department_eng || '',
                    position: chairInfo.position || ''
                });
            } else if (session.chair) {
                chairsData.push({
                    nameKor: session.chair || '',
                    nameEng: '',
                    country: '',
                    affiliation: '',
                    affiliationEng: '',
                    email: '',
                    phone: '',
                    departmentEng: '',
                    position: ''
                });
            } else {
                // 좌장이 없는 경우 빈 좌장 데이터 추가
                chairsData.push({
                    nameKor: '',
                    nameEng: '',
                    country: '',
                    affiliation: '',
                    affiliationEng: '',
                    email: '',
                    phone: '',
                    departmentEng: '',
                    position: ''
                });
            }
        }
        
        // 발표자 정보를 배열로 저장 (각 발표자별로 분리)
        const speakersData = [];
        
        if (session.speakers && session.speakers.length > 0) {
            for (const speaker of session.speakers) {
                const speakerInfo = getParticipantInfo(speaker.participantId);
                
                const speakerData = {
                    nameKor: '',
                    nameEng: '',
                    country: '',
                    affiliation: '',
                    affiliationEng: '',
                    email: '',
                    phone: '',
                    departmentEng: '',
                    position: '',
                    topic: speaker.topic || '',
                    time: speaker.startTime && speaker.endTime
                        ? `${speaker.startTime}-${speaker.endTime}`
                        : ''
                };
                
                if (speakerInfo) {
                    speakerData.nameKor = speakerInfo.name_kor || '';
                    speakerData.nameEng = speakerInfo.name_eng || '';
                    speakerData.country = speakerInfo.country || '';
                    speakerData.affiliation = speakerInfo.affiliation_eng || speakerInfo.affiliation_kor || '';
                    speakerData.affiliationEng = speakerInfo.affiliation_eng || '';
                    speakerData.email = speakerInfo.email || '';
                    speakerData.phone = speakerInfo.phone || '';
                    speakerData.departmentEng = speakerInfo.department_eng || '';
                    speakerData.position = speakerInfo.position || '';
                } else {
                    speakerData.nameKor = speaker.name || '';
                    speakerData.nameEng = speaker.name || '';
                }
                
                speakersData.push(speakerData);
            }
        } else {
            // 발표자가 없는 경우 빈 발표자 데이터 추가
            speakersData.push({
                nameKor: '',
                nameEng: '',
                country: '',
                affiliation: '',
                affiliationEng: '',
                email: '',
                phone: '',
                departmentEng: '',
                position: '',
                topic: '',
                time: ''
            });
        }
        
        // 좌장 정보를 하나의 셀에 세로로 결합
        const chairNameKor = chairsData.map(c => c.nameKor).filter(n => n).join('\n');
        const chairNameEng = chairsData.map(c => c.nameEng).filter(n => n).join('\n');
        const chairCountry = chairsData.map(c => c.country).filter(c => c).join('\n');
        const chairAffiliation = chairsData.map(c => c.affiliation).filter(a => a).join('\n');
        const chairEmail = chairsData.map(c => c.email).filter(e => e).join('\n');
        const chairPhone = chairsData.map(c => c.phone).filter(p => p).join('\n');
        const chairAffiliationEng = chairsData.map(c => c.affiliationEng).filter(a => a).join('\n');
        const chairDepartmentEng = chairsData.map(c => c.departmentEng).filter(d => d).join('\n');
        const chairPosition = chairsData.map(c => c.position).filter(p => p).join('\n');
        
        // 각 발표자별로 행 생성 (좌장은 하나의 셀에 세로로 표시)
        for (const speakerData of speakersData) {
            const row = [
                date,
                sessionType,
                language,
                sessionAbbr,
                sessionTitle,
                venue,
                sessionTime,
                chairNameKor,
                chairNameEng
            ];
            
            if (exportSettings.chairCountry) row.push(chairCountry);
            if (exportSettings.chairAffiliation) row.push(chairAffiliation);
            if (exportSettings.chairEmail) row.push(chairEmail);
            if (exportSettings.chairPhone) row.push(chairPhone);
            if (exportSettings.chairAffiliationEng) row.push(chairAffiliationEng);
            if (exportSettings.chairDepartmentEng) row.push(chairDepartmentEng);
            if (exportSettings.chairPosition) row.push(chairPosition);
            
            row.push(speakerData.nameKor);
            row.push(speakerData.nameEng);
            
            if (exportSettings.speakerCountry) row.push(speakerData.country);
            if (exportSettings.speakerAffiliation) row.push(speakerData.affiliation);
            if (exportSettings.speakerEmail) row.push(speakerData.email);
            if (exportSettings.speakerPhone) row.push(speakerData.phone);
            if (exportSettings.speakerAffiliationEng) row.push(speakerData.affiliationEng);
            if (exportSettings.speakerDepartmentEng) row.push(speakerData.departmentEng);
            if (exportSettings.speakerPosition) row.push(speakerData.position);
            
            row.push(speakerData.topic);
            row.push(speakerData.time);
            
            rows.push(sanitizeRowLanguageMarkers(row, headers));
        }
    }
    
    return { headers, rows, exportSettings };
}

function sanitizeRowLanguageMarkers(row, headers) {
    if (!Array.isArray(row)) return row;
    
    return row.map((cell, idx) => {
        if (typeof cell !== 'string') return cell;
        const lowerCell = cell.toLowerCase();
        if (!lowerCell.includes('*english session*')) return cell;
        
        const header = headers[idx] ? String(headers[idx]).toLowerCase() : '';
        const isSessionTopicColumn =
            header.includes('세션명') ||
            header.includes('session topic');
        if (isSessionTopicColumn) {
            return cell;
        }
        
        const isLanguageColumn =
            header.includes('언어') ||
            header.includes('language');
        
        if (isLanguageColumn) {
            return cell.replace(/\*/g, '').replace(/\s+/g, ' ').trim();
        }
        
        const cleaned = cell.replace(/\*english session\*/gi, '').replace(/\s+/g, ' ').trim();
        if (cleaned.includes('*')) {
            return cleaned.replace(/\*/g, '');
        }
        return cleaned;
    });
}

function normalizeLanguageForExport(language) {
    if (!language) return '';
    return language.replace(/\*/g, '').replace(/\s+/g, ' ').trim();
}

function initializeViewModeControls() {
    const toggleButtons = document.querySelectorAll('.view-toggle-btn');
    toggleButtons.forEach(button => {
        button.addEventListener('click', () => {
            const viewMode = button.getAttribute('data-view-mode');
            setViewMode(viewMode);
        });
    });
    
    const searchInput = document.getElementById('excelViewSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (event) => {
            excelViewState.searchTerm = (event.target.value || '').trim().toLowerCase();
            applyExcelViewFilters();
        });
    }
    
    const refreshBtn = document.getElementById('excelViewRefreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            refreshExcelViewData(true);
        });
    }
    
    // 필터 체크박스 이벤트 리스너
    const filterCheckboxes = {
        domesticChair: document.getElementById('filterDomesticChair'),
        overseasChair: document.getElementById('filterOverseasChair'),
        noChair: document.getElementById('filterNoChair'),
        domesticSpeaker: document.getElementById('filterDomesticSpeaker'),
        overseasSpeaker: document.getElementById('filterOverseasSpeaker'),
        noSpeaker: document.getElementById('filterNoSpeaker')
    };
    
    Object.keys(filterCheckboxes).forEach(key => {
        const checkbox = filterCheckboxes[key];
        if (checkbox) {
            // 초기 상태 동기화
            checkbox.checked = excelViewState.filters[key] !== false;
            checkbox.addEventListener('change', () => {
                excelViewState.filters[key] = checkbox.checked;
                applyExcelViewFilters();
            });
        }
    });
    
    // 필터 초기화 버튼
    const resetFiltersBtn = document.getElementById('resetFiltersBtn');
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', () => {
            resetExcelViewFilters();
        });
    }
}

function resetExcelViewFilters() {
    // 모든 필터를 선택 해제 상태(false)로 리셋
    excelViewState.filters = {
        domesticChair: false,
        overseasChair: false,
        noChair: false,
        domesticSpeaker: false,
        overseasSpeaker: false,
        noSpeaker: false
    };
    
    // 모든 체크박스를 체크 해제
    const filterCheckboxes = {
        domesticChair: document.getElementById('filterDomesticChair'),
        overseasChair: document.getElementById('filterOverseasChair'),
        noChair: document.getElementById('filterNoChair'),
        domesticSpeaker: document.getElementById('filterDomesticSpeaker'),
        overseasSpeaker: document.getElementById('filterOverseasSpeaker'),
        noSpeaker: document.getElementById('filterNoSpeaker')
    };
    
    Object.keys(filterCheckboxes).forEach(key => {
        const checkbox = filterCheckboxes[key];
        if (checkbox) {
            checkbox.checked = false;
        }
    });
    
    // 검색어도 초기화
    const searchInput = document.getElementById('excelViewSearchInput');
    if (searchInput) {
        searchInput.value = '';
        excelViewState.searchTerm = '';
    }
    
    // 필터 재적용
    applyExcelViewFilters();
}

function setViewMode(mode) {
    if (!mode || mode === currentViewMode) {
        return;
    }
    
    currentViewMode = mode;
    
    const calendarContainer = document.querySelector('.calendar-container');
    const excelContainer = document.getElementById('excelViewContainer');
    const toggleButtons = document.querySelectorAll('.view-toggle-btn');
    
    toggleButtons.forEach(button => {
        const buttonMode = button.getAttribute('data-view-mode');
        if (buttonMode === currentViewMode) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
    
    if (calendarContainer && excelContainer) {
        if (currentViewMode === 'excel') {
            calendarContainer.style.display = 'none';
            excelContainer.style.display = 'block';
            refreshExcelViewData(!excelViewState.initialized);
        } else {
            calendarContainer.style.display = '';
            excelContainer.style.display = 'none';
        }
    }
}

function refreshExcelViewData(forceRegenerate = false) {
    const excelContainer = document.getElementById('excelViewContainer');
    if (!excelContainer) return;
    
    try {
        if (!excelViewState.initialized || forceRegenerate) {
            // 캘린더 뷰와 동일한 세션 번호를보내기 데이터에 반영
            if (typeof assignSessionNumbers === 'function' && Array.isArray(sessions) && sessions.length > 0) {
                assignSessionNumbers();
            }
            // 엑셀 뷰에서는 모든 컬럼을 포함하도록 설정
            const allColumnsSettings = {
                date: true,
                sessionType: true,
                sessionAbbr: true,
                sessionTitle: true,
                venue: true,
                sessionTime: true,
                chairName: true,
                chairCountry: true,
                chairAffiliation: true,
                chairEmail: true,
                chairPhone: true,
                chairAffiliationEng: true,
                chairDepartmentEng: true,
                chairPosition: true,
                speakerName: true,
                speakerCountry: true,
                speakerAffiliation: true,
                speakerEmail: true,
                speakerPhone: true,
                speakerAffiliationEng: true,
                speakerDepartmentEng: true,
                speakerPosition: true,
                speakerTopic: true,
                speakerTime: true
            };
            const { headers, rows, exportSettings } = generateRowExportData(allColumnsSettings);
            excelViewState.headers = headers;
            excelViewState.rows = rows;
            excelViewState.exportSettings = exportSettings;
            excelViewState.initialized = true;
        }
        applyExcelViewFilters();
    } catch (error) {
        console.error('❌ Error refreshing Excel view:', error);
        excelViewState.initialized = false;
        showExcelViewError('엑셀 뷰 데이터를 불러오는 중 문제가 발생했습니다.');
    }
}

function applyExcelViewFilters() {
    if (!excelViewState.initialized) return;
    
    const searchTerm = excelViewState.searchTerm || '';
    const filters = excelViewState.filters || {
        domesticChair: true,
        overseasChair: true,
        noChair: true,
        domesticSpeaker: true,
        overseasSpeaker: true,
        noSpeaker: true
    };
    
    // 활성화된 필터 확인
    const hasChairFilter = filters.domesticChair || filters.overseasChair || filters.noChair;
    const hasSpeakerFilter = filters.domesticSpeaker || filters.overseasSpeaker || filters.noSpeaker;
    
    // 컬럼 인덱스 찾기
    const baseColumns = [
        '날짜 (Date)',
        '세션 종류 (Session Type)',
        '언어 (Language)',
        '세션약어 (Session Abbreviation)',
        '세션명 (Session Topic)',
        '장소 (Venue)',
        '세션 시간 (Session Time)'
    ];
    
    const chairKorIndex = excelViewState.headers.findIndex(h => 
        h && (h.includes('좌장 (한글)') || h.includes('Chair KOR'))
    );
    const chairEngIndex = excelViewState.headers.findIndex(h => 
        h && (h.includes('좌장 (영문)') || h.includes('Chair ENG'))
    );
    const chairCountryIndex = excelViewState.headers.findIndex(h => 
        h && (h.includes('좌장 국가') || h.includes('Chair Country'))
    );
    const chairAffiliationIndex = excelViewState.headers.findIndex(h => 
        h && (h.includes('좌장 소속') || h.includes('Chair Affiliation'))
    );
    const chairEmailIndex = excelViewState.headers.findIndex(h => 
        h && (h.includes('좌장 이메일') || h.includes('Chair Email'))
    );
    const chairPositionIndex = excelViewState.headers.findIndex(h => 
        h && (h.includes('좌장 직위') || h.includes('Chair Position'))
    );
    
    const speakerKorIndex = excelViewState.headers.findIndex(h => 
        h && (h.includes('발표자 (한글)') || h.includes('Speaker KOR'))
    );
    const speakerEngIndex = excelViewState.headers.findIndex(h => 
        h && (h.includes('발표자 (영문)') || h.includes('Speaker ENG'))
    );
    const speakerCountryIndex = excelViewState.headers.findIndex(h => 
        h && (h.includes('발표자 국가') || h.includes('Speaker Country'))
    );
    const speakerAffiliationIndex = excelViewState.headers.findIndex(h => 
        h && (h.includes('발표자 소속') || h.includes('Speaker Affiliation'))
    );
    const speakerEmailIndex = excelViewState.headers.findIndex(h => 
        h && (h.includes('발표자 이메일') || h.includes('Speaker Email'))
    );
    const speakerPositionIndex = excelViewState.headers.findIndex(h => 
        h && (h.includes('발표자 직위') || h.includes('Speaker Position'))
    );
    const lectureTitleIndex = excelViewState.headers.findIndex(h => 
        h && (h.includes('발표 주제') || h.includes('Lecture Title'))
    );
    const lectureTimeIndex = excelViewState.headers.findIndex(h => 
        h && (h.includes('발표 시간') || h.includes('Lecture Time'))
    );
    
    // 표시할 컬럼 인덱스 결정
    const visibleColumnIndices = [];
    
    // 기본 컬럼 (항상 표시)
    for (let i = 0; i < baseColumns.length; i++) {
        visibleColumnIndices.push(i);
    }
    
    // 좌장 관련 컬럼
    if (hasChairFilter) {
        if (chairKorIndex >= 0) visibleColumnIndices.push(chairKorIndex);
        if (chairEngIndex >= 0) visibleColumnIndices.push(chairEngIndex);
        if (chairCountryIndex >= 0) visibleColumnIndices.push(chairCountryIndex);
        if (chairAffiliationIndex >= 0) visibleColumnIndices.push(chairAffiliationIndex);
        if (chairEmailIndex >= 0) visibleColumnIndices.push(chairEmailIndex);
        if (chairPositionIndex >= 0) visibleColumnIndices.push(chairPositionIndex);
    }
    
    // 발표자 관련 컬럼
    if (hasSpeakerFilter) {
        if (speakerKorIndex >= 0) visibleColumnIndices.push(speakerKorIndex);
        if (speakerEngIndex >= 0) visibleColumnIndices.push(speakerEngIndex);
        if (speakerCountryIndex >= 0) visibleColumnIndices.push(speakerCountryIndex);
        if (speakerAffiliationIndex >= 0) visibleColumnIndices.push(speakerAffiliationIndex);
        if (speakerEmailIndex >= 0) visibleColumnIndices.push(speakerEmailIndex);
        if (speakerPositionIndex >= 0) visibleColumnIndices.push(speakerPositionIndex);
        if (lectureTitleIndex >= 0) visibleColumnIndices.push(lectureTitleIndex);
        if (lectureTimeIndex >= 0) visibleColumnIndices.push(lectureTimeIndex);
    }
    
    // 중복 제거 및 정렬
    const uniqueVisibleIndices = [...new Set(visibleColumnIndices)].sort((a, b) => a - b);
    
    let filtered = [...excelViewState.rows];
    
    // 검색어 필터 적용
    if (searchTerm.length > 0) {
        filtered = filtered.filter(row => {
            return row.some((cell, idx) => {
                if (uniqueVisibleIndices.includes(idx)) {
                    if (cell === null || cell === undefined) return false;
                    return String(cell).toLowerCase().includes(searchTerm);
                }
                return false;
            });
        });
    }
    
    // 국가 필터 적용
    filtered = filtered.filter(row => {
        let chairPass = false;
        let speakerPass = false;
        
        // 좌장 필터 확인
        if (hasChairFilter) {
            if (chairCountryIndex >= 0 && chairCountryIndex < row.length) {
                const chairCountry = String(row[chairCountryIndex] || '').trim();
                if (chairCountry) {
                    // 여러 명의 좌장이 있을 경우 "Korea / Korea" 형식으로 저장됨
                    // "/"로 분리해서 각각 확인
                    const countries = chairCountry.split('/').map(c => c.trim()).filter(c => c);
                    const allDomestic = countries.length > 0 && countries.every(c => 
                        c.toLowerCase() === 'korea' || c.toLowerCase() === '대한민국'
                    );
                    const hasOverseas = countries.some(c => 
                        c.toLowerCase() !== 'korea' && c.toLowerCase() !== '대한민국'
                    );
                    
                    if (allDomestic && filters.domesticChair) {
                        chairPass = true;
                    } else if (hasOverseas && filters.overseasChair) {
                        chairPass = true;
                    }
                } else {
                    // 좌장 국가 정보가 없는 경우 (좌장 없음)
                    if (filters.noChair) {
                        chairPass = true;
                    }
                }
            } else {
                // 좌장 국가 컬럼이 없는 경우: 좌장 이름 컬럼 확인
                const chairKorIndex = excelViewState.headers.findIndex(h => 
                    h && (h.includes('좌장 (한글)') || h.includes('Chair KOR'))
                );
                const chairEngIndex = excelViewState.headers.findIndex(h => 
                    h && (h.includes('좌장 (영문)') || h.includes('Chair ENG'))
                );
                const hasChair = (chairKorIndex >= 0 && row[chairKorIndex] && String(row[chairKorIndex]).trim()) ||
                                (chairEngIndex >= 0 && row[chairEngIndex] && String(row[chairEngIndex]).trim());
                
                if (!hasChair && filters.noChair) {
                    chairPass = true;
                } else if (hasChair) {
                    // 좌장이 있지만 국가 정보가 없음: 모든 좌장 필터 허용
                    chairPass = filters.domesticChair || filters.overseasChair || filters.noChair;
                }
            }
        } else {
            // 좌장 필터가 없으면 항상 통과
            chairPass = true;
        }
        
        // 발표자 필터 확인
        if (hasSpeakerFilter) {
            if (speakerCountryIndex >= 0 && speakerCountryIndex < row.length) {
                const speakerCountry = String(row[speakerCountryIndex] || '').trim();
                if (speakerCountry) {
                    // 여러 명의 발표자가 있을 경우 "Korea / Korea" 형식으로 저장됨
                    // "/"로 분리해서 각각 확인
                    const countries = speakerCountry.split('/').map(c => c.trim()).filter(c => c);
                    const allDomestic = countries.length > 0 && countries.every(c => 
                        c.toLowerCase() === 'korea' || c.toLowerCase() === '대한민국'
                    );
                    const hasOverseas = countries.some(c => 
                        c.toLowerCase() !== 'korea' && c.toLowerCase() !== '대한민국'
                    );
                    
                    if (allDomestic && filters.domesticSpeaker) {
                        speakerPass = true;
                    } else if (hasOverseas && filters.overseasSpeaker) {
                        speakerPass = true;
                    }
                } else {
                    // 발표자 국가 정보가 없는 경우 (발표자 없음)
                    if (filters.noSpeaker) {
                        speakerPass = true;
                    }
                }
            } else {
                // 발표자 국가 컬럼이 없는 경우: 발표자 이름 컬럼 확인
                const speakerKorIndex = excelViewState.headers.findIndex(h => 
                    h && (h.includes('발표자 (한글)') || h.includes('Speaker KOR'))
                );
                const speakerEngIndex = excelViewState.headers.findIndex(h => 
                    h && (h.includes('발표자 (영문)') || h.includes('Speaker ENG'))
                );
                const hasSpeaker = (speakerKorIndex >= 0 && row[speakerKorIndex] && String(row[speakerKorIndex]).trim()) ||
                                  (speakerEngIndex >= 0 && row[speakerEngIndex] && String(row[speakerEngIndex]).trim());
                
                if (!hasSpeaker && filters.noSpeaker) {
                    speakerPass = true;
                } else if (hasSpeaker) {
                    // 발표자가 있지만 국가 정보가 없음: 모든 발표자 필터 허용
                    speakerPass = filters.domesticSpeaker || filters.overseasSpeaker || filters.noSpeaker;
                }
            }
        } else {
            // 발표자 필터가 없으면 항상 통과
            speakerPass = true;
        }
        
        return chairPass && speakerPass;
    });
    
    // 좌장 필터만 활성화되어 있고 발표자 필터가 없으면 중복 제거 (세션당 한 행만 표시)
    if (hasChairFilter && !hasSpeakerFilter) {
        const sessionKeyMap = new Map();
        
        filtered = filtered.filter(row => {
            // 세션 정보로 키 생성 (날짜, 세션 종류, 언어, 세션약어, 세션명, 장소, 세션 시간, 좌장 정보)
            const sessionKeyParts = [];
            
            // 기본 세션 정보 컬럼 (0~6)
            for (let i = 0; i < baseColumns.length; i++) {
                sessionKeyParts.push(String(row[i] || ''));
            }
            
            // 좌장 관련 컬럼들 추가
            if (chairKorIndex >= 0) sessionKeyParts.push(String(row[chairKorIndex] || ''));
            if (chairEngIndex >= 0) sessionKeyParts.push(String(row[chairEngIndex] || ''));
            if (chairCountryIndex >= 0) sessionKeyParts.push(String(row[chairCountryIndex] || ''));
            if (chairAffiliationIndex >= 0) sessionKeyParts.push(String(row[chairAffiliationIndex] || ''));
            if (chairEmailIndex >= 0) sessionKeyParts.push(String(row[chairEmailIndex] || ''));
            if (chairPositionIndex >= 0) sessionKeyParts.push(String(row[chairPositionIndex] || ''));
            
            const sessionKey = sessionKeyParts.join('|||');
            
            if (sessionKeyMap.has(sessionKey)) {
                return false; // 이미 표시된 세션이므로 제외
            } else {
                sessionKeyMap.set(sessionKey, true);
                return true; // 첫 번째 행만 유지
            }
        });
    }
    
    excelViewState.filteredRows = filtered;
    excelViewState.visibleColumnIndices = uniqueVisibleIndices;
    
    renderExcelViewTable();
}

function renderExcelViewTable() {
    const table = document.getElementById('excelViewTable');
    const tableHead = table?.querySelector('thead');
    const tableBody = table?.querySelector('tbody');
    const emptyState = document.getElementById('excelViewEmptyState');
    const rowCountLabel = document.getElementById('excelViewRowCount');
    
    if (!table || !tableHead || !tableBody) return;
    
    tableHead.innerHTML = '';
    tableBody.innerHTML = '';
    
    const visibleIndices = excelViewState.visibleColumnIndices || [];
    
    if (excelViewState.headers.length > 0 && visibleIndices.length > 0) {
        const headerRow = document.createElement('tr');
        visibleIndices.forEach(originalIndex => {
            const th = document.createElement('th');
            th.textContent = excelViewState.headers[originalIndex];
            th.setAttribute('data-col-index', originalIndex);
            headerRow.appendChild(th);
        });
        tableHead.appendChild(headerRow);
    }
    
    if (excelViewState.filteredRows.length === 0) {
        tableBody.style.display = 'none';
        if (emptyState) {
            emptyState.innerHTML = `
                <i class="fas fa-folder-open"></i>
                <p>표시할 데이터가 없습니다.</p>
            `;
            emptyState.style.display = 'flex';
        }
    } else {
        tableBody.style.display = '';
        excelViewState.filteredRows.forEach(row => {
            const tr = document.createElement('tr');
            visibleIndices.forEach(originalIndex => {
                const td = document.createElement('td');
                const cell = row[originalIndex];
                const cellDiv = document.createElement('div');
                
                if (cell === null || cell === undefined) {
                    cellDiv.textContent = '';
                    td.title = '';
                } else {
                    const cellStr = String(cell);
                    // 줄바꿈 문자(\n)를 <br>로 변환하여 표시 (line-clamp와 호환)
                    cellDiv.innerHTML = cellStr.replace(/\n/g, '<br>');
                    // 툴팁으로 전체 내용 표시
                    td.title = cellStr;
                }
                
                td.appendChild(cellDiv);
                td.setAttribute('data-col-index', originalIndex);
                tr.appendChild(td);
            });
            tableBody.appendChild(tr);
        });
        if (emptyState) {
            emptyState.style.display = 'none';
        }
    }
    
    if (rowCountLabel) {
        rowCountLabel.textContent = `총 ${excelViewState.filteredRows.length.toLocaleString()}행`;
    }
}

function showExcelViewError(message) {
    const emptyState = document.getElementById('excelViewEmptyState');
    const table = document.getElementById('excelViewTable');
    const rowCountLabel = document.getElementById('excelViewRowCount');
    if (!emptyState || !table) return;
    
    const tableHead = table.querySelector('thead');
    const tableBody = table.querySelector('tbody');
    
    if (tableHead) tableHead.innerHTML = '';
    if (tableBody) {
        tableBody.innerHTML = '';
        tableBody.style.display = 'none';
    }
    
    emptyState.style.display = 'flex';
    emptyState.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <p>${message}</p>
    `;
    
    if (rowCountLabel) {
        rowCountLabel.textContent = '총 0행';
    }
}

// 실제 엑셀 내보내기 수행
function performExport() {
    // 선택된 형식 확인
    const selectedFormat = document.querySelector('input[name="exportFormat"]:checked').value;
    
    if (selectedFormat === 'calendar') {
        // 캘린더 세부화 수준 확인
        const detailLevelElement = document.querySelector('input[name="calendarDetailLevel"]:checked');
        const detailLevel = detailLevelElement ? detailLevelElement.value : 'session';
        exportProgramCalendar(detailLevel);
    } else {
        exportProgramRows();
    }
}

function applyEnglishSessionHighlight(ws, sheetData) {
    if (typeof XLSX === 'undefined' || !ws || !sheetData) return;
    
    const highlightKeyword = ENGLISH_SESSION_KEYWORD;
    const highlightColor = ENGLISH_SESSION_FONT_COLOR;
    let allowedColumns = null;
    
    if (Array.isArray(sheetData) && sheetData.length > 0 && Array.isArray(sheetData[0])) {
        const headerRow = sheetData[0];
        const matchedColumns = [];
        headerRow.forEach((headerCell, idx) => {
            if (typeof headerCell === 'string') {
                const normalizedHeader = headerCell.toLowerCase();
                if (
                    normalizedHeader.includes('세션명') ||
                    normalizedHeader.includes('session topic')
                ) {
                    matchedColumns.push(idx);
                }
            }
        });
        if (matchedColumns.length > 0) {
            allowedColumns = matchedColumns;
        }
    }
    
    for (let rowIndex = 0; rowIndex < sheetData.length; rowIndex++) {
        const row = sheetData[rowIndex];
        if (!Array.isArray(row)) continue;
        const isHeaderRow = rowIndex === 0;
        
        for (let colIndex = 0; colIndex < row.length; colIndex++) {
            if (allowedColumns && !allowedColumns.includes(colIndex)) continue;
            if (isHeaderRow) continue;
            const value = row[colIndex];
            if (typeof value !== 'string' || !value.toLowerCase().includes(highlightKeyword)) continue;
            
            const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
            const cell = ws[cellAddress];
            if (!cell) continue;
            
            const applyHighlightToText = (text, baseStyle) => {
                const regex = new RegExp(highlightKeyword, 'gi');
                const segments = [];
                let lastIndex = 0;
                let match;
                let hasMatch = false;
                
                while ((match = regex.exec(text)) !== null) {
                    hasMatch = true;
                    const matchStart = match.index;
                    const matchEnd = regex.lastIndex;
                    
                    if (matchStart > lastIndex) {
                        const beforeText = text.slice(lastIndex, matchStart);
                        if (beforeText) {
                            segments.push({
                                ...baseStyle,
                                t: beforeText
                            });
                        }
                    }
                    
                    const baseFont = baseStyle?.s?.font ? { ...baseStyle.s.font } : {};
                    baseFont.color = { rgb: highlightColor };
                    baseFont.bold = true;
                    
                    segments.push({
                        ...baseStyle,
                        t: match[0],
                        s: {
                            ...(baseStyle?.s || {}),
                            font: {
                                ...baseFont
                            }
                        }
                    });
                    
                    lastIndex = matchEnd;
                }
                
                if (!hasMatch) {
                    return null;
                }
                
                if (lastIndex < text.length) {
                    const afterText = text.slice(lastIndex);
                    if (afterText) {
                        segments.push({
                            ...baseStyle,
                            t: afterText
                        });
                    }
                }
                
                return segments;
            };
            
            if (Array.isArray(cell.r)) {
                const updatedRichText = [];
                
                cell.r.forEach(segment => {
                    const segmentText = segment?.t || '';
                    if (!segmentText) {
                        updatedRichText.push(segment);
                        return;
                    }
                    
                    const highlightedSegments = applyHighlightToText(segmentText, segment);
                    if (highlightedSegments) {
                        highlightedSegments.forEach(seg => updatedRichText.push(seg));
                    } else {
                        updatedRichText.push(segment);
                    }
                });
                
                cell.r = updatedRichText;
            } else {
                const highlightedSegments = applyHighlightToText(value, { t: '', s: cell.s ? { ...cell.s } : undefined });
                if (!highlightedSegments) continue;
                
                const richText = highlightedSegments.map(segment => {
                    const { t, s, ...rest } = segment;
                    const cleanSegment = { t };
                    if (s) cleanSegment.s = s;
                    Object.keys(rest).forEach(key => {
                        if (key !== 't' && key !== 's' && rest[key] !== undefined) {
                            cleanSegment[key] = rest[key];
                        }
                    });
                    return cleanSegment;
                });
                
                cell.t = 's';
                cell.v = value;
                cell.w = value;
                cell.r = richText;
            }
            
            const existingStyle = cell.s ? { ...cell.s } : {};
            const existingAlignment = existingStyle.alignment ? { ...existingStyle.alignment } : {};
            
            cell.s = {
                ...existingStyle,
                alignment: {
                    ...existingAlignment,
                    wrapText: true,
                    vertical: existingAlignment.vertical || 'top'
                }
            };
        }
    }
}
// 행 기반 엑셀 내보내기
function exportProgramRows() {
    try {
        if (typeof XLSX === 'undefined') {
            alert('엑셀 라이브러리를 불러오지 못했습니다. 네트워크 상태를 확인한 후 다시 시도해주세요.');
            return;
        }
        console.log('📊 Exporting program to Excel (Row Format)...');
        
        const { headers, rows } = generateRowExportData();
        const excelData = [headers, ...rows];
        
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(excelData);
        applyEnglishSessionHighlight(ws, excelData);
        
        // 열 너비 자동 계산
        const colWidths = headers.map((header, i) => {
            const maxLength = Math.max(
                header.length,
                ...rows.map(row => String(row[i] || '').length)
            );
            return { wch: Math.min(Math.max(maxLength + 2, 12), 50) };
        });
        ws['!cols'] = colWidths;
        
        XLSX.utils.book_append_sheet(wb, ws, 'Event Program');
        
        // 파일명 생성 (날짜 포함)
    const eventId = document.body.getAttribute('data-event-id');
        const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const filename = `event_program_${eventId}_${today}.xlsx`;
        
        // 파일 다운로드
        XLSX.writeFile(wb, filename);
        
        console.log(`✅ Program exported: ${filename} (${sessions.length} sessions, ${excelData.length - 1} rows)`);
        
        // 모달 닫기
        closeExportSettingsModal();
        
    } catch (error) {
        console.error('❌ Error exporting program:', error);
        alert('프로그램 내보내기 중 오류가 발생했습니다: ' + error.message);
    }
}

// 시간을 분으로 변환하는 헬퍼 함수
function calculateDurationInMinutes(startTime, endTime) {
    if (!startTime || !endTime) return null;
    
    const parseTime = (timeStr) => {
        const parts = timeStr.split(':');
        if (parts.length !== 2) return null;
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        if (isNaN(hours) || isNaN(minutes)) return null;
        return hours * 60 + minutes;
    };
    
    const startMinutes = parseTime(startTime);
    const endMinutes = parseTime(endTime);
    
    if (startMinutes === null || endMinutes === null) return null;
    if (endMinutes < startMinutes) return null; // 잘못된 시간 범위
    
    return endMinutes - startMinutes;
}

// 캘린더 형식 엑셀 내보내기
function exportProgramCalendar(detailLevel = 'session') {
    try {
        if (typeof XLSX === 'undefined') {
            alert('엑셀 라이브러리를 불러오지 못했습니다. 네트워크 상태를 확인한 후 다시 시도해주세요.');
            return;
        }
        console.log(`📅 Exporting program to Excel (Calendar Format - ${detailLevel})...`);
        
        if (!sessions || sessions.length === 0) {
            alert('내보낼 세션 데이터가 없습니다.');
            return;
        }
        
        // 세부화 수준에 따라 다른 함수 호출
        if (detailLevel === 'speaker') {
            exportProgramCalendarDetailed();
        } else {
            exportProgramCalendarSimple();
        }
    } catch (error) {
        console.error('❌ Error exporting calendar:', error);
        alert('캘린더 내보내기 중 오류가 발생했습니다: ' + error.message);
    }
}

// 일반 캘린더 내보내기 (기존 방식)
function exportProgramCalendarSimple() {
    try {
        console.log('📅 Exporting simple calendar format...');
        
        const applySessionColors = document.getElementById('calendarSimpleApplySessionColors')?.checked || false;
        const excludeNames = document.getElementById('calendarSimpleExcludeNames')?.checked || false;
        const resolveSessionColorId = (sessionObj) => {
            if (!sessionObj) return 1;
            if (sessionObj.color !== undefined && sessionObj.color !== null && sessionObj.color !== '') {
                const parsed = parseInt(sessionObj.color, 10);
                if (!Number.isNaN(parsed) && SESSION_COLOR_EXPORT_MAP[parsed]) {
                    return parsed;
                }
            }
            if (sessionObj.sessionType && sessionTypeColors.has(sessionObj.sessionType)) {
                const mappedColor = sessionTypeColors.get(sessionObj.sessionType);
                if (SESSION_COLOR_EXPORT_MAP[mappedColor]) {
                    return mappedColor;
                }
            }
            if (sessionObj.sessionType) {
                const fallbackColor = getColorForSessionType(sessionObj.sessionType);
                if (SESSION_COLOR_EXPORT_MAP[fallbackColor]) {
                    return fallbackColor;
                }
            }
            return 1;
        };
        
        if (!sessions || sessions.length === 0) {
            alert('내보낼 세션 데이터가 없습니다.');
            return;
        }
        
        // 날짜별로 세션 그룹화 (날짜 정규화하여 같은 날짜는 같은 시트에 포함)
        const sessionsByDate = {};
        sessions.forEach(session => {
            // 날짜를 정규화하여 형식 차이로 인한 분리 방지
            // normalizeDateValue는 파싱 가능하면 정규화된 문자열 반환,
            // 파싱 불가능하면 원본 문자열 반환, null/undefined/빈 문자열이면 '' 반환
            let date;
            if (session.date != null) {
                const normalized = normalizeDateValue(session.date);
                // 정규화된 값이 빈 문자열이면 원본 날짜 보존 (파싱 실패 또는 원본이 null/undefined/빈 문자열인 경우)
                // 정규화된 값이 있으면 사용 (파싱 성공 또는 원본 문자열)
                date = (normalized === '') ? session.date : normalized;
            } else {
                date = 'No Date';
            }
            if (!sessionsByDate[date]) {
                sessionsByDate[date] = [];
            }
            sessionsByDate[date].push(session);
        });
        
        // 워크북 생성
        const wb = XLSX.utils.book_new();
        
        // 각 날짜별로 시트 생성
        const dates = Object.keys(sessionsByDate).sort();
        
        for (const date of dates) {
            const dateSessions = sessionsByDate[date];
            
            // 해당 날짜의 모든 venue 추출
            const venuesSet = new Set();
            dateSessions.forEach(session => {
                if (session.venue) venuesSet.add(session.venue);
            });
            const venuesList = Array.from(venuesSet).sort();
            
            // 모든 시간 슬롯 추출
            const timeSlotsSet = new Set();
            dateSessions.forEach(session => {
                const timeSlot = `${session.startTime || ''}-${session.endTime || ''}`;
                timeSlotsSet.add(timeSlot);
            });
            const timeSlots = Array.from(timeSlotsSet).sort();
            
            // 헤더 행 생성
            const headerRow = ['Time / Venue', ...venuesList];
            const sheetData = [headerRow];
            
            // 셀 스타일 정보 저장 (행 인덱스, 열 인덱스, 색상 ID)
            const cellStyles = {}; // key: "row_col", value: { colorId }
            
            // 각 시간 슬롯에 대해
            for (let rowIdx = 0; rowIdx < timeSlots.length; rowIdx++) {
                const timeSlot = timeSlots[rowIdx];
                const [startTime, endTime] = timeSlot.split('-');
                const row = [timeSlot];
                
                // 각 venue에 대해
                for (let colIdx = 0; colIdx < venuesList.length; colIdx++) {
                    const venue = venuesList[colIdx];
                    // 이 시간대 + venue에 해당하는 세션 찾기
                    const matchingSessions = dateSessions.filter(session => 
                        session.venue === venue && 
                        `${session.startTime || ''}-${session.endTime || ''}` === timeSlot
                    );
                    
                    if (matchingSessions.length > 0) {
                        // 세션 정보 포맷
                        const cellContent = matchingSessions.map(session => {
                            let content = '';
                            
                            // 세션 타입과 제목
                            let sessionHeader = session.displayAbbreviation 
                                ? `[${session.displayAbbreviation}] ${session.title}`
                                : session.title;
                            
                            // Program at a Glance 모드일 때 세션 시간(분) 추가
                            if (excludeNames && session.startTime && session.endTime) {
                                const durationMinutes = calculateDurationInMinutes(session.startTime, session.endTime);
                                if (durationMinutes !== null) {
                                    sessionHeader += ` (${durationMinutes}')`;
                                }
                            }
                            
                            content += sessionHeader + '\n';
                            
                            // 좌장 정보 (이름 제외 옵션이 체크되지 않은 경우에만)
                            if (!excludeNames) {
                                if (session.chairs && session.chairs.length > 0) {
                                    const chairNames = session.chairs.map(chair => {
                                        const chairInfo = getParticipantInfo(chair.id || chair.participantId);
                                        if (chairInfo) {
                                            const name = chairInfo.name_eng || chairInfo.name_kor || chair.name;
                                            const country = chairInfo.country ? ` (${chairInfo.country})` : '';
                                            return name + country;
                                        }
                                        return chair.name || '';
                                    }).filter(n => n).join(', ');
                                    content += 'Chair: ' + chairNames + '\n';
                                } else if (session.chair) {
                                    content += 'Chair: ' + session.chair + '\n';
                                }
                            }
                            
                            // 발표자 정보 (이름 및 제목 제외 옵션이 체크되지 않은 경우에만)
                            if (session.speakers && session.speakers.length > 0 && !excludeNames) {
                                content += '\n';
                                session.speakers.forEach((speaker, idx) => {
                                    const speakerInfo = getParticipantInfo(speaker.participantId);
                                    let speakerName = '';
                                    let speakerCountry = '';
                                    
                                    if (speakerInfo) {
                                        speakerName = speakerInfo.name_eng || speakerInfo.name_kor || speaker.name;
                                        speakerCountry = speakerInfo.country || '';
                                    } else {
                                        speakerName = speaker.name || '';
                                    }
                                    
                                    const topic = speaker.topic || '';
                                    const time = speaker.startTime && speaker.endTime 
                                        ? ` (${speaker.startTime}-${speaker.endTime})` 
                                        : '';
                                    
                                    if (topic) {
                                        content += `- "${topic}"`;
                                        if (speakerName) {
                                            content += ` - ${speakerName}`;
                                            if (speakerCountry) {
                                                content += ` (${speakerCountry})`;
                                            }
                                        }
                                        content += time + '\n';
                                    } else if (speakerName) {
                                        content += `- ${speakerName}`;
                                        if (speakerCountry) {
                                            content += ` (${speakerCountry})`;
                                        }
                                        content += time + '\n';
                                    }
                                });
                            }
                            
                            return content.trim();
                        }).join('\n\n---\n\n');
                        
                        row.push(cellContent);
                        
                        // 첫 번째 세션의 색상 정보 저장 (여러 세션이 있으면 첫 번째 것 사용)
                        if (matchingSessions.length > 0 && applySessionColors) {
                            const firstSession = matchingSessions[0];
                            const colorId = resolveSessionColorId(firstSession);
                            const cellKey = `${rowIdx + 1}_${colIdx + 1}`; // +1 because row 0 is header
                            cellStyles[cellKey] = { colorId };
                        }
                    } else {
                        row.push('');
                    }
                }
                
                sheetData.push(row);
            }
            
            // 시트 생성
            const ws = XLSX.utils.aoa_to_sheet(sheetData);
            
            // 색상 적용
            if (applySessionColors) {
                Object.keys(cellStyles).forEach(cellKey => {
                    const [rowIdx, colIdx] = cellKey.split('_').map(Number);
                    const styleInfo = cellStyles[cellKey];
                    const cellAddress = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
                    let cell = ws[cellAddress];
                    if (!cell) {
                        cell = { t: 's', v: '', w: '' };
                        ws[cellAddress] = cell;
                    } else if (!cell.t) {
                        cell.t = 's';
                    }
                    cell.s = cell.s || {};
                    const colorEntry = SESSION_COLOR_EXPORT_MAP[styleInfo.colorId] || SESSION_COLOR_EXPORT_MAP[1];
                    if (colorEntry) {
                        cell.s.fill = {
                            patternType: 'solid',
                            fgColor: { rgb: colorEntry.fill },
                            bgColor: { rgb: colorEntry.fill }
                        };
                        cell.s.font = cell.s.font || {};
                        cell.s.font.color = { rgb: colorEntry.font };
                        cell.s.font.bold = true;
                    }
                    cell.s.alignment = Object.assign({ vertical: 'top', horizontal: 'left', wrapText: true }, cell.s.alignment);
                });
            }
            
            applyEnglishSessionHighlight(ws, sheetData);
            
            // 열 너비 설정
            const colWidths = [{ wch: 15 }]; // Time column
            venuesList.forEach(() => {
                colWidths.push({ wch: 50 }); // Venue columns
            });
            ws['!cols'] = colWidths;
            
            // 행 높이 자동 조정 (텍스트 양에 따라)
            const rowHeights = sheetData.map((row, idx) => {
                if (idx === 0) return { hpt: 20 }; // Header
                
                const maxLines = Math.max(...row.slice(1).map(cell => {
                    const lines = String(cell || '').split('\n').length;
                    return Math.min(lines * 15, 200); // 최대 200
                }));
                return { hpt: Math.max(maxLines, 30) };
            });
            ws['!rows'] = rowHeights;
            
            // 시트명 생성 (날짜)
            const sheetName = date === 'No Date' ? 'No Date' : date.replace(/-/g, '.');
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
        }
        
        // 파일명 생성
        const eventId = document.body.getAttribute('data-event-id');
        const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const filename = `event_program_calendar_${eventId}_${today}.xlsx`;
        
        // 파일 다운로드
        XLSX.writeFile(wb, filename, { cellStyles: true });
        
        console.log(`✅ Simple calendar format exported: ${filename}`);
        
        // 모달 닫기
        closeExportSettingsModal();
        
    } catch (error) {
        console.error('❌ Error exporting simple calendar format:', error);
        alert('일반 캘린더 내보내기 중 오류가 발생했습니다: ' + error.message);
    }
}
// 세부화된 캘린더 내보내기 (발표자 시간대별)
function exportProgramCalendarDetailed() {
    try {
        console.log('📅 Exporting detailed calendar format...');
        
        const applySessionColors = document.getElementById('calendarDetailedApplySessionColors')?.checked || false;
        const useFullSessionType = document.getElementById('calendarDetailedUseFullSessionType')?.checked || false;
        const resolveSessionColorId = (sessionObj) => {
            if (!sessionObj) return 1;
            if (sessionObj.color !== undefined && sessionObj.color !== null && sessionObj.color !== '') {
                const parsed = parseInt(sessionObj.color, 10);
                if (!Number.isNaN(parsed) && SESSION_COLOR_EXPORT_MAP[parsed]) {
                    return parsed;
                }
            }
            if (sessionObj.sessionType && sessionTypeColors.has(sessionObj.sessionType)) {
                const mappedColor = sessionTypeColors.get(sessionObj.sessionType);
                if (SESSION_COLOR_EXPORT_MAP[mappedColor]) {
                    return mappedColor;
                }
            }
            if (sessionObj.sessionType) {
                const fallbackColor = getColorForSessionType(sessionObj.sessionType);
                if (SESSION_COLOR_EXPORT_MAP[fallbackColor]) {
                    return fallbackColor;
                }
            }
            return 1;
        };
        
        if (!sessions || sessions.length === 0) {
            alert('내보낼 세션 데이터가 없습니다.');
            return;
        }
        
        // 날짜별로 세션 그룹화 (날짜 정규화하여 같은 날짜는 같은 시트에 포함)
        const sessionsByDate = {};
        sessions.forEach(session => {
            // 날짜를 정규화하여 형식 차이로 인한 분리 방지
            // normalizeDateValue는 파싱 가능하면 정규화된 문자열 반환,
            // 파싱 불가능하면 원본 문자열 반환, null/undefined/빈 문자열이면 '' 반환
            let date;
            if (session.date != null) {
                const normalized = normalizeDateValue(session.date);
                // 정규화된 값이 빈 문자열이면 원본 날짜 보존 (파싱 실패 또는 원본이 null/undefined/빈 문자열인 경우)
                // 정규화된 값이 있으면 사용 (파싱 성공 또는 원본 문자열)
                date = (normalized === '') ? session.date : normalized;
            } else {
                date = 'No Date';
            }
            if (!sessionsByDate[date]) {
                sessionsByDate[date] = [];
            }
            sessionsByDate[date].push(session);
        });
        
        // 워크북 생성
        const wb = XLSX.utils.book_new();
        
        // 각 날짜별로 시트 생성
        const dates = Object.keys(sessionsByDate).sort();
        
        for (const date of dates) {
            const dateSessions = sessionsByDate[date];
            
            // 해당 날짜의 모든 venue 추출
            const venuesSet = new Set();
            dateSessions.forEach(session => {
                if (session.venue) venuesSet.add(session.venue);
            });
            const venuesList = Array.from(venuesSet).sort();
            
            // 헤더 행 생성
            const headerRow = ['세션시간', '발표시간', ...venuesList];
            const sheetData = [headerRow];
            
            // 시간대별로 세션 정보를 저장할 맵
            // key: "sessionTime_speakerTime", value: { sessionTime, speakerTime, venues: {venue1: content, venue2: content} }
            const timeSlotMap = new Map();
            
            // 1단계: 모든 세션의 헤더를 먼저 생성 (발표자 유무와 관계없이)
            dateSessions.forEach(session => {
                const sessionTime = `${session.startTime || ''}-${session.endTime || ''}`;
                
                // 세션 정보 (약어 또는 전체 세션 종류 이름 + 제목)
                let sessionHeader;
                if (useFullSessionType) {
                    // 세션 종류 전체 이름 사용 (예: "Special Interest Group 1")
                    if (session.displaySessionType) {
                        sessionHeader = `[${session.displaySessionType}] ${session.title}`;
                    } else if (session.sessionType) {
                        // displaySessionType이 없으면 sessionType 사용 (번호 없이)
                        sessionHeader = `[${session.sessionType}] ${session.title}`;
                    } else {
                        sessionHeader = session.title;
                    }
                } else if (session.displayAbbreviation) {
                    // 세션 약자 사용 (예: "SIG 1")
                    sessionHeader = `[${session.displayAbbreviation}] ${session.title}`;
                } else {
                    // 약자나 세션 타입이 없으면 제목만
                    sessionHeader = session.title;
                }
                
                // 좌장 정보
                let chairInfo = '';
                if (session.chairs && session.chairs.length > 0) {
                    const chairNames = session.chairs.map(chair => {
                        const participantInfo = getParticipantInfo(chair.id || chair.participantId);
                        if (participantInfo) {
                            const name = participantInfo.name_eng || participantInfo.name_kor || chair.name;
                            const country = participantInfo.country ? ` (${participantInfo.country})` : '';
                            return name + country;
                        }
                        return chair.name || '';
                    }).filter(n => n).join(', ');
                    chairInfo = `Chair - ${chairNames}`;
                } else if (session.chair) {
                    chairInfo = `Chair - ${session.chair}`;
                }
                
            // 헤더 슬롯 키: 세션 시작 시간만 사용
            const headerSlotKey = `header_${session.startTime}`;
                
                if (!timeSlotMap.has(headerSlotKey)) {
                    console.log(`🏷️ Creating header slot: ${headerSlotKey} for session "${session.title}" (${session.startTime})`);
                    timeSlotMap.set(headerSlotKey, {
                        sessionTime: sessionTime,
                        speakerTime: '',
                        sessionStartTime: session.startTime,
                        speakerStartTime: session.startTime,
                        isHeaderRow: true,
                        venues: {},
                        cellStyles: {}
                     });
                 } else {
                     console.log(`🔄 Using existing header slot: ${headerSlotKey} for session "${session.title}"`);
                 }
                 
                 const headerSlot = timeSlotMap.get(headerSlotKey);
                 headerSlot.cellStyles = headerSlot.cellStyles || {};
                 
                // 세션 헤더 내용 (언어 + 세션 제목 + 좌장)
                let headerContent = '';
                if (session.language) {
                    headerContent += `${session.language}\n`;
                }
                headerContent += sessionHeader;
                 if (chairInfo) {
                     headerContent += '\n' + chairInfo;
                 }
                 
                 // venue에 내용 저장 (기존 내용이 있으면 누적)
                 const existingHeaderContent = headerSlot.venues[session.venue] || '';
                 if (existingHeaderContent) {
                     headerSlot.venues[session.venue] = existingHeaderContent + '\n\n' + headerContent;
                 } else {
                     headerSlot.venues[session.venue] = headerContent;
                 }
                
                const colorId = resolveSessionColorId(session);
                headerSlot.cellStyles[session.venue] = {
                    type: 'sessionHeader',
                    colorId
                };
            });
            
            // 2단계: 발표가 있는 세션의 발표만 생성
            // 같은 발표 시작 시간의 세션들을 그룹화 (venue 순서대로 처리)
            const speakerGroups = new Map(); // key: speakerStartTime, value: [sessions...]
            
            dateSessions.forEach(session => {
                if (session.speakers && session.speakers.length > 0) {
                    // 모든 발표자에 대해 발표 행 생성 (1명이어도)
                    session.speakers.forEach((speaker, idx) => {
                        const startTime = speaker.startTime;
                        if (!speakerGroups.has(startTime)) {
                            speakerGroups.set(startTime, []);
                        }
                        speakerGroups.get(startTime).push({ session, speaker, idx });
                    });
                }
            });
            
            // venue 순서대로 발표 슬롯 생성
            speakerGroups.forEach((speakerInfos, startTime) => {
                // venue 순서대로 정렬
                speakerInfos.sort((a, b) => {
                    return venuesList.indexOf(a.session.venue) - venuesList.indexOf(b.session.venue);
                });
                
                // 슬롯 키 생성
                const speakerSlotKey = `speaker_${startTime}`;
                
                // 첫 번째 venue의 발표시간을 기준으로 설정
                const firstSpeaker = speakerInfos[0].speaker;
                const firstSpeakerTime = firstSpeaker.startTime && firstSpeaker.endTime 
                    ? `${firstSpeaker.startTime}-${firstSpeaker.endTime}` 
                    : '';
                
                // 시간 슬롯 생성
                if (!timeSlotMap.has(speakerSlotKey)) {
                    timeSlotMap.set(speakerSlotKey, {
                        sessionTime: '',
                        speakerTime: firstSpeakerTime, // 첫 번째 venue의 시간
                        sessionStartTime: speakerInfos[0].session.startTime,
                        speakerStartTime: startTime,
                        isHeaderRow: false,
                        venues: {},
                        cellStyles: {}
                    });
                }
                
                const speakerSlot = timeSlotMap.get(speakerSlotKey);
                
                // 각 venue별로 내용 생성
                speakerInfos.forEach(({ session, speaker, idx }) => {
                    const speakerTime = speaker.startTime && speaker.endTime 
                        ? `${speaker.startTime}-${speaker.endTime}` 
                        : '';
                    
                    const speakerInfo = getParticipantInfo(speaker.participantId);
                    let speakerName = '';
                    let speakerCountry = '';
                    
                    if (speakerInfo) {
                        speakerName = speakerInfo.name_eng || speakerInfo.name_kor || speaker.name;
                        speakerCountry = speakerInfo.country || '';
                    } else {
                        speakerName = speaker.name || '';
                    }
                    
                    const topic = speaker.topic || '';
                    
                    // 발표 내용 생성 (두 줄 형식)
                    let content = '';
                    
                    // 발표 시간이 발표시간 컬럼(첫 번째 venue 기준)과 다르면 앞에 표시
                    if (speakerTime && speakerTime !== firstSpeakerTime) {
                        content += `(${speakerTime})\n`;
                    }
                    
                    if (topic) {
                        content += `"${topic}"`;
                    }
                    
                    // 발표자 이름 표시
                    if (speakerName) {
                        if (content && !content.endsWith('\n')) content += '\n';
                        content += `Speaker - ${speakerName}`;
                        if (speakerCountry) {
                            content += ` (${speakerCountry})`;
                        }
                    }
                    
                    // venue에 내용 저장 (기존 내용이 있으면 누적)
                    const existingContent = speakerSlot.venues[session.venue] || '';
                    if (existingContent) {
                        speakerSlot.venues[session.venue] = existingContent + '\n\n' + content.trim();
                    } else {
                        speakerSlot.venues[session.venue] = content.trim();
                    }
                });
            });
            
            // 시간을 분으로 변환하는 헬퍼 함수
            const timeToMinutes = (timeStr) => {
                if (!timeStr) return 0;
                const parts = timeStr.split(':');
                if (parts.length !== 2) return 0;
                const hours = parseInt(parts[0], 10) || 0;
                const minutes = parseInt(parts[1], 10) || 0;
                return hours * 60 + minutes;
            };
            
            // Map을 배열로 변환
            const timeSlots = Array.from(timeSlotMap.values());
            
            console.log(`📋 Time slots before sorting (${timeSlots.length}):`, 
                timeSlots.map(s => ({
                    session: s.sessionStartTime,
                    speaker: s.speakerStartTime,
                    isHeader: s.isHeaderRow,
                    time: s.sessionTime || s.speakerTime
                }))
            );
            
            // 시간순으로 정렬 (발표/헤더 시작 시간 -> 헤더 행 우선)
            timeSlots.sort((a, b) => {
                // 1. 발표/헤더 시작 시간 비교 (실제 표시되는 시간 기준)
                const aStartMinutes = timeToMinutes(a.speakerStartTime);
                const bStartMinutes = timeToMinutes(b.speakerStartTime);
                if (aStartMinutes !== bStartMinutes) {
                    return aStartMinutes - bStartMinutes;
                }
                
                // 2. 같은 시작 시간이면 헤더 행은 항상 먼저
                if (a.isHeaderRow && !b.isHeaderRow) return -1;
                if (!a.isHeaderRow && b.isHeaderRow) return 1;
                
                // 3. 세션 시작 시간 비교 (같은 발표 시간이면 빠른 세션 먼저)
                const aSessionMinutes = timeToMinutes(a.sessionStartTime);
                const bSessionMinutes = timeToMinutes(b.sessionStartTime);
                if (aSessionMinutes !== bSessionMinutes) {
                    return aSessionMinutes - bSessionMinutes;
                }
                
                return 0;
            });
            
            // 세션 시간 및 발표 시간 중복 제거
            let lastSessionTime = '';
            let lastSpeakerTime = '';
            
            // 먼저 행 구조 생성 (시간 정보만)
            const rowsWithTimeInfo = [];
            timeSlots.forEach(slot => {
                const row = {
                    sessionTime: slot.sessionTime,
                    speakerTime: slot.speakerTime,
                    sessionStartTime: slot.sessionStartTime,
                    speakerStartTime: slot.speakerStartTime,
                    venues: { ...slot.venues }, // 기존 venue 정보 복사
                    cellStyles: (() => {
                        const stylesCopy = {};
                        if (slot.cellStyles) {
                            Object.keys(slot.cellStyles).forEach(venueKey => {
                                stylesCopy[venueKey] = { ...slot.cellStyles[venueKey] };
                            });
                        }
                        return stylesCopy;
                    })(),
                    isHeaderRow: slot.isHeaderRow
                };
                
                // 세션 시간 중복 제거
                if (slot.sessionTime && slot.sessionTime === lastSessionTime) {
                    row.sessionTime = ''; // 세션 시간 비우기
                } else if (slot.sessionTime) {
                    lastSessionTime = slot.sessionTime;
                    lastSpeakerTime = ''; // 새로운 세션 시작시 발표 시간 리셋
                }
                
                // 발표 시간 중복 제거 (같은 세션 시간대 내에서)
                if (slot.speakerTime && slot.speakerTime === lastSpeakerTime && row.sessionTime === '') {
                    row.speakerTime = ''; // 발표 시간 비우기
                } else if (slot.speakerTime) {
                    lastSpeakerTime = slot.speakerTime;
                }
                
                rowsWithTimeInfo.push(row);
            });
            
            // 병합할 셀 정보를 저장할 배열
            const mergeCells = [];
            
            // 각 venue 컬럼에서 병합 정보 생성
            // 같은 내용이 연속된 행들을 찾아 병합
            venuesList.forEach((venue, venueIdx) => {
                const venueColIndex = venueIdx + 2; // +2 for 세션시간, 발표시간
                
                let mergeStart = -1;
                let mergeContent = '';
                
                for (let r = 0; r < rowsWithTimeInfo.length; r++) {
                    const currentContent = rowsWithTimeInfo[r].venues[venue] || '';
                    
                    if (currentContent !== '') {
                        // 내용이 있는 셀
                        if (mergeStart === -1) {
                            // 병합 시작
                            mergeStart = r;
                            mergeContent = currentContent;
                        } else if (currentContent === mergeContent) {
                            // 같은 내용이 계속됨 → 병합 후보
                            // 다음 셀도 확인
                        } else {
                            // 다른 내용이 나타남 → 이전 병합 완료
                            if (r - 1 > mergeStart) {
                                // 2개 이상의 행이면 병합
                                mergeCells.push({
                                    s: { r: mergeStart + 1, c: venueColIndex }, // +1 for header row
                                    e: { r: r - 1 + 1, c: venueColIndex }
                                });
                                
                                // 중복 내용 제거 (첫 번째만 남김)
                                for (let clearR = mergeStart + 1; clearR < r; clearR++) {
                                    rowsWithTimeInfo[clearR].venues[venue] = '';
                                    if (rowsWithTimeInfo[clearR].cellStyles) {
                                        delete rowsWithTimeInfo[clearR].cellStyles[venue];
                                    }
                                }
                            }
                            
                            // 새로운 병합 시작
                            mergeStart = r;
                            mergeContent = currentContent;
                        }
                    } else {
                        // 빈 셀 → 이전 병합 완료
                        if (mergeStart !== -1 && r - 1 > mergeStart) {
                            mergeCells.push({
                                s: { r: mergeStart + 1, c: venueColIndex },
                                e: { r: r - 1 + 1, c: venueColIndex }
                            });
                            
                            // 중복 내용 제거
                            for (let clearR = mergeStart + 1; clearR < r; clearR++) {
                                rowsWithTimeInfo[clearR].venues[venue] = '';
                                if (rowsWithTimeInfo[clearR].cellStyles) {
                                    delete rowsWithTimeInfo[clearR].cellStyles[venue];
                                }
                            }
                        }
                        mergeStart = -1;
                        mergeContent = '';
                    }
                }
                
                // 마지막 병합 처리
                if (mergeStart !== -1 && rowsWithTimeInfo.length - 1 > mergeStart) {
                    mergeCells.push({
                        s: { r: mergeStart + 1, c: venueColIndex },
                        e: { r: rowsWithTimeInfo.length - 1 + 1, c: venueColIndex }
                    });
                    
                    // 중복 내용 제거
                    for (let clearR = mergeStart + 1; clearR < rowsWithTimeInfo.length; clearR++) {
                        rowsWithTimeInfo[clearR].venues[venue] = '';
                        if (rowsWithTimeInfo[clearR].cellStyles) {
                            delete rowsWithTimeInfo[clearR].cellStyles[venue];
                        }
                    }
                }
            });
            
            
            // 최종 데이터 행 생성
            const sheetStyles = [{}];
            rowsWithTimeInfo.forEach(row => {
                const sheetRow = [row.sessionTime, row.speakerTime];
                const styleRow = {};
                
                // 각 venue 컬럼 추가
                venuesList.forEach(venue => {
                    sheetRow.push(row.venues[venue] || '');
                    if (row.cellStyles && row.cellStyles[venue]) {
                        const colIndex = sheetRow.length - 1;
                        styleRow[colIndex] = row.cellStyles[venue];
                    }
                });
                
                sheetData.push(sheetRow);
                sheetStyles.push(styleRow);
            });
            
            // 시트 생성
            const ws = XLSX.utils.aoa_to_sheet(sheetData);
            
            // 세션시간 컬럼(0번)과 발표시간 컬럼(1번) 병합 처리
            // 같은 값이 연속된 행들을 병합
            const timeColumnMerges = [];
            
            // 세션시간 컬럼 (0번) 병합
            let sessionTimeStart = -1;
            let sessionTimeValue = '';
            
            for (let r = 1; r < sheetData.length; r++) { // 헤더(0) 제외
                const currentValue = sheetData[r][0] || '';
                
                if (currentValue !== '') {
                    // 새로운 세션 시간 시작
                    if (sessionTimeStart !== -1 && r - 1 > sessionTimeStart) {
                        // 이전 범위 병합
                        timeColumnMerges.push({
                            s: { r: sessionTimeStart, c: 0 },
                            e: { r: r - 1, c: 0 }
                        });
                    }
                    sessionTimeStart = r;
                    sessionTimeValue = currentValue;
                } else {
                    // 빈 셀: 이전 세션 시간이 계속됨
                    // 아무것도 하지 않음
                }
            }
            
            // 마지막 범위 처리
            if (sessionTimeStart !== -1 && sheetData.length - 1 > sessionTimeStart) {
                timeColumnMerges.push({
                    s: { r: sessionTimeStart, c: 0 },
                    e: { r: sheetData.length - 1, c: 0 }
                });
            }
            
            // 발표시간 컬럼 (1번)은 병합하지 않음
            // 각 발표마다 시간이 다를 수 있으므로 병합하면 혼란스러움
            
            // 시간 컬럼 병합을 mergeCells에 추가
            mergeCells.push(...timeColumnMerges);
            console.log(`📋 Added ${timeColumnMerges.length} time column merges`);
            
            // 셀 병합 적용 (중복 제거 및 유효성 검증)
            if (mergeCells.length > 0) {
                // 유효한 병합 범위만 필터링
                const validMerges = [];
                const maxRow = sheetData.length - 1;
                const maxCol = venuesList.length + 2 - 1; // columns: 0(세션시간), 1(발표시간), 2~N(venues), -1 for 0-based index
                
                console.log(`🔍 Processing ${mergeCells.length} merge candidates for date ${date}`);
                
                mergeCells.forEach((merge, idx) => {
                    const { s, e } = merge;
                    
                    // 유효성 검증 (시간 컬럼 포함)
                    if (s.r >= 0 && s.r <= maxRow &&
                        e.r >= 0 && e.r <= maxRow &&
                        s.c >= 0 && s.c <= maxCol &&
                        e.c >= 0 && e.c <= maxCol &&
                        s.r <= e.r &&
                        s.c === e.c) { // 같은 열에서만 병합
                        
                        // 중복 검사 (같은 시작 셀인지 확인)
                        const isDuplicate = validMerges.some(m => 
                            m.s.r === s.r && m.s.c === s.c
                        );
                        
                        if (isDuplicate) {
                            console.warn(`⚠️ Duplicate merge at row ${s.r}, col ${s.c}`);
                            return;
                        }
                        
                        // 겹침 검사 (overlapping merges)
                        const isOverlapping = validMerges.some(m => {
                            // 같은 열에서만 겹침 검사
                            if (m.s.c === s.c) {
                                // 두 범위가 겹치는지 확인
                                // A와 B가 겹치려면: A.start <= B.end AND B.start <= A.end
                                const overlaps = s.r <= m.e.r && m.s.r <= e.r;
                                if (overlaps) {
                                    console.warn(`⚠️ Overlapping merge detected: ` +
                                        `[${s.r}:${e.r}, col ${s.c}] overlaps with ` +
                                        `[${m.s.r}:${m.e.r}, col ${m.s.c}]`);
                                }
                                return overlaps;
                            }
                            return false;
                        });
                        
                        if (!isOverlapping) {
                            validMerges.push(merge);
                        }
                    } else {
                        console.warn(`⚠️ Invalid merge range: ${JSON.stringify(merge)} ` +
                            `(maxRow: ${maxRow}, maxCol: ${maxCol})`);
                    }
                });
                
                if (validMerges.length > 0) {
                    // 정렬 (행 순서대로, 같은 행이면 열 순서대로)
                    validMerges.sort((a, b) => {
                        if (a.s.r !== b.s.r) return a.s.r - b.s.r;
                        return a.s.c - b.s.c;
                    });
                    
                    ws['!merges'] = validMerges;
                    console.log(`✅ Applied ${validMerges.length} valid merges for date ${date}`);
                } else {
                    console.warn(`⚠️ No valid merges for date ${date}`);
                }
            }
            
            for (let r = 1; r < sheetStyles.length; r++) {
                const rowStyles = sheetStyles[r];
                if (!rowStyles) continue;
                Object.keys(rowStyles).forEach(colKey => {
                    const styleInfo = rowStyles[colKey];
                    if (!styleInfo || styleInfo.type !== 'sessionHeader') return;
                    const columnIndex = parseInt(colKey, 10);
                    if (Number.isNaN(columnIndex)) return;
                    const cellAddress = XLSX.utils.encode_cell({ r, c: columnIndex });
                    let cell = ws[cellAddress];
                    if (!cell) {
                        cell = { t: 's', v: '', w: '' };
                        ws[cellAddress] = cell;
                    } else if (!cell.t) {
                        cell.t = 's';
                    }
                    cell.s = Object.assign({}, cell.s);
                    const colorEntry = SESSION_COLOR_EXPORT_MAP[styleInfo.colorId] || SESSION_COLOR_EXPORT_MAP[1];
                    if (applySessionColors && colorEntry) {
                        cell.s.fill = {
                            patternType: 'solid',
                            fgColor: { rgb: colorEntry.fill },
                            bgColor: { rgb: colorEntry.fill }
                        };
                    }
                    const fontStyle = Object.assign({}, cell.s.font);
                    fontStyle.bold = true;
                    if (applySessionColors && colorEntry) {
                        fontStyle.color = { rgb: colorEntry.font };
                    }
                    cell.s.font = fontStyle;
                    cell.s.alignment = Object.assign({ vertical: 'top', horizontal: 'left', wrapText: true }, cell.s.alignment);
                });
            }
    
            applyEnglishSessionHighlight(ws, sheetData);
            
            // 열 너비 설정
            const colWidths = [
                { wch: 15 }, // 세션시간
                { wch: 15 }, // 발표시간
                ...venuesList.map(() => ({ wch: 60 })) // Venue columns
            ];
            ws['!cols'] = colWidths;
            
            // 행 높이 자동 조정
            const rowHeights = sheetData.map((row, idx) => {
                if (idx === 0) return { hpt: 20 }; // Header
                
                const maxLines = Math.max(...row.slice(2).map(cell => {
                    const lines = String(cell || '').split('\n').length;
                    return Math.min(lines * 15, 300); // 최대 300
                }));
                return { hpt: Math.max(maxLines, 30) };
            });
            ws['!rows'] = rowHeights;
            
            // 시트명 생성 (날짜)
            const sheetName = date === 'No Date' ? 'No Date' : date.replace(/-/g, '.');
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
        }
        
        // 파일명 생성
        const eventId = document.body.getAttribute('data-event-id');
        const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const filename = `event_program_calendar_detailed_${eventId}_${today}.xlsx`;
        
        // 파일 다운로드
        XLSX.writeFile(wb, filename, { cellStyles: true });
        
        console.log(`✅ Detailed calendar format exported: ${filename}`);
        
        // 모달 닫기
        closeExportSettingsModal();
        
    } catch (error) {
        console.error('❌ Error exporting detailed calendar format:', error);
        alert('세부화된 캘린더 내보내기 중 오류가 발생했습니다: ' + error.message);
    }
}

// ===== 강의 장소 관리 함수들 =====

// 강의 장소 로드
function loadVenues() {
    const eventId = document.body.getAttribute('data-event-id');
    
    fetch(`/api/event_program/${eventId}/venues`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                venues = data.venues || [];
                renderVenues();
                updateVenueSelects();
                // Venue가 로드된 후 세션 다시 렌더링
                renderSessions();
            } else {
                console.log('No venues found, starting with empty list');
                venues = [];
                renderVenues();
                updateVenueSelects();
                // Venue가 로드된 후 세션 다시 렌더링 (빈 venue라도)
                renderSessions();
            }
        })
        .catch(error => {
            console.error('Error loading venues:', error);
            venues = [];
            renderVenues();
            updateVenueSelects();
            // 에러가 발생해도 세션 렌더링 시도
            renderSessions();
        });
}

// 참가자 목록 로드
let participants = [];

function loadParticipants() {
    const eventId = document.body.getAttribute('data-event-id');
    
    fetch(`/api/event_program/${eventId}/participants`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                participants = data.participants || [];
            } else {
                console.log('No participants found, starting with empty list');
                participants = [];
            }
        })
        .catch(error => {
            console.error('Error loading participants:', error);
            participants = [];
        });
}

// 참가자 검색 관련 변수
let currentSearchType = '';
let selectedParticipant = null;

// 참가자 검색 모달 열기
function openParticipantSearch(type) {
    currentSearchType = type;
    const modal = document.getElementById('participantSearchModal');
    const title = document.getElementById('participantSearchTitle');
    
    // 제목 설정
    if (type === 'chair') {
        title.textContent = '좌장 선택';
    } else if (type === 'quickChair') {
        title.textContent = '좌장 선택';
    } else if (type.startsWith('speaker')) {
        title.textContent = '발표자 선택';
    }
    
    // 검색 입력 초기화
    const searchInput = document.getElementById('participantSearchInput');
    searchInput.value = '';
    searchInput.focus();
    
    // 검색 결과 초기화
    displayParticipantSearchResults(participants);
    
    modal.style.display = 'block';
}

// 참가자 검색 모달 닫기
function closeParticipantSearchModal() {
    const modal = document.getElementById('participantSearchModal');
    modal.style.display = 'none';
    currentSearchType = '';
    selectedParticipant = null;
}

// 참가자 검색 실행
function searchParticipants(query) {
    if (!query || query.trim() === '') {
        displayParticipantSearchResults(participants);
        return;
    }
    
    const searchTerm = query.toLowerCase().trim();
    const filteredParticipants = participants.filter(participant => {
        const name = (participant.name || '').toLowerCase();
        const nameKor = (participant.name_kor || '').toLowerCase();
        const nameEng = (participant.name_eng || '').toLowerCase();
        const firstName = (participant.first_name || '').toLowerCase();
        const familyName = (participant.family_name || '').toLowerCase();
        const affiliationKor = (participant.affiliation_kor || '').toLowerCase();
        const affiliationEng = (participant.affiliation_eng || '').toLowerCase();
        const email = (participant.email || '').toLowerCase();
        const role = (participant.role || '').toLowerCase();
        
        return name.includes(searchTerm) ||
               nameKor.includes(searchTerm) ||
               nameEng.includes(searchTerm) ||
               firstName.includes(searchTerm) ||
               familyName.includes(searchTerm) ||
               affiliationKor.includes(searchTerm) ||
               affiliationEng.includes(searchTerm) ||
               email.includes(searchTerm) ||
               role.includes(searchTerm);
    });
    
    displayParticipantSearchResults(filteredParticipants);
}

// 참가자 검색 결과 표시
function displayParticipantSearchResults(participantsList) {
    const resultsContainer = document.getElementById('participantSearchResults');
    const noResults = document.getElementById('noResults');
    
    if (participantsList.length === 0) {
        resultsContainer.innerHTML = '';
        noResults.style.display = 'block';
        return;
    }
    
    noResults.style.display = 'none';
    
    resultsContainer.innerHTML = participantsList.map(participant => {
        const affiliation = participant.affiliation_kor || participant.affiliation_eng || '소속 없음';
        const role = participant.role || '참가자';
        
        return `
            <div class="participant-item" onclick="selectParticipant(${participant.id})" data-participant-id="${participant.id}">
                <div class="participant-main-info">
                    <div class="participant-name">${participant.name}</div>
                    <div class="participant-details">
                        ${affiliation}<br>
                        ${participant.email || '이메일 없음'}
                    </div>
                </div>
                <div class="participant-role">${role}</div>
            </div>
        `;
    }).join('');
}

// 참가자 선택
function selectParticipant(participantId) {
    const participant = participants.find(p => p.id == participantId);
    if (!participant) return;
    
    selectedParticipant = participant;
    
    // 선택된 항목 하이라이트
    document.querySelectorAll('.participant-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    const selectedItem = document.querySelector(`[data-participant-id="${participantId}"]`);
    if (selectedItem) {
        selectedItem.classList.add('selected');
    }
    
    // 확인 버튼 표시
    showConfirmButton();
}
// 확인 버튼 표시
function showConfirmButton() {
    const modalFooter = document.querySelector('#participantSearchModal .modal-footer');
    const existingConfirmBtn = modalFooter.querySelector('.confirm-btn');
    
    if (!existingConfirmBtn && selectedParticipant) {
        const confirmBtn = document.createElement('button');
        confirmBtn.type = 'button';
        confirmBtn.className = 'btn btn-primary confirm-btn';
        confirmBtn.innerHTML = '<i class="fas fa-check"></i> 선택';
        confirmBtn.onclick = confirmParticipantSelection;
        
        modalFooter.insertBefore(confirmBtn, modalFooter.firstChild);
    }
}
// 참가자 선택 확인
function confirmParticipantSelection() {
    if (!selectedParticipant || !currentSearchType) return;
    
    const affiliation = selectedParticipant.affiliation_kor || selectedParticipant.affiliation_eng || '소속 없음';
    
    if (currentSearchType.startsWith('chair_')) {
        // 좌장 선택 (여러 좌장 지원)
        const chairId = currentSearchType.split('_')[1];
        const hiddenInput = document.querySelector(`input[name="chair_participant_${chairId}"]`);
        const displayDiv = document.getElementById(`selectedChair${chairId}`);
        
        if (hiddenInput && displayDiv) {
            hiddenInput.value = selectedParticipant.id;
            
            displayDiv.innerHTML = `
            <div class="participant-info">
                <div class="participant-name">${selectedParticipant.name}</div>
                <div class="participant-details">${affiliation}</div>
            </div>
        `;
            console.log(`✅ Chair ${chairId} selected:`, selectedParticipant.name);
        }
    } else if (currentSearchType === 'quickChair') {
        // 빠른 세션 좌장
        document.getElementById('quickSessionChair').value = selectedParticipant.id;
        document.getElementById('selectedQuickChair').innerHTML = `
            <div class="participant-info">
                <div class="participant-name">${selectedParticipant.name}</div>
                <div class="participant-details">${affiliation}</div>
            </div>
        `;
    } else if (currentSearchType.startsWith('speaker')) {
        // 발표자 선택
        const speakerId = currentSearchType.split('_')[1];
        const hiddenInput = document.querySelector(`input[name="speaker_participant_${speakerId}"]`);
        const displayDiv = document.getElementById(`selectedSpeaker${speakerId}`);
        
        if (hiddenInput && displayDiv) {
            hiddenInput.value = selectedParticipant.id;
            const affiliation = selectedParticipant.affiliation_kor || selectedParticipant.affiliation_eng || '소속 없음';
            
            displayDiv.innerHTML = `
                <div class="participant-info">
                    <div class="participant-name">${selectedParticipant.name}</div>
                    <div class="participant-details">${affiliation}</div>
                </div>
            `;
        }
    }
    
    closeParticipantSearchModal();
}
// 참가자 옵션 HTML 생성
function generateParticipantOptions(selectedId = null) {
    return participants.map(participant => {
        const selected = selectedId && selectedId == participant.id ? 'selected' : '';
        return `<option value="${participant.id}" ${selected}>${participant.name} (${participant.affiliation_kor || participant.affiliation_eng || '소속 없음'})</option>`;
    }).join('');
}
// 강의 장소 저장
function saveVenues() {
    const eventId = document.body.getAttribute('data-event-id');
    
    fetch(`/api/event_program/${eventId}/venues`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            venues: venues
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('Venues saved successfully');
        } else {
            alert('강의 장소 저장에 실패했습니다.');
        }
    })
    .catch(error => {
        console.error('Error saving venues:', error);
        alert('강의 장소 저장 중 오류가 발생했습니다.');
    });
}

// 강의 장소 렌더링
function renderVenues() {
    const venueList = document.getElementById('venueList');
    venueList.innerHTML = '';
    
    venues.forEach((venue, index) => {
        const venueItem = document.createElement('div');
        venueItem.className = 'venue-item';
        venueItem.innerHTML = `
            <span class="venue-name">${venue.name}</span>
            <div class="venue-actions">
                <button class="venue-action-btn" onclick="editVenue(${index})" title="편집">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="venue-action-btn" onclick="deleteVenue(${index})" title="삭제">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        venueList.appendChild(venueItem);
    });
    
    renderVenueColumns();
}

// 강의 장소 컬럼 렌더링
function renderVenueColumns() {
    const venuesColumns = document.getElementById('venuesColumns');
    const scrollVenuesArea = document.getElementById('scrollVenuesArea');
    
    venuesColumns.innerHTML = '';
    scrollVenuesArea.innerHTML = '';
    
    venues.forEach((venue, index) => {
        // 헤더 컬럼 생성
        const venueColumn = document.createElement('div');
        venueColumn.className = 'venue-column';
        venueColumn.innerHTML = `
            <div class="venue-header">${venue.name}</div>
        `;
        venuesColumns.appendChild(venueColumn);
        
        // 세션 영역 생성
        const venueSessionsArea = document.createElement('div');
        venueSessionsArea.className = 'venue-sessions-area';
        venueSessionsArea.id = `venueSessionsArea_${index}`;
        scrollVenuesArea.appendChild(venueSessionsArea);
    });
    
    // 세션들을 각 장소별로 렌더링 (renderSessions에서 호출되므로 여기서는 호출하지 않음)
    // renderSessionsByVenue();
}

function ensureUnassignedVenueElements() {
    const venuesColumns = document.getElementById('venuesColumns');
    const scrollVenuesArea = document.getElementById('scrollVenuesArea');

    if (!venuesColumns || !scrollVenuesArea) {
        return null;
    }

    let placeholderColumn = document.getElementById(UNASSIGNED_VENUE_COLUMN_ID);
    if (!placeholderColumn) {
        placeholderColumn = document.createElement('div');
        placeholderColumn.id = UNASSIGNED_VENUE_COLUMN_ID;
        placeholderColumn.className = 'venue-column placeholder-venue-column';
        placeholderColumn.innerHTML = `
            <div class="venue-header">${UNASSIGNED_VENUE_LABEL}</div>
        `;
        venuesColumns.appendChild(placeholderColumn);
    } else {
        const headerEl = placeholderColumn.querySelector('.venue-header');
        if (headerEl) {
            headerEl.textContent = UNASSIGNED_VENUE_LABEL;
        }
    }

    let placeholderArea = document.getElementById(UNASSIGNED_VENUE_AREA_ID);
    if (!placeholderArea) {
        placeholderArea = document.createElement('div');
        placeholderArea.id = UNASSIGNED_VENUE_AREA_ID;
        placeholderArea.className = 'venue-sessions-area placeholder-venue-area';
        scrollVenuesArea.appendChild(placeholderArea);
    }

    return placeholderArea;
}

function removeUnassignedVenueElements() {
    const placeholderColumn = document.getElementById(UNASSIGNED_VENUE_COLUMN_ID);
    if (placeholderColumn && placeholderColumn.parentNode) {
        placeholderColumn.parentNode.removeChild(placeholderColumn);
    }

    const placeholderArea = document.getElementById(UNASSIGNED_VENUE_AREA_ID);
    if (placeholderArea && placeholderArea.parentNode) {
        placeholderArea.parentNode.removeChild(placeholderArea);
    }
}

function renderSessionsForArea(venueSessions, areaElement, options = {}) {
    if (!areaElement) {
        return;
    }

    const emptyStateTitle = options.emptyTitle || '아직 세션이 없습니다';
    const emptyStateMessage = options.emptyMessage || '시간대를 클릭하여 세션을 추가하세요!';

    if (!venueSessions || venueSessions.length === 0) {
        areaElement.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-alt"></i>
                <h3>${emptyStateTitle}</h3>
                <p>${emptyStateMessage}</p>
            </div>
        `;
        return;
    }

    const sortedSessions = [...venueSessions].sort((a, b) => {
        const startA = a.startTime || '00:00';
        const startB = b.startTime || '00:00';
        return new Date(`2000-01-01 ${startA}`) - new Date(`2000-01-01 ${startB}`);
    });

    const sessionsWithLayers = calculateSessionLayers(sortedSessions);
    const sessionHTML = sessionsWithLayers.map((sessionData, sessionIndex) =>
        buildSessionBlockHTML(sessionData, sessionIndex, options)
    ).join('');

    areaElement.innerHTML = sessionHTML;

    if (!options.skipDebugLog) {
        setTimeout(() => {
            const sessionBlocks = areaElement.querySelectorAll('.session-block');
            console.log(`🔍 After rendering: Found ${sessionBlocks.length} session blocks in area ${areaElement.id}`);
            sessionBlocks.forEach((block, blockIndex) => {
                const computedStyle = window.getComputedStyle(block);
                console.log(`  Block ${blockIndex}:`, {
                    display: computedStyle.display,
                    visibility: computedStyle.visibility,
                    opacity: computedStyle.opacity,
                    position: computedStyle.position,
                    top: computedStyle.top,
                    height: computedStyle.height,
                    zIndex: computedStyle.zIndex
                });
            });
        }, 100);
    }
}

function buildSessionBlockHTML(sessionData, sessionIndex, options = {}) {
    const { session, layer, offsetX } = sessionData;
    const startY = calculateYFromTime(session.startTime);
    const endY = calculateYFromTime(session.endTime);
    const height = endY - startY;
    
    let colorId = session.color;
    if (!colorId) {
        if (session.sessionType) {
            colorId = getColorForSessionType(session.sessionType);
        } else {
            colorId = getNextRandomColorId(true);
            standaloneSessionColors.add(colorId);
            markColorAsUsed(colorId);
        }
        session.color = colorId;
    }
    const colorClass = `color-${colorId}`;
    const dataVenueIndex = options.dataVenueIndex !== undefined ? options.dataVenueIndex : options.venueIndex;
    const sessionGlobalIndex = sessions.indexOf(session);
    const languageMarkup = session.language ? `<div class="session-language">${session.language}</div>` : '';
    const chairDisplayText = getSessionChairDisplayText(session, displaySettings.chairNameLanguage);

    // 발표자 정보를 툴팁용으로 생성
    const groupedSpeakers = [];
    if (session.speakers && session.speakers.length > 0) {
        const speakerGroups = new Map();

        session.speakers.forEach(speaker => {
            const key = `${speaker.topic}_${speaker.startTime}_${speaker.endTime}`;
            if (!speakerGroups.has(key)) {
                speakerGroups.set(key, {
                    topic: speaker.topic,
                    startTime: speaker.startTime,
                    endTime: speaker.endTime,
                    speakers: []
                });
            }
            speakerGroups.get(key).speakers.push(speaker);
        });

        groupedSpeakers.push(...speakerGroups.values());
    }

    const tooltipHeader = `
        ${session.language ? `<div class="tooltip-session-language">${session.language}</div>` : ''}
        ${session.displayAbbreviation && session.displaySessionType
            ? `<div class="tooltip-session-type">${session.displayAbbreviation} [${session.displaySessionType}]</div>`
            : (session.displaySessionType
                ? `<div class="tooltip-session-type">[${session.displaySessionType}]</div>`
                : (session.sessionType ? `<div class="tooltip-session-type">[${session.sessionType}]</div>` : ''))}
        <div class="tooltip-session-title">${session.title}</div>
        ${chairDisplayText ? `<div class="tooltip-session-chair">좌장: ${chairDisplayText}</div>` : ''}
        <div class="tooltip-session-time">${formatTimeRange12Hour(session.startTime, session.endTime)}</div>
        ${options.showVenueName ? `<div class="tooltip-session-venue">장소: ${session.venue || '미지정'}</div>` : ''}
    `;

    const speakersTooltip = groupedSpeakers.length > 0
        ? `
            <div class="tooltip-header">
                ${tooltipHeader}
            </div>
            <div class="tooltip-speakers">
                ${groupedSpeakers.map(group => `
                    <div class="tooltip-speaker-group">
                        ${group.topic ? `<div class="tooltip-speaker-topic" style="font-weight: 600; margin-bottom: 4px;">${group.topic}</div>` : ''}
                        <div class="tooltip-speaker-time" style="color: #888; font-size: 12px; margin-bottom: 4px;">${group.startTime} - ${group.endTime}</div>
                        ${group.speakers.map(speaker => {
                            const speakerDisplayName = getSpeakerDisplayName(speaker, displaySettings.speakerNameLanguage);
                            if (speakerDisplayName) {
                                return `<div class="tooltip-speaker-name" style="padding-left: 8px; margin-bottom: 2px;">• ${speakerDisplayName}</div>`;
                            }
                            if (speaker.topic) {
                                return `<div class="tooltip-speaker-topic" style="padding-left: 8px; margin-bottom: 2px; color: #aaa;">${speaker.topic}</div>`;
                            }
                            return '';
                        }).join('')}
                    </div>
                `).join('<div style="height: 8px;"></div>')}
            </div>
        `
        : `
            <div class="tooltip-header">
                ${tooltipHeader}
            </div>
            <div class="tooltip-no-speakers">발표자가 없습니다</div>
        `;

    let sessionSpeakersMarkup = '';
    if (displaySettings.showSpeakers && session.speakers && session.speakers.length > 0) {
        const speakerItems = session.speakers.map(speaker => {
            const speakerDisplayName = getSpeakerDisplayName(speaker, displaySettings.speakerNameLanguage);
            return `
                <div class="session-speaker-item">
                    ${displaySettings.showSpeakerName && speakerDisplayName ? `<div class="session-speaker-name">${speakerDisplayName}</div>` : ''}
                    ${displaySettings.showSpeakerTopic && speaker.topic ? `<div class="session-speaker-topic">${speaker.topic}</div>` : ''}
                    ${displaySettings.showSpeakerTime ? `<div class="session-speaker-time">${speaker.startTime} - ${speaker.endTime}</div>` : ''}
                </div>
            `;
        }).join('');
        sessionSpeakersMarkup = `<div class="session-speakers">${speakerItems}</div>`;
    }

    const venueInfoMarkup = options.showVenueName
        ? `<div class="session-venue-info">${session.venue || '장소 미지정'}</div>`
        : '';

    return `
        <div class="session-block ${colorClass}"
             data-session-index="${sessionGlobalIndex}"
             data-venue-index="${dataVenueIndex}"
             ${options.isPlaceholder ? 'data-placeholder-venue="true"' : ''}
             style="top: ${startY}px; height: ${height}px; left: ${offsetX}px; z-index: ${layer + 1};"
             data-tooltip-content="${encodeURIComponent(speakersTooltip)}">
            <div class="session-content">
                ${languageMarkup}
                ${venueInfoMarkup}
                ${displaySettings.showSessionType
                    ? (session.displayAbbreviation && session.displaySessionType
                        ? `<div class="session-type">${session.displayAbbreviation} [${session.displaySessionType}]</div>`
                        : (session.displaySessionType
                            ? `<div class="session-type">[${session.displaySessionType}]</div>`
                            : (session.sessionType ? `<div class="session-type">[${session.sessionType}]</div>` : '')))
                    : ''}
                ${displaySettings.showSessionTitle ? `<div class="session-title">${session.title || '제목 없음'}</div>` : ''}
                ${displaySettings.showSessionChair && chairDisplayText ? `<div class="session-chair">${chairDisplayText}</div>` : ''}
                ${displaySettings.showSessionTime ? `<div class="session-time">${formatTimeRange12Hour(session.startTime, session.endTime)}</div>` : ''}
                ${sessionSpeakersMarkup}
            </div>
            <div class="resize-handle bottom" data-resize="bottom"></div>
            <div class="session-actions">
                <button class="session-action-btn" data-session-index="${sessionGlobalIndex}" title="편집">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="session-action-btn" data-session-index="${sessionGlobalIndex}" title="색상 변경">
                    <i class="fas fa-palette"></i>
                </button>
                <button class="session-action-btn" data-session-index="${sessionGlobalIndex}" title="삭제">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
}

// 세션 충돌 감지 및 레이어링 계산
function calculateSessionLayers(sessions) {
    console.log('🔍 Calculating session layers for', sessions.length, 'sessions');
    
    if (sessions.length === 0) return [];
    
    const sessionsWithLayers = [];
    const timeSlots = new Map(); // 시간대별 레이어 추적
    
    sessions.forEach((session, index) => {
        const startMinutes = timeToMinutes(session.startTime);
        const endMinutes = timeToMinutes(session.endTime);
        
        console.log(`📅 Session "${session.title}": ${session.startTime} - ${session.endTime} (${startMinutes} - ${endMinutes} minutes)`);
        
        let assignedLayer = 0;
        let foundCollision = true;
        
        // 충돌이 없는 레이어를 찾을 때까지 반복
        while (foundCollision) {
            foundCollision = false;
            
            // 현재 레이어에서 시간 겹침 확인 (5분 단위로 체크)
            for (let minute = startMinutes; minute < endMinutes; minute += 5) {
                if (timeSlots.has(minute)) {
                    const layersAtThisTime = timeSlots.get(minute);
                    if (layersAtThisTime.has(assignedLayer)) {
                        foundCollision = true;
                        break;
                    }
                }
            }
            
            if (foundCollision) {
                assignedLayer++;
                console.log(`⚠️ Collision detected for "${session.title}", trying layer ${assignedLayer}`);
            }
        }
        
        // 선택된 레이어에 시간대 등록 (5분 단위)
        for (let minute = startMinutes; minute < endMinutes; minute += 5) {
            if (!timeSlots.has(minute)) {
                timeSlots.set(minute, new Set());
            }
            timeSlots.get(minute).add(assignedLayer);
        }
        
        // 레이어에 따른 X 오프셋 계산 (레이어당 5px씩 오른쪽으로 이동)
        const offsetX = assignedLayer * 5;
        
        sessionsWithLayers.push({
            session: session,
            layer: assignedLayer,
            offsetX: offsetX
        });
        
        console.log(`✅ Session "${session.title}" assigned to layer ${assignedLayer} with offset ${offsetX}px`);
    });
    
    return sessionsWithLayers;
}

// 장소별 세션 렌더링
function renderSessionsByVenue() {
    console.log('=== RENDER SESSIONS BY VENUE ===');
    console.log('Venues:', venues);
    console.log('Sessions:', sessions);

    const selectedDateNormalized = normalizeDateValue(currentSelectedDate);
    const shouldFilterByDate = !!selectedDateNormalized;

    const registeredVenueNames = new Set(venues.map(venue => (venue.name || '').trim()));
    
    venues.forEach((venue, venueIndex) => {
        console.log(`\n📍 Processing venue ${venueIndex}: "${venue.name}"`);
        const venueSessionsArea = document.getElementById(`venueSessionsArea_${venueIndex}`);
        if (!venueSessionsArea) {
            console.error(`❌ Venue sessions area not found for venue ${venueIndex}`);
            return;
        }
        console.log(`✅ Found venue sessions area for venue ${venueIndex}`);
        
        const venueSessions = sessions.filter(session => {
            const sessionVenue = (session.venue || '').trim();
            const targetVenue = (venue.name || '').trim();
            if (sessionVenue !== targetVenue) {
                return false;
            }

            if (!shouldFilterByDate) {
                return true;
            }

            const sessionDateNormalized = normalizeDateValue(session.date);
            if (!sessionDateNormalized) {
                console.warn(`⚠️ Session "${session.title}" has no valid date. It will be hidden when filtering by date.`);
                return false;
            }

            const dateMatch = datesMatchForFilter(sessionDateNormalized, selectedDateNormalized);

            console.log(`  Checking session "${session.title}" - Venue: "${sessionVenue}" === "${targetVenue}": ${sessionVenue === targetVenue}, Date: "${session.date || 'NO DATE'}" (${sessionDateNormalized}) matches "${selectedDateNormalized}": ${dateMatch}`);
            return dateMatch;
        });

        console.log(`✅ Venue "${venue.name}" has ${venueSessions.length} sessions on ${currentSelectedDate}:`, venueSessions);

        renderSessionsForArea(venueSessions, venueSessionsArea, {
            venueIndex,
            dataVenueIndex: venueIndex
        });
    });

    const unmatchedSessions = sessions.filter(session => {
                    const sessionVenue = (session.venue || '').trim();
        if (registeredVenueNames.has(sessionVenue)) {
            return false;
        }

        if (!shouldFilterByDate) {
            return true;
        }

        const sessionDateNormalized = normalizeDateValue(session.date);
        if (!sessionDateNormalized) {
            return false;
        }

        return datesMatchForFilter(sessionDateNormalized, selectedDateNormalized);
    });

    if (unmatchedSessions.length > 0) {
        console.warn('⚠️ Found sessions whose venues are not registered:', unmatchedSessions.map(s => ({ title: s.title, venue: s.venue, date: s.date })));
        const placeholderArea = ensureUnassignedVenueElements();
        if (placeholderArea) {
            renderSessionsForArea(unmatchedSessions, placeholderArea, {
                dataVenueIndex: 'unassigned',
                isPlaceholder: true,
                showVenueName: true,
                emptyTitle: '등록되지 않은 장소입니다',
                emptyMessage: '장소 관리에서 장소를 추가하면 이 영역의 세션을 이동할 수 있습니다.',
                skipDebugLog: true
            });
        }
    } else {
        removeUnassignedVenueElements();
    }

    addSessionEventListeners();
    
    if (isSelecting) {
        document.querySelectorAll('.session-block').forEach(block => {
            block.classList.add('selecting');
            const sessionIndex = parseInt(block.dataset.sessionIndex);
            if (selectedSessions.has(sessionIndex)) {
                block.classList.add('selected');
            }
        });
    }
}

// 강의 장소 추가 모달 열기
function addVenue() {
    if (venues.length >= MAX_VENUE_COLUMNS) {
        alert(`최대 ${MAX_VENUE_COLUMNS}개의 강의 장소만 추가할 수 있습니다.`);
        return;
    }
    
    currentVenueIndex = -1;
    document.getElementById('venueModalTitle').textContent = '강의 장소 추가';
    document.getElementById('venueForm').reset();
    document.getElementById('venueModal').style.display = 'block';
}

// 강의 장소 편집 모달 열기
function editVenue(index) {
    currentVenueIndex = index;
    const venue = venues[index];
    
    document.getElementById('venueModalTitle').textContent = '강의 장소 편집';
    document.getElementById('venueName').value = venue.name;
    document.getElementById('venueDescription').value = venue.description || '';
    document.getElementById('venueModal').style.display = 'block';
}

// 강의 장소 저장
function saveVenue() {
    const form = document.getElementById('venueForm');
    const formData = new FormData(form);
    
    const name = formData.get('venueName')?.trim();
    const description = formData.get('venueDescription')?.trim();
    
    if (!name || name.length === 0) {
        alert('장소명을 입력해주세요.');
        return;
    }
    
    // 중복 이름 체크
    const existingVenue = venues.find((venue, index) => 
        venue.name === name && index !== currentVenueIndex
    );
    
    if (existingVenue) {
        alert('이미 존재하는 장소명입니다.');
        return;
    }
    
    const venueData = {
        name: name,
        description: description
    };
    
    if (currentVenueIndex === -1) {
        // Add new venue
        venues.push(venueData);
    } else {
        // Update existing venue
        venues[currentVenueIndex] = venueData;
    }
    
    closeVenueModal();
    renderVenues();
    saveVenues();
    updateVenueSelects();
    
    // 장소 변경 후 세션 블록들 다시 렌더링
    renderSessions();
}

// 강의 장소 삭제
function deleteVenue(index) {
    const venue = venues[index];
    
    // 해당 장소에 세션이 있는지 확인
    const venueSessions = sessions.filter(session => session.venue === venue.name);
    
    if (venueSessions.length > 0) {
        alert(`'${venue.name}' 장소에 ${venueSessions.length}개의 세션이 있습니다. 먼저 세션을 삭제하거나 다른 장소로 이동해주세요.`);
        return;
    }
    
    if (confirm(`'${venue.name}' 장소를 삭제하시겠습니까?`)) {
        venues.splice(index, 1);
        renderVenues();
        saveVenues();
        updateVenueSelects();
        
        // 장소 삭제 후 세션 블록들 다시 렌더링
        renderSessions();
    }
}

// 강의 장소 모달 닫기
function closeVenueModal() {
    document.getElementById('venueModal').style.display = 'none';
}

// 강의 장소 선택 옵션 업데이트
function updateVenueSelects() {
    const sessionVenueSelect = document.getElementById('sessionVenue');
    const quickSessionVenueSelect = document.getElementById('quickSessionVenue');
    
    // 기존 옵션 제거 (첫 번째 옵션 제외)
    sessionVenueSelect.innerHTML = '<option value="">장소를 선택하세요</option>';
    quickSessionVenueSelect.innerHTML = '<option value="">장소를 선택하세요</option>';
    
    // 새로운 옵션 추가
    venues.forEach(venue => {
        const sessionOption = document.createElement('option');
        sessionOption.value = venue.name;
        sessionOption.textContent = venue.name;
        sessionVenueSelect.appendChild(sessionOption);
        
        const quickOption = document.createElement('option');
        quickOption.value = venue.name;
        quickOption.textContent = venue.name;
        quickSessionVenueSelect.appendChild(quickOption);
    });
}

// ============================================================
// 프로그램 시간 설정 관련 함수들
// ============================================================

/**
 * 시간 설정 모달 열기
 */
function openTimeSettingsModal() {
    const modal = document.getElementById('timeSettingsModal');
    const startInput = document.getElementById('programStartTime');
    const endInput = document.getElementById('programEndTime');
    
    // 현재 프로그램 시간 설정
    startInput.value = programStartTime;
    endInput.value = programEndTime;
    
    modal.style.display = 'block';
    
    console.log('⏰ Opening time settings modal', {
        programStartTime,
        programEndTime
    });
}

/**
 * 시간 설정 모달 닫기
 */
function closeTimeSettingsModal() {
    const modal = document.getElementById('timeSettingsModal');
    modal.style.display = 'none';
}

/**
 * 시간 설정 저장
 */
function saveTimeSettings(event) {
    event.preventDefault();
    
    const startInput = document.getElementById('programStartTime');
    const endInput = document.getElementById('programEndTime');
    
    const newStartTime = startInput.value;
    const newEndTime = endInput.value;
    
    // 유효성 검사
    if (!newStartTime || !newEndTime) {
        alert('시작 시간과 종료 시간을 모두 입력해주세요.');
        return;
    }
    
    // 시작 시간이 종료 시간보다 늦지 않은지 확인
    const startMinutes = timeToMinutes(newStartTime);
    const endMinutes = timeToMinutes(newEndTime);
    
    if (startMinutes >= endMinutes) {
        alert('시작 시간은 종료 시간보다 빨라야 합니다.');
        return;
    }
    
    // 최소 2시간 이상인지 확인
    if (endMinutes - startMinutes < 120) {
        alert('프로그램 시간은 최소 2시간 이상이어야 합니다.');
        return;
    }
    
    console.log('⏰ Saving time settings:', {
        old: { start: programStartTime, end: programEndTime },
        new: { start: newStartTime, end: newEndTime }
    });
    
    // 시간 업데이트
    programStartTime = newStartTime;
    programEndTime = newEndTime;
    
    // 시간 범위 표시 업데이트
    updateTimeRangeDisplay();
    
    // 캘린더 다시 렌더링
    renderTimeGrid();
    renderSessions();
    
    // 프로그램 저장
    saveProgram();
    
    // 모달 닫기
    closeTimeSettingsModal();
    
    alert(`프로그램 시간이 ${programStartTime} - ${programEndTime}로 변경되었습니다.`);
}

/**
 * 시간 범위 표시 업데이트
 */
function updateTimeRangeDisplay() {
    const timeRangeSpan = document.getElementById('currentTimeRange');
    if (timeRangeSpan) {
        timeRangeSpan.textContent = `${programStartTime} - ${programEndTime}`;
    }
}

/**
 * 시간을 분으로 변환 (예: "08:30" -> 510)
 */
function timeToMinutes(timeString) {
    if (!timeString || typeof timeString !== 'string') {
        console.warn(`⚠️ Invalid timeString: ${timeString}`);
        return 0;
    }
    
    // 이상한 문자 제거 (예: "16:10~16" -> "16:10")
    const cleaned = timeString.replace(/[^0-9:]/g, '');
    
    // ":"로 분리
    const parts = cleaned.split(':');
    if (parts.length < 2) {
        console.warn(`⚠️ Invalid time format: ${timeString} (cleaned: ${cleaned})`);
        return 0;
    }
    
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    
    if (isNaN(hours) || isNaN(minutes)) {
        console.warn(`⚠️ Invalid time numbers: ${timeString} (hours: ${hours}, minutes: ${minutes})`);
        return 0;
    }
    
    return hours * 60 + minutes;
}

/**
 * 분을 시간 문자열로 변환 (예: 510 -> "08:30")
 */
function minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * 세션 종류 드롭다운 업데이트 (엑셀 업로드된 세션들에서 추출)
 */
function updateSessionTypeDropdown(selectedValue = null) {
    const sessionTypeSelect = document.getElementById('sessionType');
    if (!sessionTypeSelect) return;
    
    // 현재 선택된 값 저장 (매개변수가 없으면 현재 값 사용)
    const currentValue = selectedValue !== null ? selectedValue : sessionTypeSelect.value;
    
    // 기존 옵션들 제거 (첫 번째 "세션 종류를 선택하세요" 옵션만 유지)
    while (sessionTypeSelect.options.length > 1) {
        sessionTypeSelect.remove(1);
    }
    
    // 세션들에서 고유한 세션 종류 추출
    const uniqueSessionTypes = [...new Set(sessions
        .map(session => session.sessionType)
        .filter(type => type && type.trim() !== '')
    )].sort();
    
    console.log('📋 Unique session types found:', uniqueSessionTypes);
    
    // 드롭다운에 옵션 추가
    uniqueSessionTypes.forEach(sessionType => {
        const option = document.createElement('option');
        option.value = sessionType;
        option.textContent = sessionType;
        sessionTypeSelect.appendChild(option);
    });
    
    // 이전에 선택된 값 복원
    if (currentValue && currentValue.trim() !== '') {
        sessionTypeSelect.value = currentValue;
        console.log(`✅ Restored selected session type: ${currentValue}`);
    }
    
    console.log(`✅ Updated session type dropdown with ${uniqueSessionTypes.length} options`);
}

// ============================================================
// 엑셀 업로드 관련 함수들
// ============================================================

/**
 * 동명이인 감지 및 선택 시스템
 */
let duplicateNameSelections = new Map(); // Store user selections for duplicate names
let currentDuplicateModal = null;

function findParticipantsByName(name) {
    if (!name || !name.trim()) return [];
    
    const trimmedName = name.trim();
    
    // 이름 정규화 함수: 대소문자 무시, 공백 정규화 (여러 공백을 하나로)
    const normalizeName = (str) => {
        if (!str) return '';
        return str.trim().toLowerCase().replace(/\s+/g, ' ');
    };
    
    // 이름을 완전히 정규화 (공백, 하이픈, 점 모두 제거)
    const fullyNormalize = (str) => {
        if (!str) return '';
        return str.trim().toLowerCase().replace(/[\s\.\-,]/g, '');
    };
    
    // 이름 정규화 (공백 정규화 포함)
    const normalizedSearchName = normalizeName(trimmedName);
    const fullyNormalizedSearch = fullyNormalize(trimmedName);
    
    console.log(`🔍 Searching for: "${trimmedName}" (normalized: "${normalizedSearchName}", fully: "${fullyNormalizedSearch}")`);
    
    // 한글/영문 구분 (영문은 영문자만, 한글은 한글 포함)
    const isEnglish = /^[a-zA-Z\s\.\-]+$/.test(trimmedName);
    const isKorean = /[가-힣]/.test(trimmedName);
    
    const results = participants.filter(p => {
        if (isEnglish) {
            // 영문 검색이지만 한글 이름을 가진 참가자도 체크해야 함
            // (예: "Ki hyung Lee" 검색 시 한글 이름 "이기형"의 name_eng도 매칭)
            // 영문 이름 검색: name_eng, first_name, family_name, name (영문일 경우)
            const engName = (p.name_eng || '').trim();
            const firstName = (p.first_name || '').trim();
            const familyName = (p.family_name || '').trim();
            const fullName = `${firstName} ${familyName}`.trim();
            const nameField = (p.name || '').trim();
            
            // 모든 영문 관련 필드들을 체크
            const allEnglishNames = [engName, fullName, nameField].filter(n => n && /^[a-zA-Z\s\.\-]+$/.test(n));
            
            // 디버깅: 모든 참가자 정보 출력
            console.log(`  👤 Participant: kor="${p.name_kor}", eng="${engName}", first="${firstName}", family="${familyName}", name="${nameField}"`);
            
            // 영문 필드가 없으면 false
            if (allEnglishNames.length === 0) {
                return false;
            }
            
            // 1단계: 정규화된 이름으로 정확한 매칭 (대소문자 무시, 공백 정규화)
            for (const name of allEnglishNames) {
                if (normalizeName(name) === normalizedSearchName) {
                    console.log(`  ✅ Exact match: "${name}"`);
                    return true;
                }
            }
            
            // 2단계: 완전 정규화 매칭 (공백, 하이픈, 점 모두 무시)
            for (const name of allEnglishNames) {
                if (fullyNormalize(name) === fullyNormalizedSearch) {
                    console.log(`  ✅ Fully normalized match: "${name}"`);
                    return true;
                }
            }
            
            // 3단계: 미들 네임 무시 매칭 (예: "David Gonda" vs "David D. Gonda")
            const searchParts = normalizedSearchName.split(' ').filter(p => p.length > 0);
            if (searchParts.length >= 2) {
                for (const nameToCheck of allEnglishNames) {
                    const normalized = normalizeName(nameToCheck);
                    const nameParts = normalized.split(' ').filter(p => p.length > 0);
                    
                    // 케이스 1: 정확히 같은 단어 수 (순서 무관)
                    if (searchParts.length === nameParts.length &&
                        searchParts.every(part => nameParts.includes(part))) {
                        console.log(`  ✅ Word order match: "${nameToCheck}"`);
                        return true;
                    }
                    
                    // 케이스 2: 미들 네임 무시 (검색어가 DB 이름의 부분집합)
                    // "David Gonda"가 "David D. Gonda"에 포함
                    if (searchParts.length < nameParts.length) {
                        // 미들 이니셜/네임 필터링 (1글자 또는 이니셜 형태)
                        const namePartsWithoutMiddle = nameParts.filter(part => 
                            part.length > 1 || !part.match(/^[a-z]\.?$/)
                        );
                        
                        // 검색 단어들이 모두 포함되어 있는지 확인
                        if (searchParts.every(part => namePartsWithoutMiddle.includes(part))) {
                            console.log(`  ✅ Middle name ignored match: "${nameToCheck}" (without middle: ${namePartsWithoutMiddle.join(' ')})`);
                            return true;
                        }
                    }
                }
            }
            
            // 4단계: 부분 매칭
            for (const name of allEnglishNames) {
                if (fullyNormalize(name).includes(fullyNormalizedSearch)) {
                    console.log(`  ✅ Partial match: "${name}"`);
                    return true;
                }
            }
        } else if (isKorean) {
            // 한글 이름 검색: name_kor, name (한글일 경우)
            const korName = (p.name_kor || '').trim();
            const nameField = (p.name || '').trim();
            
            // 정확한 매칭
            if (korName === trimmedName) return true;
            if (nameField === trimmedName && /[가-힣]/.test(nameField)) return true;
            
            // 부분 매칭
            if (korName && korName.includes(trimmedName)) return true;
        } else {
            // 기타 (한글/영문 혼합 또는 숫자 등): 모든 필드 검색
            const allNames = [
                p.name_kor, p.name_eng, p.name, 
                p.first_name, p.family_name,
                `${p.first_name} ${p.family_name}`.trim()
            ].filter(Boolean);
            
            return allNames.some(n => {
                const normalized = n.trim().toLowerCase();
                return normalized === trimmedName.toLowerCase() || normalized.includes(trimmedName.toLowerCase());
            });
        }
        return false;
    });
    
    console.log(`✅ Found ${results.length} matches for "${trimmedName}"`);
    if (results.length > 0) {
        results.forEach((r, i) => {
            console.log(`  ${i+1}. "${r.name_kor || r.name_eng || r.name}" (ID: ${r.id})`);
        });
    }
    
    return results;
}

function hasDuplicateNames(name) {
    const matches = findParticipantsByName(name);
    return matches.length > 1;
}

function showDuplicateNameModal(name, sessionTitle, speakerIndex, callback, roleLabel = '발표자') {
    const matches = findParticipantsByName(name);
    
    if (matches.length <= 1) {
        // No duplicates, proceed normally
        callback(matches[0] || null);
        return;
    }
    
    console.log(`🔄 Found ${matches.length} participants with name "${name}"`);
    
    // Remove any existing duplicate name modal
    const existingModal = document.getElementById('duplicateNameModal');
    if (existingModal) {
        console.log('🗑️ Removing existing duplicate name modal');
        existingModal.remove();
    }
    
    // Create modal HTML
    const roleDescription = roleLabel === '발표자'
        ? `${speakerIndex + 1}번째 발표자`
        : '좌장';

    const modalHtml = `
        <div id="duplicateNameModal" class="modal-overlay" style="display: flex; z-index: 10000;">
            <div class="modal-content" style="max-width: 600px; max-height: 80vh; overflow-y: auto; z-index: 10001;">
                <div class="modal-header">
                    <h3>동명이인 선택</h3>
                    <button type="button" class="close-btn" onclick="closeDuplicateNameModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="alert alert-warning">
                        <i class="fas fa-exclamation-triangle"></i>
                        <strong>동명이인이 발견되었습니다!</strong><br>
                        세션: <strong>"${sessionTitle}"</strong><br>
                        ${roleLabel}: <strong>"${name}"</strong>${roleLabel === '발표자' ? ` (${roleDescription})` : ''}
                    </div>
                    <p>아래에서 올바른 참가자를 선택해주세요:</p>
                    <div class="duplicate-participants-list">
                        ${matches.map((participant, index) => `
                            <div class="duplicate-participant-item" data-participant-id="${participant.id}">
                                <div class="participant-card">
                                    <div class="participant-info">
                                        <div class="participant-name">${participant.name}</div>
                                        <div class="participant-email">${participant.email || '이메일 없음'}</div>
                                        <div class="participant-affiliation">${participant.affiliation || '소속 정보 없음'}</div>
                                        ${participant.nameEng ? `<div class="participant-name-eng">${participant.nameEng}</div>` : ''}
                                    </div>
                                    <button type="button" class="btn btn-primary select-participant-btn" 
                                            onclick="selectDuplicateParticipant(${participant.id}, '${name}', '${sessionTitle}', ${speakerIndex}, '${roleLabel}')">
                                        선택
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="modal-footer" style="margin-top: 20px; text-align: center;">
                        <button type="button" class="btn btn-secondary" onclick="skipDuplicateParticipant('${name}', '${sessionTitle}', ${speakerIndex}, '${roleLabel}')">
                            건너뛰기 (임시 참가자로 추가)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Debug: Check if modal was added
    const addedModal = document.getElementById('duplicateNameModal');
    if (addedModal) {
        console.log('✅ Duplicate name modal added to DOM');
        console.log('Modal element:', addedModal);
        console.log('Modal display style:', addedModal.style.display);
        console.log('Modal z-index:', addedModal.style.zIndex);
        
        // Force modal to be visible
        addedModal.style.position = 'fixed';
        addedModal.style.top = '0';
        addedModal.style.left = '0';
        addedModal.style.width = '100%';
        addedModal.style.height = '100%';
        addedModal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        addedModal.style.zIndex = '10000';
        addedModal.style.display = 'flex';
        addedModal.style.justifyContent = 'center';
        addedModal.style.alignItems = 'center';
        
        console.log('🔧 Modal styles forced to be visible');
        console.log('Final modal styles:', {
            position: addedModal.style.position,
            display: addedModal.style.display,
            zIndex: addedModal.style.zIndex,
            backgroundColor: addedModal.style.backgroundColor
        });
    } else {
        console.error('❌ Failed to add duplicate name modal to DOM');
    }
    
    currentDuplicateModal = {
        name: name,
        sessionTitle: sessionTitle,
        speakerIndex: speakerIndex,
        callback: callback,
        roleLabel: roleLabel
    };
}

function selectDuplicateParticipant(participantId, name, sessionTitle, speakerIndex, roleLabel = '발표자') {
    console.log(`✅ Selected participant ${participantId} for duplicate name "${name}"`);
    console.log(`🔍 Current duplicate modal state:`, currentDuplicateModal);
    
    // Store the selection
    const key = `${sessionTitle}_${speakerIndex}_${name}_${roleLabel}`;
    duplicateNameSelections.set(key, participantId);
    
    // Find the selected participant
    const selectedParticipant = participants.find(p => p.id == participantId);
    console.log(`🔍 Found selected participant:`, selectedParticipant);
    
    // Call the callback with the selected participant BEFORE closing modal
    if (currentDuplicateModal && currentDuplicateModal.callback) {
        console.log(`🎯 Calling callback for ${name} with participant:`, selectedParticipant);
        try {
            currentDuplicateModal.callback(selectedParticipant);
            console.log(`✅ Callback completed for ${name}`);
        } catch (error) {
            console.error(`❌ Error in callback for ${name}:`, error);
        }
    } else {
        console.error(`❌ No callback available for ${name}. Current modal:`, currentDuplicateModal);
    }
    
    // Close modal AFTER calling callback
    closeDuplicateNameModal();
}

function skipDuplicateParticipant(name, sessionTitle, speakerIndex, roleLabel = '발표자') {
    console.log(`⏭️ Skipping duplicate participant selection for "${name}" - adding as temporary participant`);
    
    // Create temporary participant
    const tempParticipantId = -(Date.now() + Math.random() * 1000);
    const tempParticipant = {
        participantId: tempParticipantId,
        name: name,
        email: '',
        affiliation: '',
        isTemporary: true
    };
    
    // Call the callback with the temporary participant BEFORE closing modal
    if (currentDuplicateModal && currentDuplicateModal.callback) {
        console.log(`🎯 Calling callback for ${name} with temporary participant:`, tempParticipant);
        try {
            currentDuplicateModal.callback(tempParticipant);
            console.log(`✅ Callback completed for ${name}`);
        } catch (error) {
            console.error(`❌ Error in callback for ${name}:`, error);
        }
    } else {
        console.error(`❌ No callback available for ${name}. Current modal:`, currentDuplicateModal);
    }
    
    // Close modal AFTER calling callback
    closeDuplicateNameModal();
}

function closeDuplicateNameModal() {
    const modal = document.getElementById('duplicateNameModal');
    if (modal) {
        modal.remove();
    }
    currentDuplicateModal = null;
}

/**
 * 엑셀 업로드 모달 열기
 */
function openExcelUploadModal() {
    const modal = document.getElementById('excelUploadModal');
    modal.style.display = 'block';
    
    // 초기화
    document.getElementById('excelFileInput').value = '';
    document.getElementById('uploadProgress').style.display = 'none';
    document.getElementById('uploadResult').style.display = 'none';
    
    console.log('📤 Excel upload modal opened');
}

/**
 * 엑셀 업로드 모달 닫기
 */
function closeExcelUploadModal() {
    const modal = document.getElementById('excelUploadModal');
    modal.style.display = 'none';
    
    // 버튼을 원래 상태로 복원
    const uploadBtn = document.getElementById('excelUploadBtn');
    uploadBtn.innerHTML = '<i class="fas fa-upload"></i> 업로드 및 생성';
    uploadBtn.onclick = processExcelUpload;
    
    // 업로드 결과 초기화
    document.getElementById('uploadProgress').style.display = 'none';
    document.getElementById('uploadResult').style.display = 'none';
    document.getElementById('uploadErrorMessage').style.display = 'none';
    
    // 파일 입력 초기화
    document.getElementById('excelFileInput').value = '';
}

/**
 * 엑셀 템플릿 다운로드
 */
function downloadExcelTemplate() {
    // SheetJS 라이브러리를 사용하여 템플릿 생성
    const wb = XLSX.utils.book_new();
    
    // 템플릿 데이터
    const templateData = [
        [
            '세션 종류 (Session Type)',
            '언어 (Language)',
            '세션약어 (Session Abbreviation)',
            '세션명 (Session Topic)',
            '장소 (Venue)',
            '세션 시간 (Session Time)',
            '좌장 (Chair)',
            '발표자 (Speaker)',
            '발표 주제 (Lecture Title)',
            '발표 시간 (Lecture Time)'
        ],
        [
            'Keynote Lecture',
            'English Session',
            'KL',
            'AI 기술 동향',
            'Room A',
            '09:00-12:00',
            '홍길동',
            '김철수',
            '딥러닝 기초',
            '09:00-10:00'
        ],
        [
            'Keynote Lecture',
            'English Session',
            'KL',
            'AI 기술 동향',
            'Room A',
            '09:00-12:00',
            '홍길동',
            '이영희',
            '머신러닝 응용',
            '10:00-11:00'
        ],
        [
            'Special Interest Group',
            'Bilingual Session',
            'SIG',
            '데이터 과학',
            'Room B',
            '13:00-15:00',
            '박지성',
            '최민수',
            '빅데이터 분석',
            '13:00-14:00'
        ],
        [
            'Parallel Symposium',
            '',
            'PS',
            '임상 연구',
            'Room C',
            '14:00-16:00',
            '정우성 / 김태희',
            '김헌민 / 이서영 / 손영민',
            '임상 연구 방법론',
            '14:00-16:00'
        ],
        [
            'Parallel Symposium',
            '',
            'PS',
            '임상 연구',
            'Room C',
            '14:00-16:00',
            '정우성 / 김태희',
            'Discussion',
            '',
            '15:30-16:00'
        ],
        [
            'Break',
            '',
            'BRE',
            'Coffee Break',
            'Room A',
            '10:00-10:15',
            '',
            '',
            '',
            ''
        ],
        [
            'Opening Ceremony',
            '',
            '',
            'Opening Ceremony',
            'Room A',
            '08:30-09:00',
            '',
            '',
            '',
            ''
        ]
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    
    // 열 너비 설정
    ws['!cols'] = [
        { wch: 22 }, // Session Type
        { wch: 16 }, // Language
        { wch: 12 }, // Session Abbreviation
        { wch: 25 }, // Session Topic
        { wch: 15 }, // Venue
        { wch: 18 }, // Session Time
        { wch: 20 }, // Chair (여러 명 가능)
        { wch: 28 }, // Speaker (여러 명 가능)
        { wch: 30 }, // Lecture Title
        { wch: 18 }  // Lecture Time
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, 'Program Template');
    XLSX.writeFile(wb, 'program_template.xlsx');
    
    console.log('✅ Template downloaded');
}

/**
 * 엑셀 파일 업로드 및 처리
 */
async function processExcelUpload() {
    const fileInput = document.getElementById('excelFileInput');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('엑셀 파일을 선택해주세요.');
        return;
    }
    
    console.log('📂 Processing Excel file:', file.name);
    
    // Progress 표시
    document.getElementById('uploadProgress').style.display = 'block';
    document.getElementById('uploadResult').style.display = 'none';
    document.getElementById('uploadStatus').textContent = '파일을 읽는 중...';
    document.getElementById('progressBarFill').style.width = '10%';
    
    try {
        // 파일 읽기
        const data = await readExcelFile(file);
        document.getElementById('progressBarFill').style.width = '30%';
        document.getElementById('uploadStatus').textContent = '데이터를 파싱하는 중...';
        
        // 데이터 파싱
        const parsedSessions = parseExcelData(data);
        document.getElementById('progressBarFill').style.width = '60%';
        document.getElementById('uploadStatus').textContent = '세션을 생성하는 중...';
        
        // 세션 생성
        const result = await createSessionsFromExcel(parsedSessions);
        if (result.newVenues && result.newVenues.length > 0) {
            console.log('🏛️ New venues detected from Excel upload:', result.newVenues);
            renderVenues();
            updateVenueSelects();
            saveVenues();
        }
        document.getElementById('progressBarFill').style.width = '90%';
        
        // 저장
        await saveProgram();
        document.getElementById('progressBarFill').style.width = '100%';
        document.getElementById('uploadStatus').textContent = '완료!';
        
        // 결과 표시
        document.getElementById('uploadProgress').style.display = 'none';
        document.getElementById('uploadResult').style.display = 'block';
        document.getElementById('uploadSuccessMessage').innerHTML = `
            <strong>✅ 업로드 완료!</strong><br>
            총 ${result.created} 개의 세션이 생성되었습니다.<br>
            ${result.warnings.length > 0 ? `<br><strong>⚠️ 경고:</strong><br>${result.warnings.join('<br>')}` : ''}
        `;
        
        if (result.errors.length > 0) {
            document.getElementById('uploadErrorMessage').style.display = 'block';
            document.getElementById('uploadErrorMessage').innerHTML = `
                <strong>❌ 오류가 발생했습니다:</strong><br>
                ${result.errors.join('<br>')}
            `;
        }
        
        // 세션 렌더링
        renderSessions();
        
        // 세션 종류 드롭다운 업데이트
        updateSessionTypeDropdown();
        
        console.log('✅ Excel upload completed:', result);
        
        // 버튼을 "확인" 버튼으로 변경
        const uploadBtn = document.getElementById('excelUploadBtn');
        uploadBtn.innerHTML = '<i class="fas fa-check"></i> 확인';
        uploadBtn.onclick = closeExcelUploadModal;
        
    } catch (error) {
        console.error('❌ Error processing Excel file:', error);
        document.getElementById('uploadProgress').style.display = 'none';
        document.getElementById('uploadResult').style.display = 'block';
        document.getElementById('uploadErrorMessage').style.display = 'block';
        document.getElementById('uploadErrorMessage').innerHTML = `
            <strong>❌ 오류가 발생했습니다:</strong><br>
            ${error.message}
        `;
        
        // 에러 발생 시에도 버튼을 "확인" 버튼으로 변경
        const uploadBtn = document.getElementById('excelUploadBtn');
        uploadBtn.innerHTML = '<i class="fas fa-check"></i> 확인';
        uploadBtn.onclick = closeExcelUploadModal;
    }
}

/**
 * 엑셀 파일 읽기
 */
function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const fileName = file.name.toLowerCase();
                
                // CSV 파일 처리
                if (fileName.endsWith('.csv')) {
                    const text = e.target.result;
                    const lines = text.split('\n');
                    const jsonData = lines.map(line => {
                        // CSV 파싱 (쉼표로 구분, 따옴표 내 쉼표 처리)
                        const result = [];
                        let current = '';
                        let inQuotes = false;
                        
                        for (let i = 0; i < line.length; i++) {
                            const char = line[i];
                            if (char === '"') {
                                inQuotes = !inQuotes;
                            } else if (char === ',' && !inQuotes) {
                                result.push(current.trim());
                                current = '';
                            } else {
                                current += char;
                            }
                        }
                        result.push(current.trim());
                        return result;
                    });
                    
                    console.log('📊 CSV data read:', jsonData.length, 'rows');
                    resolve(jsonData);
                } else {
                    // Excel 파일 처리
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    // 첫 번째 시트 읽기
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                    
                    console.log('📊 Excel data read:', jsonData.length, 'rows');
                    resolve(jsonData);
                }
            } catch (error) {
                reject(new Error('파일을 읽는 중 오류가 발생했습니다: ' + error.message));
            }
        };
        
        reader.onerror = function() {
            reject(new Error('파일을 읽을 수 없습니다.'));
        };
        
        // CSV는 텍스트로, Excel은 ArrayBuffer로 읽기
        const fileName = file.name.toLowerCase();
        if (fileName.endsWith('.csv')) {
            reader.readAsText(file, 'UTF-8');
        } else {
            reader.readAsArrayBuffer(file);
        }
    });
}
/**
 * 엑셀 데이터 파싱
 */
function parseExcelData(data) {
    if (data.length < 2) {
        throw new Error('엑셀 파일에 데이터가 없습니다.');
    }
    
    const headers = data[0];
    console.log('📋 Headers:', headers);
    
    // 헤더 인덱스 찾기 (한글/영문 모두 지원)
    const dateIdx = headers.findIndex(h => 
        h && (h.includes('날짜') || h.includes('Date')));
    const sessionTypeIdx = headers.findIndex(h => 
        h && (h.includes('세션 종류') || h.includes('Session Type')));
    const sessionLanguageIdx = headers.findIndex(h => 
        h && (h.includes('언어') || h.toLowerCase().includes('language')));
    const sessionAbbrevIdx = headers.findIndex(h => 
        h && (h.includes('세션약어') || h.includes('세션 약어') || h.includes('Session Abbreviation') || h.includes('Abbreviation')));
    const sessionTitleIdx = headers.findIndex(h => 
        h && (h.includes('세션주제') || h.includes('세션명') || h.includes('Session Topic')));
    const venueIdx = headers.findIndex(h => 
        h && (h.includes('발표장소') || h.includes('장소') || h.includes('Venue')));
    const sessionTimeIdx = headers.findIndex(h => 
        h && (h.includes('세션시간') || h.includes('세션 시간') || h.includes('Session Time')));
    const chairIdx = headers.findIndex(h => 
        h && (h.includes('좌장') || h.includes('Chair')));
    const speakerIdx = headers.findIndex(h => 
        h && (h.includes('발표자') || h.includes('Speaker')));
    const lectureTitleIdx = headers.findIndex(h => 
        h && (h.includes('발표 주제') || h.includes('Lecture Title')));
    const lectureTimeIdx = headers.findIndex(h => 
        h && (h.includes('발표시간') || h.includes('발표 시간') || h.includes('Lecture Time')));
    
    console.log('📍 Column indices:', {
        dateIdx, sessionTypeIdx, sessionLanguageIdx, sessionAbbrevIdx, sessionTitleIdx, venueIdx, sessionTimeIdx,
        chairIdx, speakerIdx, lectureTitleIdx, lectureTimeIdx
    });
    
    // 필수 컬럼 확인 (날짜, 좌장, 발표자는 선택사항)
    const requiredIndices = [sessionTypeIdx, sessionTitleIdx, venueIdx, sessionTimeIdx];
    if (requiredIndices.some(idx => idx === -1)) {
        throw new Error('필수 컬럼이 누락되었습니다. 템플릿을 다운로드하여 형식을 확인하세요.');
    }
    
    // 세션 데이터 그룹화 (같은 세션 = 같은 세션명 + 시작시간 + 장소)
    const sessionsMap = new Map();
    
    console.log('📊 Processing Excel rows:', data.length - 1);
    
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        console.log(`\n📝 Processing row ${i}:`, row);
        
        // 빈 행 건너뛰기
        if (!row || row.length === 0 || !row[sessionTitleIdx]) {
            console.log(`⏭️ Skipping empty row ${i}`);
            continue;
        }
        
        // 날짜 파싱 (다양한 형식 및 엑셀 시리얼 지원)
        let sessionDate = '';
        if (dateIdx !== -1 && row[dateIdx] !== undefined && row[dateIdx] !== null) {
            sessionDate = convertExcelDateValue(row[dateIdx]) || '';
            if (sessionDate) {
                console.log(`✅ Date parsed -> "${sessionDate}"`);
            } else {
                console.warn('⚠️ Could not parse date value:', row[dateIdx]);
            }
        }
        
        const sessionType = row[sessionTypeIdx]?.toString().trim() || '';
        const sessionLanguage = sessionLanguageIdx !== -1 ? (row[sessionLanguageIdx]?.toString().trim() || '') : '';
        const sessionAbbreviation = sessionAbbrevIdx !== -1 ? (row[sessionAbbrevIdx]?.toString().trim() || '') : '';
        let sessionTitle = row[sessionTitleIdx]?.toString().trim() || '';
        const venue = row[venueIdx]?.toString().trim() || '';
        
        // TBD 또는 빈 값 처리
        if (sessionTitle.toUpperCase() === 'TBD') {
            sessionTitle = 'TBD';
        } else if (!sessionTitle) {
            // 빈 값은 빈 문자열로 유지
            sessionTitle = '';
        }
        const sessionTimeRange = row[sessionTimeIdx]?.toString().trim() || '';
        let chairName = row[chairIdx]?.toString().trim() || '';
        
        // TBD 값 유지 (대소문자 구분 없이)
        if (chairName && chairName.toUpperCase() === 'TBD') {
            chairName = 'TBD';
        }
        
        console.log(`📋 Row ${i} data:`, {
            date: sessionDate, sessionType, sessionLanguage, sessionAbbreviation, sessionTitle, venue, sessionTimeRange, chairName
        });
        
        // 세션 시간 파싱 (HH:MM-HH:MM 형식)
        const { startTime: sessionStart, endTime: sessionEnd } = parseTimeRange(sessionTimeRange);
        
        // 세션 키 생성
        const normalizedDateForKey = sessionDate || 'NO_DATE';
        const sessionKey = `${sessionTitle}_${sessionStart}_${normalizedDateForKey}_${venue}`;
        console.log(`🔑 Session key: ${sessionKey}`);
        
        if (!sessionsMap.has(sessionKey)) {
            console.log(`🆕 Creating new session: ${sessionKey}`);
            sessionsMap.set(sessionKey, {
                sessionType: sessionType,
                language: sessionLanguage,
                sessionAbbreviation: sessionAbbreviation,  // 엑셀에서 업로드된 약어 저장
                title: sessionTitle,
                venue: venue,
                startTime: sessionStart,
                endTime: sessionEnd,
                chairName: chairName,
                date: sessionDate,  // 날짜 정보 추가
                speakers: []
            });
        } else {
            console.log(`♻️ Using existing session: ${sessionKey}`);
            // 기존 세션에 날짜가 없으면 추가
            const existingSession = sessionsMap.get(sessionKey);
            if (!existingSession.date && sessionDate) {
                existingSession.date = sessionDate;
            }
            if (!existingSession.language && sessionLanguage) {
                existingSession.language = sessionLanguage;
            }
        }
        
        const speakerNamesRaw = speakerIdx !== -1 && row[speakerIdx] !== undefined && row[speakerIdx] !== null
            ? row[speakerIdx].toString().trim()
            : '';
        let lectureTitle = lectureTitleIdx !== -1 && row[lectureTitleIdx] !== undefined && row[lectureTitleIdx] !== null
            ? row[lectureTitleIdx].toString().trim()
            : '';
        const lectureTimeRange = lectureTimeIdx !== -1 && row[lectureTimeIdx] !== undefined && row[lectureTimeIdx] !== null
            ? row[lectureTimeIdx].toString().trim()
            : sessionTimeRange;

        if (lectureTitle && lectureTitle.toUpperCase() === 'TBD') {
            lectureTitle = 'TBD';
        }

        const hasSpeakerData = speakerNamesRaw.length > 0;
        const hasTopicData = (lectureTitle || '').trim().length > 0;
        const hasTimeData = (lectureTimeRange || '').trim().length > 0;

        if (!hasSpeakerData && !hasTopicData && !hasTimeData) {
            console.log(`⚠️ No speaker or topic data in row ${i}`);
        } else {
            let speakerNameList = [];
            if (speakerNamesRaw && speakerNamesRaw.includes('/')) {
                speakerNameList = speakerNamesRaw.split('/').map(name => name.trim()).filter(name => name);
                console.log(`👥 Multiple speakers detected: ${speakerNameList.join(', ')}`);
            } else if (speakerNamesRaw) {
                speakerNameList = [speakerNamesRaw.trim()];
            }

            if (speakerNameList.length === 0) {
                const trimmedTopic = (lectureTitle || '').trim();
                if (trimmedTopic || hasTimeData) {
                    const { startTime: lectureStart, endTime: lectureEnd } = parseTimeRange(lectureTimeRange);
                    sessionsMap.get(sessionKey).speakers.push({
                        participantId: null,
                        name: '',
                        topic: trimmedTopic,
                        startTime: lectureStart,
                        endTime: lectureEnd,
                        isSpeaker: false,
                        isTopicOnly: true
                    });
                    console.log(`ℹ️ Added topic-only entry without speaker name: ${trimmedTopic || '(no topic)'}`);
                } else {
                    console.log(`⚠️ Speaker name and topic are blank, skipping entry`);
                }
            } else {
                for (const speakerName of speakerNameList) {
                    // 특수 키워드 확인 (참가자로 처리하지 않음)
                    const specialKeywords = ['TBD', 'DISCUSSION', 'Q&A', 'QA', 'BREAK', 'COFFEE BREAK', 'LUNCH', 'PANEL DISCUSSION', 'OPEN DISCUSSION'];
                    const speakerNameUpper = speakerName.toUpperCase().trim();
                    const isSpecialKeyword = specialKeywords.some(keyword => speakerNameUpper === keyword || speakerNameUpper.includes(keyword));

                    let processedSpeakerName = speakerName;
                    if (isSpecialKeyword) {
                        // 특수 키워드는 그대로 사용 (참가자 검색 안 함)
                        processedSpeakerName = speakerName;
                        console.log(`🔖 Special keyword detected: "${speakerName}" - will not search for participant`);
                    }

                    // 발표자 이름이 있는 경우만 추가
                    if (processedSpeakerName) {
                        console.log(`👤 Adding speaker: ${processedSpeakerName} (${lectureTitle}) [${lectureTimeRange}]`);

                        // 발표 시간 파싱 (HH:MM-HH:MM 형식)
                        const { startTime: lectureStart, endTime: lectureEnd } = parseTimeRange(lectureTimeRange);

                        const speakerData = {
                            name: processedSpeakerName,
                            topic: lectureTitle || '',  // 빈 값 허용
                            startTime: lectureStart,
                            endTime: lectureEnd,
                            isSpeaker: true,  // 발표자 구분을 위한 플래그
                            isSpecialKeyword: isSpecialKeyword  // 특수 키워드 플래그 (참가자 검색 건너뛰기)
                        };

                        console.log(`📝 Speaker data:`, speakerData);

                        sessionsMap.get(sessionKey).speakers.push(speakerData);
                        console.log(`✅ Speaker added. Total speakers in session: ${sessionsMap.get(sessionKey).speakers.length}`);
                    } else {
                        const trimmedTopic = (lectureTitle || '').trim();
                        if (trimmedTopic) {
                            console.log(`ℹ️ Speaker name is blank but topic exists. Adding topic-only entry: ${trimmedTopic}`);
                            const { startTime: lectureStart, endTime: lectureEnd } = parseTimeRange(lectureTimeRange);
                            sessionsMap.get(sessionKey).speakers.push({
                                participantId: null,
                                name: '',
                                topic: trimmedTopic,
                                startTime: lectureStart,
                                endTime: lectureEnd,
                                isSpeaker: false,
                                isTopicOnly: true
                            });
                            console.log(`✅ Topic-only entry added. Total speakers in session: ${sessionsMap.get(sessionKey).speakers.length}`);
                        } else {
                            console.log(`⚠️ Speaker name is blank, skipping speaker addition`);
                        }
                    }
                }
            }
        }
    }

    const parsedSessions = Array.from(sessionsMap.values());
    console.log('✅ Parsed sessions:', parsedSessions.length, parsedSessions);
    
    return parsedSessions;
}

/**
 * 복합 장소명을 개별 장소로 확장
 * 예: "Hanra ABC" -> ["Hanra A", "Hanra B", "Hanra C"]
 *     "Hanra AB" -> ["Hanra A", "Hanra B"]
 */
function expandVenueName(venueName) {
    if (!venueName) {
        return [venueName];
    }
    
    const venueStr = venueName.trim();
    
    // 패턴 매칭: "기본이름 + 대문자들" (예: "Hanra ABC", "Shilla AB")
    // 마지막에 2개 이상의 연속된 대문자가 있는지 확인
    const pattern = /^(.+?)\s*([A-Z]{2,})$/;
    const match = venueStr.match(pattern);
    
    if (match) {
        const baseName = match[1].trim(); // 예: "Hanra"
        const letters = match[2]; // 예: "ABC"
        
        console.log(`🔄 Expanding venue: "${venueStr}" -> Base: "${baseName}", Letters: "${letters}"`);
        
        // 각 문자를 개별 장소로 확장
        const expandedVenues = [];
        for (let i = 0; i < letters.length; i++) {
            const expandedVenue = `${baseName} ${letters[i]}`;
            expandedVenues.push(expandedVenue);
        }
        
        console.log(`✅ Expanded venues:`, expandedVenues);
        return expandedVenues;
    }
    
    // 패턴에 맞지 않으면 원래 장소명 그대로 반환
    return [venueStr];
}

/**
 * 시간 범위 파싱 (HH:MM-HH:MM 형식)
 */
function parseTimeRange(timeRange) {
    if (!timeRange) {
        return { startTime: '', endTime: '' };
    }
    
    const timeStr = timeRange.toString().trim();
    
    // HH:MM-HH:MM 형식 파싱
    if (timeStr.includes('-')) {
        const [startTimeStr, endTimeStr] = timeStr.split('-');
        const startTime = normalizeTime(startTimeStr);
        const endTime = normalizeTime(endTimeStr);
        return { startTime, endTime };
    }
    
    // 단일 시간인 경우 (시작시간으로 처리)
    const normalizedTime = normalizeTime(timeStr);
    return { startTime: normalizedTime, endTime: normalizedTime };
}

function normalizeDateValue(rawDate) {
    if (rawDate === null || rawDate === undefined) {
        return '';
    }

    if (rawDate instanceof Date) {
        try {
            return rawDate.toISOString().split('T')[0];
        } catch (error) {
            console.warn('⚠️ Failed to normalize Date object:', rawDate, error);
            return '';
        }
    }

    const str = String(rawDate).trim();
    if (!str) {
        return '';
    }

    const isoMatch = str.match(/^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})/);
    if (isoMatch) {
        const [, year, month, day] = isoMatch;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    const dotOrSlashMatch = str.match(/^([0-9]{4})[./]([0-9]{1,2})[./]([0-9]{1,2})/);
    if (dotOrSlashMatch) {
        const [, year, month, day] = dotOrSlashMatch;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    const compactMatch = str.match(/^([0-9]{4})([0-9]{2})([0-9]{2})$/);
    if (compactMatch) {
        const [, year, month, day] = compactMatch;
        return `${year}-${month}-${day}`;
    }

    return str;
}

function convertExcelDateValue(value) {
    if (value === null || value === undefined || value === '') {
        return '';
    }

    if (value instanceof Date) {
        return normalizeDateValue(value);
    }

    if (typeof value === 'number' && typeof XLSX !== 'undefined' && XLSX.SSF && XLSX.SSF.parse_date_code) {
        const parsed = XLSX.SSF.parse_date_code(value);
        if (parsed && parsed.y && parsed.m && parsed.d) {
            const year = String(parsed.y);
            const month = String(parsed.m).padStart(2, '0');
            const day = String(parsed.d).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
    }

    return normalizeDateValue(value);
}

function datesMatchForFilter(dateA, dateB) {
    const normalizedA = normalizeDateValue(dateA);
    const normalizedB = normalizeDateValue(dateB);
    if (!normalizedA || !normalizedB) {
        return false;
    }

    if (normalizedA === normalizedB) {
        return true;
    }

    const partsA = normalizedA.split('-');
    const partsB = normalizedB.split('-');
    if (partsA.length === 3 && partsB.length === 3) {
        return partsA[1] === partsB[1] && partsA[2] === partsB[2];
    }

    return false;
}
/**
 * 시간 정규화 (다양한 형식 지원)
 */
function normalizeTime(timeValue) {
    if (!timeValue) return '';
    
    let timeStr = timeValue.toString().trim();
    
    // Excel 시리얼 숫자인 경우 (0.375 = 09:00)
    if (!isNaN(timeStr) && timeStr.includes('.')) {
        const hours = Math.floor(parseFloat(timeStr) * 24);
        const minutes = Math.floor((parseFloat(timeStr) * 24 * 60) % 60);
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
    
    // HH:MM 형식인 경우
    if (timeStr.includes(':')) {
        const [hours, minutes] = timeStr.split(':');
        return `${String(hours).padStart(2, '0')}:${String(minutes || '00').padStart(2, '0')}`;
    }
    
    // HHMM 형식인 경우
    if (timeStr.length === 3 || timeStr.length === 4) {
        const hours = timeStr.slice(0, -2);
        const minutes = timeStr.slice(-2);
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
    
    return timeStr;
}

/**
 * 엑셀 데이터로 세션 생성
 */
// 비동기적으로 동명이인을 처리하는 함수
async function processSpeakerWithDuplicates(speaker, sessionTitle, speakerIndex) {
    console.log(`🔍 Processing ${speaker.isSpeaker !== false ? 'speaker' : 'chair'}: ${speaker.name} for session: ${sessionTitle}`);
    console.log(`   isSpeaker flag: ${speaker.isSpeaker}`);
    console.log(`   isSpecialKeyword flag: ${speaker.isSpecialKeyword}`);
    
    // 특수 키워드 또는 TBD 또는 빈 값은 참가자 검색 없이 바로 임시 참가자로 처리
    const name = speaker.name ? speaker.name.trim() : '';
    
    // 특수 키워드 체크 (Discussion, Q&A, Break 등)
    if (speaker.isSpecialKeyword || !name) {
        console.log(`🔖 Special keyword or blank detected: "${name}", creating non-participant entry`);
        const tempParticipantId = -(Date.now() + Math.random() * 1000);
        const tempParticipant = {
            participantId: tempParticipantId,
            id: tempParticipantId,
            name: name,
            email: '',
            affiliation: '',
            isTemporary: true,
            isSpecialKeyword: true
        };
        console.log(`✅ Returning special keyword entry:`, tempParticipant);
        return tempParticipant;
    }
    
    const matches = findParticipantsByName(speaker.name);
    console.log(`🔍 Found ${matches.length} matches for "${speaker.name}"`);
    
    if (matches.length === 0) {
        // 참가자 없음 - 사용자에게 확인
        console.warn(`⚠️ Speaker not found: ${speaker.name} - Asking user`);
        
        const userChoice = await confirmAddMissingParticipant(
            speaker.name,
            speaker.isSpeaker !== false ? '발표자' : '좌장',  // isSpeaker가 명시적으로 false가 아니면 발표자로 처리
            sessionTitle
        );
        
        if (userChoice === 'add') {
            // 참가자 추가 모달 표시
            const participant = await showAddParticipantModal(
                speaker.name,
                speaker.isSpeaker !== false ? '발표자' : '좌장',  // isSpeaker가 명시적으로 false가 아니면 발표자로 처리
                sessionTitle
            );
            console.log(`✅ Participant resolved:`, participant);
            return participant;
        } else if (userChoice && typeof userChoice === 'object' && userChoice.id) {
            // 기존 참가자 검색에서 선택한 경우 (참가자 객체가 반환됨)
            console.log(`🔍 User selected existing participant from search:`, userChoice);
            return userChoice;
        } else if (userChoice === 'skip') {
            // 건너뛰기 - 업로드 취소
            console.log(`⏭️ User chose to skip "${speaker.name}"`);
            throw new Error(`"${speaker.name}" 참가자 추가를 건너뛰었습니다.`);
        }
    } else if (matches.length === 1) {
        // 정확히 1명 - 바로 매칭
        console.log(`✅ Found unique participant: ${speaker.name}`);
        console.log(`✅ Returning unique participant:`, matches[0]);
        return matches[0];
    } else {
        // 동명이인 - 사용자 선택 필요
        console.log(`🔄 Found ${matches.length} participants with name "${speaker.name}" - showing selection modal`);
        
        // 현재 모달이 있으면 제거
        const existingModal = document.getElementById('duplicateNameModal');
        if (existingModal) {
            console.log('🗑️ Removing existing modal before showing new one');
            existingModal.remove();
        }
        
        // Promise로 감싸서 await 가능하게 만듦
        const roleLabel = speaker.isSpeaker === false ? '좌장' : '발표자';
        const selectedParticipant = await new Promise((resolve) => {
            showDuplicateNameModal(speaker.name, sessionTitle, speakerIndex, (selectedParticipant) => {
                console.log(`🎯 Callback received for ${speaker.name}:`, selectedParticipant);
                
                if (selectedParticipant) {
                    console.log(`✅ User selected participant: ${selectedParticipant.name} (ID: ${selectedParticipant.id})`);
                    resolve(selectedParticipant);
                } else {
                    // 사용자가 선택하지 않음 - 임시 참가자로 추가
                    console.warn(`⚠️ No participant selected for ${speaker.name} - Adding as temporary participant`);
                    const tempParticipantId = -(Date.now() + Math.random() * 1000);
                    const tempParticipant = {
                        participantId: tempParticipantId,
                        name: speaker.name,
                        email: '',
                        affiliation: '',
                        isTemporary: true
                    };
                    console.log(`✅ Resolving with temporary participant:`, tempParticipant);
                    resolve(tempParticipant);
                }
            }, roleLabel);
        });
        
        return selectedParticipant;
    }
}

async function createSessionsFromExcel(parsedSessions) {
    const result = {
        created: 0,
        warnings: [],
        errors: []
    };
    
    console.log('🏗️ Creating sessions from Excel data...');
    console.log('Available participants:', participants.length);

    const newVenues = new Set();
    const existingVenueNames = new Set(venues.map(v => (v.name || '').trim()));
    
    // 비동기 처리를 위해 for...of 루프 사용
    for (let index = 0; index < parsedSessions.length; index++) {
        const sessionData = parsedSessions[index];
        
        try {
            console.log(`\n📝 Processing session ${index + 1}:`, sessionData);
            console.log(`  📋 Session abbreviation from Excel: "${sessionData.sessionAbbreviation || '(empty)'}"`);
            
            // 좌장이 필요 없는 세션 타입/제목 확인
            const noChairRequired = [
                'break', 'coffee break', 'lunch', 'lunch break',
                'opening ceremony', 'closing ceremony', 
                'general assembly', 'press conference',
                'presidential dinner', 'dinner', 'reception',
                'preparing dinner', '상임운영위원회'
            ];
            
            const sessionTitleLower = (sessionData.title || '').toLowerCase();
            const sessionTypeLower = (sessionData.sessionType || '').toLowerCase();
            const isNoChairSession = noChairRequired.some(keyword => 
                sessionTitleLower.includes(keyword) || sessionTypeLower.includes(keyword)
            );
            
            // 좌장 찾기 (이름으로 매칭) - 여러 명의 좌장 지원
            let chairParticipants = [];
            let chairNames = [];
            
            // "/"로 구분된 여러 좌장 처리
            if (sessionData.chairName && sessionData.chairName.includes('/')) {
                chairNames = sessionData.chairName.split('/').map(name => name.trim()).filter(name => name);
            } else if (sessionData.chairName) {
                chairNames = [sessionData.chairName.trim()];
            }
            
            // 좌장이 없고, 좌장이 필요한 세션인 경우만 경고
            if (chairNames.length === 0) {
                if (!isNoChairSession) {
                result.warnings.push(`세션 "${sessionData.title}": 좌장이 지정되지 않았습니다.`);
            }
                // 좌장 없이도 세션 생성 계속 진행 (continue 제거)
            } else {
                // 좌장이 있는 경우 처리
            // 각 좌장 처리
            for (let chairIdx = 0; chairIdx < chairNames.length; chairIdx++) {
                const chairName = chairNames[chairIdx];
                
                // TBD 처리
                if (chairName.toUpperCase() === 'TBD') {
                    const tempParticipant = {
                        participantId: -(Date.now() + Math.random() * 1000),
                        id: -(Date.now() + Math.random() * 1000),
                        name: 'TBD',
                        email: '',
                        affiliation: '',
                        isTemporary: true
                    };
                    chairParticipants.push(tempParticipant);
                    continue;
                }
                
                try {
                    const chairParticipant = await processSpeakerWithDuplicates(
                        { name: chairName, isSpeaker: false }, 
                        sessionData.title, 
                        -1 // 좌장은 speakerIndex -1
                    );
                    
                    if (chairParticipant) {
                        chairParticipants.push(chairParticipant);
                        console.log(`✅ Chair ${chairIdx + 1}/${chairNames.length} resolved:`, chairParticipant);
                    } else {
                        console.warn(`⚠️ Chair ${chairIdx + 1}/${chairNames.length} not found: ${chairName}`);
                    }
                } catch (error) {
                    console.error(`❌ Chair ${chairIdx + 1}/${chairNames.length} processing cancelled:`, error);
                    throw new Error(`좌장 "${chairName}" 처리가 취소되어 업로드를 중단합니다.`);
                }
            }
            }
            
            // 좌장 정보 설정 (없을 수도 있음)
            let primaryChair = null;
            let allChairNames = '';
            
            if (chairParticipants.length > 0) {
                primaryChair = chairParticipants[0];
                allChairNames = chairParticipants.map(c => c.name).join(' / ');
            }
            
            // 발표자 처리 - 비동기로 각 발표자 처리
            const processedSpeakers = [];
            console.log(`🔍 Processing ${sessionData.speakers.length} speakers for session "${sessionData.title}"`);
            console.log('📋 Speakers data:', sessionData.speakers);
            
            for (let speakerIdx = 0; speakerIdx < sessionData.speakers.length; speakerIdx++) {
                const speaker = sessionData.speakers[speakerIdx];
                console.log(`🔍 Processing speaker ${speakerIdx + 1}/${sessionData.speakers.length}:`, speaker);
                console.log(`⏳ About to call processSpeakerWithDuplicates for "${speaker.name}"`);
                
                try {
                    const speakerParticipant = await processSpeakerWithDuplicates(speaker, sessionData.title, speakerIdx);
                    console.log(`✅ processSpeakerWithDuplicates completed for "${speaker.name}":`, speakerParticipant);
                    
                    if (speakerParticipant.isTemporary) {
                        result.warnings.push(`세션 "${sessionData.title}": 발표자 "${speaker.name}"을 참가자 명단에서 찾을 수 없습니다. 임시로 추가합니다.`);
                        console.log(`✅ Added temporary speaker: ${speaker.name} (Temp ID: ${speakerParticipant.participantId})`);
                    } else {
                        console.log(`✅ Found speaker: ${speakerParticipant.name} (ID: ${speakerParticipant.id})`);
                    }
                    
                    processedSpeakers.push({
                        participantId: speakerParticipant.participantId || speakerParticipant.id,
                        name: speakerParticipant.name,
                        topic: speaker.topic,
                        startTime: speaker.startTime,
                        endTime: speaker.endTime
                    });
                    
                    console.log(`✅ Speaker ${speakerIdx + 1} processed successfully. Moving to next speaker...`);
                } catch (error) {
                    console.error(`❌ Error processing speaker ${speakerIdx + 1}:`, error);
                    result.errors.push(`세션 "${sessionData.title}": 발표자 "${speaker.name}" 처리 중 오류: ${error.message}`);
                }
            }
            
            console.log(`📊 Final processed speakers count: ${processedSpeakers.length}`);
            
            // 장소명 확장 (예: "Hanra ABC" -> ["Hanra A", "Hanra B", "Hanra C"])
            const expandedVenues = expandVenueName(sessionData.venue);
            console.log(`🏢 Venue expansion: "${sessionData.venue}" -> [${expandedVenues.join(', ')}]`);
            
            // 각 확장된 장소에 대해 세션 생성
            for (const venue of expandedVenues) {
                const trimmedVenue = (venue || '').trim();
                if (trimmedVenue && !existingVenueNames.has(trimmedVenue)) {
                    if (venues.length >= MAX_VENUE_COLUMNS) {
                        const warningMessage = `세션 "${sessionData.title}"의 장소 "${trimmedVenue}"는 현재 최대 ${MAX_VENUE_COLUMNS}개 장소 제한 때문에 자동 추가되지 않았습니다. 장소 관리에서 직접 추가해주세요.`;
                        if (!result.warnings.includes(warningMessage)) {
                            result.warnings.push(warningMessage);
                        }
                    } else {
                        venues.push({ name: trimmedVenue, description: '' });
                        existingVenueNames.add(trimmedVenue);
                        newVenues.add(trimmedVenue);
                        console.log(`🏛️ Added new venue from Excel: ${trimmedVenue}`);
                    }
                }

                const resolvedDate = normalizeDateValue(sessionData.date) ||
                    normalizeDateValue(currentSelectedDate) ||
                    (eventDates && eventDates.length > 0 ? normalizeDateValue(eventDates[0]) : '');

            const newSession = {
                sessionType: sessionData.sessionType,
                language: sessionData.language || '',
                    sessionAbbreviation: sessionData.sessionAbbreviation || '',  // 엑셀에서 가져온 원본 약어 (번호 없음)
                    displayAbbreviation: sessionData.sessionAbbreviation || '',  // 엑셀에서 가져온 약어 (나중에 번호가 붙을 수 있음)
                title: sessionData.title,
                    chairId: primaryChair ? (primaryChair.id || primaryChair.participantId) : null,
                    chair: allChairNames || '',  // 모든 좌장 이름 (예: "최훈 / 김소연"), 없으면 빈 문자열
                    chairs: chairParticipants.length > 0 ? chairParticipants : [],  // 모든 좌장 객체 배열, 없으면 빈 배열
                    venue: venue,  // 확장된 개별 장소
                startTime: sessionData.startTime,
                endTime: sessionData.endTime,
                speakers: processedSpeakers,
                color: getColorForSessionType(sessionData.sessionType),
                    date: resolvedDate || null  // CSV의 날짜 우선, 없으면 현재 선택된 날짜
            };
            
            // 세션 배열에 추가
            sessions.push(newSession);
            result.created++;
            
                console.log(`✅ Session created for venue "${venue}":`, newSession);
            }
            
        } catch (error) {
            result.errors.push(`세션 "${sessionData.title}" 생성 중 오류: ${error.message}`);
            console.error(`❌ Error creating session:`, error);
        }
    }
    
    console.log('🎉 Session creation completed:', result);
    result.newVenues = Array.from(newVenues);
    return result;
}

// ===== 표시 설정 관련 함수들 =====

// 표시 설정 모달 열기
function openDisplaySettingsModal() {
    console.log('Opening display settings modal');
    
    // 현재 설정값으로 체크박스 업데이트
    const displaySessionTypeCheckbox = document.getElementById('displaySessionType');
    const displaySessionTitleCheckbox = document.getElementById('displaySessionTitle');
    const displaySessionChairCheckbox = document.getElementById('displaySessionChair');
    const displaySessionTimeCheckbox = document.getElementById('displaySessionTime');
    const displaySpeakersCheckbox = document.getElementById('displaySpeakers');
    const displaySpeakerNameCheckbox = document.getElementById('displaySpeakerName');
    const displaySpeakerTopicCheckbox = document.getElementById('displaySpeakerTopic');
    const displaySpeakerTimeCheckbox = document.getElementById('displaySpeakerTime');
    const chairNameLanguageSelect = document.getElementById('chairNameLanguage');
    const speakerNameLanguageSelect = document.getElementById('speakerNameLanguage');
    
    displaySessionTypeCheckbox.checked = displaySettings.showSessionType;
    displaySessionTitleCheckbox.checked = displaySettings.showSessionTitle;
    displaySessionChairCheckbox.checked = displaySettings.showSessionChair;
    displaySessionTimeCheckbox.checked = displaySettings.showSessionTime;
    displaySpeakersCheckbox.checked = displaySettings.showSpeakers;
    displaySpeakerNameCheckbox.checked = displaySettings.showSpeakerName;
    displaySpeakerTopicCheckbox.checked = displaySettings.showSpeakerTopic;
    displaySpeakerTimeCheckbox.checked = displaySettings.showSpeakerTime;
    
    if (chairNameLanguageSelect) {
        chairNameLanguageSelect.value = displaySettings.chairNameLanguage || 'kor';
    }
    if (speakerNameLanguageSelect) {
        speakerNameLanguageSelect.value = displaySettings.speakerNameLanguage || 'kor';
    }
    
    displaySpeakersCheckbox.onchange = () => {
        toggleSpeakerDetailsOptions();
        updateSpeakerNameOptionState();
    };
    displaySpeakerNameCheckbox.onchange = () => {
        updateSpeakerNameOptionState();
    };
    displaySessionChairCheckbox.onchange = () => {
        updateChairNameOptionState();
    };
    
    // 발표자 목록 체크 여부에 따라 세부 옵션 표시/숨김 및 상태 업데이트
    toggleSpeakerDetailsOptions();
    updateChairNameOptionState();
    updateSpeakerNameOptionState();
    
    document.getElementById('displaySettingsModal').style.display = 'block';
}

// 발표자 세부 옵션 표시/숨김
function toggleSpeakerDetailsOptions() {
    const showSpeakers = document.getElementById('displaySpeakers').checked;
    const detailsOptions = document.getElementById('speakerDetailsOptions');
    detailsOptions.style.display = showSpeakers ? 'block' : 'none';
}

function updateChairNameOptionState() {
    const chairCheckbox = document.getElementById('displaySessionChair');
    const chairSelect = document.getElementById('chairNameLanguage');
    if (!chairSelect || !chairCheckbox) return;
    
    const isEnabled = chairCheckbox.checked;
    chairSelect.disabled = !isEnabled;
    if (chairSelect.parentElement) {
        chairSelect.parentElement.classList.toggle('disabled', !isEnabled);
        chairSelect.parentElement.style.opacity = isEnabled ? '1' : '0.5';
        chairSelect.parentElement.style.pointerEvents = isEnabled ? 'auto' : 'none';
    }
}

function updateSpeakerNameOptionState() {
    const showSpeakersCheckbox = document.getElementById('displaySpeakers');
    const speakerNameCheckbox = document.getElementById('displaySpeakerName');
    const speakerSelect = document.getElementById('speakerNameLanguage');
    if (!speakerSelect || !showSpeakersCheckbox || !speakerNameCheckbox) return;
    
    const isEnabled = showSpeakersCheckbox.checked && speakerNameCheckbox.checked;
    speakerSelect.disabled = !isEnabled;
    if (speakerSelect.parentElement) {
        speakerSelect.parentElement.classList.toggle('disabled', !isEnabled);
        speakerSelect.parentElement.style.opacity = isEnabled ? '1' : '0.5';
        speakerSelect.parentElement.style.pointerEvents = isEnabled ? 'auto' : 'none';
    }
}

// 표시 설정 모달 닫기
function closeDisplaySettingsModal() {
    document.getElementById('displaySettingsModal').style.display = 'none';
}

// 표시 설정 저장 및 적용
function saveDisplaySettings() {
    console.log('Saving display settings');
    
    // 체크박스 값 읽기
    displaySettings.showSessionType = document.getElementById('displaySessionType').checked;
    displaySettings.showSessionTitle = document.getElementById('displaySessionTitle').checked;
    displaySettings.showSessionChair = document.getElementById('displaySessionChair').checked;
    displaySettings.showSessionTime = document.getElementById('displaySessionTime').checked;
    displaySettings.showSpeakers = document.getElementById('displaySpeakers').checked;
    displaySettings.showSpeakerName = document.getElementById('displaySpeakerName').checked;
    displaySettings.showSpeakerTopic = document.getElementById('displaySpeakerTopic').checked;
    displaySettings.showSpeakerTime = document.getElementById('displaySpeakerTime').checked;
    displaySettings.chairNameLanguage = document.getElementById('chairNameLanguage').value;
    displaySettings.speakerNameLanguage = document.getElementById('speakerNameLanguage').value;
    
    console.log('New display settings:', displaySettings);
    
    // 로컬 스토리지에 저장
    localStorage.setItem('sessionDisplaySettings', JSON.stringify(displaySettings));
    
    // 세션 블록 다시 렌더링
    renderSessions();
    
    // 모달 닫기
    closeDisplaySettingsModal();
}

// 표시 설정 로드
function loadDisplaySettings() {
    const saved = localStorage.getItem('sessionDisplaySettings');
    if (saved) {
        try {
            const parsedSettings = JSON.parse(saved);
            displaySettings = {
                ...displaySettings,
                ...parsedSettings
            };
            console.log('Loaded display settings:', displaySettings);
        } catch (error) {
            console.error('Error loading display settings:', error);
        }
    }
}

// ===== 참가자 빠른 추가 관련 함수들 =====

let currentMissingPerson = null; // 현재 추가 대기 중인 사람 정보

let currentConfirmResolve = null; // 확인 모달의 resolve 함수 저장

// 참가자 없을 때 사용자 확인
function confirmAddMissingParticipant(name, role, sessionTitle) {
    return new Promise((resolve) => {
        console.log(`❓ Asking user about missing participant: ${name}`);
        
        // 확인 모달에 정보 표시
        document.getElementById('confirmMissingName').textContent = name;
        document.getElementById('confirmMissingRole').textContent = role;
        document.getElementById('confirmMissingSession').textContent = sessionTitle;
        
        // 검색창 초기화 및 자동 검색
        const searchInput = document.getElementById('confirmModalSearchInput');
        const searchResults = document.getElementById('confirmModalSearchResults');
        
        searchInput.value = name; // 찾을 수 없었던 이름을 자동으로 입력
        searchResults.innerHTML = '';
        searchResults.style.display = 'none';
        
        // resolve 함수 저장
        currentConfirmResolve = resolve;
        
        // 임시로 currentMissingPerson 설정 (나중에 추가 모달에서 사용)
        currentMissingPerson = {
            name: name,
            role: role,
            sessionTitle: sessionTitle
        };
        
        // 확인 모달 표시
        const modal = document.getElementById('confirmMissingParticipantModal');
        modal.style.display = 'block';
        modal.style.zIndex = '10000';
        
        // 검색창에 포커스 (약간의 딜레이 후)
        setTimeout(() => {
            searchInput.focus();
            searchInput.select(); // 텍스트 선택
            searchInConfirmModal(); // 자동 검색 실행
        }, 100);
    });
}

// 참가자 추가 진행 (확인 모달에서 "예" 클릭)
function proceedToAddParticipant() {
    console.log('✅ User chose to add participant');
    
    // 확인 모달 닫기
    document.getElementById('confirmMissingParticipantModal').style.display = 'none';
    
    // resolve('add') 호출
    if (currentConfirmResolve) {
        currentConfirmResolve('add');
        currentConfirmResolve = null;
    }
}

// 참가자 추가 건너뛰기 (확인 모달에서 "아니오" 클릭)
function skipMissingParticipant() {
    console.log('⏭️ User chose to skip participant');
    
    // 확인 모달 닫기
    document.getElementById('confirmMissingParticipantModal').style.display = 'none';
    
    // resolve('skip') 호출
    if (currentConfirmResolve) {
        currentConfirmResolve('skip');
        currentConfirmResolve = null;
    }
    
    // currentMissingPerson 초기화
    currentMissingPerson = null;
}
// 확인 모달 내에서 참가자 검색 (실시간)
function searchInConfirmModal() {
    const searchTerm = document.getElementById('confirmModalSearchInput').value.trim();
    const resultsContainer = document.getElementById('confirmModalSearchResults');
    
    if (!searchTerm) {
        // 검색어가 없으면 결과 숨김
        resultsContainer.innerHTML = '';
        resultsContainer.style.display = 'none';
        return;
    }
    
    // 개선된 findParticipantsByName 함수 사용 (대소문자, 하이픈, 공백 무시)
    const results = findParticipantsByName(searchTerm);
    
    // 결과 정렬 (이름순)
    results.sort((a, b) => {
        const nameA = (a.name_kor || a.name_eng || a.name || '').toLowerCase();
        const nameB = (b.name_kor || b.name_eng || b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
    });
    
    // 결과 표시
    if (results.length === 0) {
        resultsContainer.style.display = 'block';
        resultsContainer.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #999;">
                <i class="fas fa-user-slash" style="font-size: 24px; margin-bottom: 10px;"></i>
                <p>검색 결과가 없습니다</p>
            </div>
        `;
    } else {
        resultsContainer.style.display = 'block';
        
        // 최대 10개만 표시
        const displayResults = results.slice(0, 10);
        const hasMore = results.length > 10;
        
        resultsContainer.innerHTML = displayResults.map(p => {
            // 이름 정보 추출
            const nameKor = p.name_kor || '';
            const nameEng = p.name_eng || (p.first_name && p.family_name ? `${p.first_name} ${p.family_name}`.trim() : '') || '';
            const nameGeneric = p.name || '';
            
            // 주 이름: 한글 우선, 없으면 영문, 둘 다 없으면 일반 name 필드
            let primaryName = nameKor || nameEng || nameGeneric || '이름 없음';
            
            // 부가 이름: 주 이름과 다른 영문 이름이 있으면 표시
            let secondaryName = '';
            if (nameKor && nameEng) {
                // 한글 이름이 주 이름이고 영문 이름이 있으면 영문 이름을 부가로 표시
                secondaryName = nameEng;
            } else if (!nameKor && !nameEng && nameGeneric) {
                // name 필드만 있는 경우 (한글/영문 구분 없음)
                primaryName = nameGeneric;
            }
            
            const email = p.email || '';
            const affiliation = p.affiliation || p.affiliation_kor || '';
            
            // 검색어 하이라이트
            const highlightText = (text) => {
                if (!text) return '';
                const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                return text.replace(regex, '<mark style="background-color: #fff3cd; padding: 0 2px;">$1</mark>');
            };
            
            return `
                <div class="confirm-search-result-item" onclick="selectFromConfirmModal(${p.id || p.participantId})">
                    <div style="font-weight: 600; color: #333; margin-bottom: 4px;">
                        ${highlightText(primaryName)}
                    </div>
                    ${secondaryName ? `<div style="font-size: 13px; color: #555; margin-bottom: 2px;">${highlightText(secondaryName)}</div>` : ''}
                    ${email ? `<div style="font-size: 12px; color: #666;">${highlightText(email)}</div>` : ''}
                    ${affiliation ? `<div style="font-size: 12px; color: #999;">${highlightText(affiliation)}</div>` : ''}
                </div>
            `;
        }).join('') + (hasMore ? `<p style="text-align: center; color: #999; padding: 10px; font-size: 12px;">더 많은 결과가 있습니다 (${results.length}명 중 10명 표시)</p>` : '');
    }
}

// 확인 모달에서 검색 결과 선택
function selectFromConfirmModal(participantId) {
    const participant = participants.find(p => p.id === participantId || p.participantId === participantId);
    
    if (!participant) {
        console.error('Participant not found:', participantId);
        return;
    }
    
    console.log(`✅ User selected participant from confirm modal search:`, participant);
    
    // 확인 모달 닫기
    document.getElementById('confirmMissingParticipantModal').style.display = 'none';
    
    // currentConfirmResolve로 참가자 전달
    if (currentConfirmResolve) {
        currentConfirmResolve(participant);
        currentConfirmResolve = null;
    }
    
    // currentMissingPerson 초기화
    currentMissingPerson = null;
}

// 참가자 추가 모달 표시
function showAddParticipantModal(name, role, sessionTitle) {
    return new Promise((resolve, reject) => {
        console.log(`📋 Showing add participant modal for "${name}" (${role}) in session "${sessionTitle}"`);
        
        currentMissingPerson = {
            name: name,
            role: role,
            sessionTitle: sessionTitle,
            resolve: resolve,
            reject: reject
        };
        
        // 모달에 정보 표시
        document.getElementById('missingPersonName').textContent = name;
        document.getElementById('missingPersonRole').textContent = role;
        document.getElementById('missingPersonSession').textContent = sessionTitle;
        
        // 폼 초기화 및 자동 입력
        document.getElementById('quickAddEmail').value = '';
        document.getElementById('quickAddAffiliation').value = '';
        // 영문 이름 필드에 표시된 이름을 자동으로 채움
        document.getElementById('quickAddNameEng').value = name;
        
        // 모달 표시
        document.getElementById('addParticipantModal').style.display = 'block';
    });
}

// 참가자 추가 모달 닫기
function closeAddParticipantModal() {
    document.getElementById('addParticipantModal').style.display = 'none';
    currentMissingPerson = null;
}

// 참가자 빠른 추가
async function quickAddParticipant() {
    if (!currentMissingPerson) {
        console.error('No missing person data available');
        return;
    }
    
    const email = document.getElementById('quickAddEmail').value.trim();
    const affiliation = document.getElementById('quickAddAffiliation').value.trim();
    const nameEng = document.getElementById('quickAddNameEng').value.trim();
    
    if (!email) {
        alert('이메일을 입력해주세요.');
        return;
    }
    
    console.log(`👤 Adding participant: ${currentMissingPerson.name}`);
    
    try {
        const eventId = document.body.getAttribute('data-event-id');
        
        // 서버에 참가자 추가 요청
        const response = await fetch(`/api/event/${eventId}/participants`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: currentMissingPerson.name,
                email: email,
                affiliation: affiliation,
                name_eng: nameEng,
                phone: ''
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `서버 오류 (${response.status})`);
        }
        
        const data = await response.json();
        console.log(`✅ Server response:`, data);
        
        if (data.success && data.participant) {
            console.log(`✅ Participant added successfully:`, data.participant);
            
            // participants 배열에 추가
            const newParticipant = {
                id: data.participant.id,
                participantId: data.participant.id,
                name: data.participant.name,
                name_kor: data.participant.name,
                email: data.participant.email,
                affiliation: data.participant.affiliation || '',
                affiliation_kor: data.participant.affiliation || '',
                name_eng: data.participant.name_eng || ''
            };
            
            participants.push(newParticipant);
            console.log(`✅ Added to participants array. Total: ${participants.length}`);
            
            // Promise resolve with new participant (showAddParticipantModal의 resolve 호출)
            if (currentMissingPerson && currentMissingPerson.resolve) {
                console.log(`✅ Resolving showAddParticipantModal promise with new participant`);
                currentMissingPerson.resolve(newParticipant);
            }
            
            // 모달 닫기
            closeAddParticipantModal();
            
            alert(`✅ ${newParticipant.name}님이 참가자로 추가되었습니다.`);
        } else {
            throw new Error(data.error || data.message || '참가자 추가 실패');
        }
    } catch (error) {
        console.error('Error adding participant:', error);
        alert(`참가자 추가 중 오류가 발생했습니다: ${error.message}`);
    }
}

// 참가자 검색 모달 표시 (엑셀 업로드용)
function showParticipantSearch() {
    if (!currentMissingPerson) {
        console.error('No missing person data available');
        return;
    }
    
    console.log(`🔍 Opening excel participant search for "${currentMissingPerson.name}"`);
    
    // 원본 이름 표시
    document.getElementById('excelSearchOriginalName').textContent = currentMissingPerson.name;
    
    // 검색 입력창 초기화
    document.getElementById('excelParticipantSearchInput').value = '';
    
    // 참가자 추가 모달 숨기기
    document.getElementById('addParticipantModal').style.display = 'none';
    
    // 검색 모달 표시
    const searchModal = document.getElementById('excelParticipantSearchModal');
    searchModal.style.display = 'block';
    searchModal.style.zIndex = '10003';
    searchModal.style.position = 'fixed';
    
    // 모달 컨텐츠도 강제 설정
    const searchModalContent = searchModal.querySelector('.modal-content');
    if (searchModalContent) {
        searchModalContent.style.zIndex = '10004';
        searchModalContent.style.position = 'relative';
    }
    
    // 전체 참가자 표시 (초기 상태)
    searchExcelParticipants();
    
    // 검색창에 포커스
    setTimeout(() => {
        document.getElementById('excelParticipantSearchInput').focus();
    }, 100);
}

// 참가자 검색 모달 닫기 (엑셀 업로드용)
function closeExcelParticipantSearchModal() {
    document.getElementById('excelParticipantSearchModal').style.display = 'none';
    
    // 참가자 추가 모달 다시 표시
    if (currentMissingPerson) {
        document.getElementById('addParticipantModal').style.display = 'block';
    }
}

// 검색 모달에서 추가 모달로 전환
function switchToAddParticipant() {
    console.log('Switching from search to add participant modal');
    
    // 검색 모달 닫기
    document.getElementById('excelParticipantSearchModal').style.display = 'none';
    
    // 참가자 추가 모달 표시
    if (currentMissingPerson) {
        const addModal = document.getElementById('addParticipantModal');
        addModal.style.display = 'block';
        
        // 원본 이름을 이메일 필드에 포커스
        setTimeout(() => {
            document.getElementById('quickAddEmail').focus();
        }, 100);
    }
}
// 참가자 검색 수행 (엑셀 업로드용 - 실시간)
function searchExcelParticipants() {
    const originalSearchTerm = document.getElementById('excelParticipantSearchInput').value.trim();
    const searchTerm = originalSearchTerm.toLowerCase();
    const resultsContainer = document.getElementById('excelSearchResults');
    
    // 한글/영문 구분
    const isEnglish = /^[a-zA-Z\s\.\-]+$/.test(originalSearchTerm);
    const isKorean = /[가-힣]/.test(originalSearchTerm);
    
    let results;
    
    if (!searchTerm) {
        // 검색어가 없으면 전체 참가자 표시 (이름순 정렬)
        results = [...participants].sort((a, b) => {
            const nameA = (a.name_kor || a.name_eng || a.name || '').toLowerCase();
            const nameB = (b.name_kor || b.name_eng || b.name || '').toLowerCase();
            return nameA.localeCompare(nameB);
        });
    } else {
        // 검색어가 있으면 필터링 (언어별)
        results = participants.filter(p => {
            if (isEnglish) {
                // 영문 검색: name_eng, first_name, family_name
                const engName = (p.name_eng || '').toLowerCase();
                const firstName = (p.first_name || '').toLowerCase();
                const familyName = (p.family_name || '').toLowerCase();
                const fullName = `${firstName} ${familyName}`.trim().toLowerCase();
                const email = (p.email || '').toLowerCase();
                
                return engName.includes(searchTerm) || 
                       firstName.includes(searchTerm) ||
                       familyName.includes(searchTerm) ||
                       fullName.includes(searchTerm) ||
                       email.includes(searchTerm);
            } else if (isKorean) {
                // 한글 검색: name_kor, name (한글일 경우)
                const korName = (p.name_kor || '').toLowerCase();
                const nameField = (p.name || '').toLowerCase();
                const isNameKorean = /[가-힣]/.test(p.name || '');
                const email = (p.email || '').toLowerCase();
                
                return (isNameKorean && nameField.includes(searchTerm)) ||
                       korName.includes(searchTerm) ||
                       email.includes(searchTerm);
            } else {
                // 기타: 모든 필드 검색
                const name = (p.name || p.name_kor || '').toLowerCase();
                const email = (p.email || '').toLowerCase();
                const affiliation = (p.affiliation_kor || p.affiliation || '').toLowerCase();
                const nameEng = (p.name_eng || '').toLowerCase();
                const firstName = (p.first_name || '').toLowerCase();
                const familyName = (p.family_name || '').toLowerCase();
                
                return name.includes(searchTerm) || 
                       email.includes(searchTerm) || 
                       affiliation.includes(searchTerm) ||
                       nameEng.includes(searchTerm) ||
                       firstName.includes(searchTerm) ||
                       familyName.includes(searchTerm);
            }
        });
        
        // 검색어와의 관련성으로 정렬 (이름에 포함된 것이 우선)
        results.sort((a, b) => {
            let nameA, nameB;
            if (isEnglish) {
                nameA = (a.name_eng || `${a.first_name} ${a.family_name}`.trim() || '').toLowerCase();
                nameB = (b.name_eng || `${b.first_name} ${b.family_name}`.trim() || '').toLowerCase();
            } else if (isKorean) {
                nameA = (a.name_kor || (a.name && /[가-힣]/.test(a.name) ? a.name : '') || '').toLowerCase();
                nameB = (b.name_kor || (b.name && /[가-힣]/.test(b.name) ? b.name : '') || '').toLowerCase();
            } else {
                nameA = (a.name || a.name_kor || '').toLowerCase();
                nameB = (b.name || b.name_kor || '').toLowerCase();
            }
            
            const aStartsWith = nameA.startsWith(searchTerm);
            const bStartsWith = nameB.startsWith(searchTerm);
            
            if (aStartsWith && !bStartsWith) return -1;
            if (!aStartsWith && bStartsWith) return 1;
            return nameA.localeCompare(nameB);
        });
    }
    
    console.log(`🔍 Found ${results.length} participants matching "${searchTerm || '(all)'}"`);
    
    if (results.length === 0) {
        resultsContainer.innerHTML = `
            <div class="search-no-results">
                <i class="fas fa-user-slash"></i>
                <p>검색 결과가 없습니다</p>
                <small>"${searchTerm}" 와 일치하는 참가자가 없습니다</small>
                <div style="margin-top: 20px;">
                    <button class="btn btn-primary" onclick="switchToAddParticipant()">
                        <i class="fas fa-user-plus"></i> 새 참가자로 추가하기
                    </button>
                </div>
            </div>
        `;
        return;
    }
    
    // 검색 결과 표시 (최대 50명까지만 표시)
    const displayResults = results.slice(0, 50);
    const hasMore = results.length > 50;
    
    resultsContainer.innerHTML = displayResults.map(p => {
        const name = p.name || p.name_kor || '이름 없음';
        const email = p.email || '이메일 없음';
        const affiliation = p.affiliation_kor || p.affiliation || '';
        
        // 검색어 하이라이트
        let highlightedName = name;
        if (searchTerm) {
            const regex = new RegExp(`(${searchTerm})`, 'gi');
            highlightedName = name.replace(regex, '<span style="background-color: #fff3cd; font-weight: 700;">$1</span>');
        }
        
        return `
            <div class="search-result-item" onclick="selectExcelSearchedParticipant(${p.id})">
                <div class="search-result-name">${highlightedName}</div>
                <div class="search-result-email">${email}</div>
                ${affiliation ? `<div class="search-result-affiliation">${affiliation}</div>` : ''}
            </div>
        `;
    }).join('') + (hasMore ? `<p style="text-align: center; color: #999; padding: 10px; font-size: 12px;">더 많은 결과가 있습니다 (${results.length}명 중 50명 표시)</p>` : '');
}

// 검색된 참가자 선택 (엑셀 업로드용)
function selectExcelSearchedParticipant(participantId) {
    const participant = participants.find(p => p.id === participantId || p.participantId === participantId);
    
    if (!participant) {
        console.error('Participant not found:', participantId);
        return;
    }
    
    console.log(`✅ User selected participant from excel search:`, participant);
    
    // 모달 닫기
    closeExcelParticipantSearchModal();
    
    // 참가자 추가 모달도 닫기 (만약 열려있다면)
    closeAddParticipantModal();
    
    // currentConfirmResolve가 있으면 바로 resolve (참가자 객체 전달)
    if (currentConfirmResolve) {
        console.log('✅ Resolving with selected participant from search');
        currentConfirmResolve(participant);
        currentConfirmResolve = null;
    }
    
    // currentMissingPerson 초기화
    currentMissingPerson = null;
}