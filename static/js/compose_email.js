async function sendEmail(event) {
    event.preventDefault();
    const form = event.target;
    const editor = document.getElementById('editor');
    const bodyInput = document.getElementById('body');
    const loadingDiv = document.getElementById('loading');
    const loadingIcon = document.getElementById('loading-icon');
    const loadingText = document.getElementById('loading-text');
    const submitButton = form.querySelector('button[type="submit"]');

    bodyInput.value = editor.innerHTML;

    // 로딩 상태 표시
    loadingDiv.style.display = 'block';
    loadingIcon.className = 'spinner'; // 클래스 재설정
    loadingText.textContent = '이메일 발송 중...';
    submitButton.disabled = true;

    const formData = new FormData(form);
    try {
        const response = await fetch(form.action, {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        if (result.status === "success") {
            loadingIcon.className = 'success-icon'; // 성공 시 체크마크로 변경
            loadingText.textContent = '이메일 발송 완료!';
            loadingDiv.classList.add('success');
            setTimeout(() => {
                alert("이메일이 성공적으로 발송되었습니다!");
                window.close();
            }, 500);
        } else {
            loadingDiv.style.display = 'none';
            alert(result.message);
            submitButton.disabled = false;
        }
    } catch (error) {
        loadingDiv.style.display = 'none';
        alert("이메일 발송 중 오류가 발생했습니다.");
        submitButton.disabled = false;
    }
}

// 이미지 wrapper를 추적하기 위한 맵 (compose_email.js용)
const imageWrapperMapEditor = new Map();

// 이미지 리사이즈 기능 (compose_email.js용 - Gmail 스타일)
function setupImageResizeForEditor(img, editor) {
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
    imageWrapperMapEditor.set(imageSrc, wrapper);
    
    wrapper.setAttribute('draggable', 'true');
    
    img.style.display = 'block';
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    img.style.cursor = 'move';
    img.style.userSelect = 'none';
    img.style.margin = '0';
    img.setAttribute('draggable', 'false'); // 이미지는 드래그 불가, wrapper만 드래그 가능
    
    // wrapper의 dragstart 이벤트 - 실제 드래그는 wrapper에서 처리
    wrapper.addEventListener('dragstart', function(e) {
        // 리사이즈 핸들이나 삭제 버튼이 아닐 때만 드래그 허용
        if (!e.target.closest('.image-resize-handle') && !e.target.closest('.image-delete-btn')) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', wrapper.outerHTML);
            e.dataTransfer.setData('text/plain', imageSrc);
            wrapper.style.opacity = '0.5';
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
            ensureWrapperStructureInEditor(wrapper);
            selectImageInEditor(wrapper);
        }, 50);
        setTimeout(() => {
            ensureWrapperStructureInEditor(wrapper);
            selectImageInEditor(wrapper);
        }, 150);
        setTimeout(() => {
            ensureWrapperStructureInEditor(wrapper);
            selectImageInEditor(wrapper);
            justDragged = false;
        }, 300);
    });
    
    let justDragged = false;
    
    // drop 이벤트는 editor 레벨에서 처리하므로 wrapper 레벨에서는 제거
    
    if (img.parentNode) {
        img.parentNode.insertBefore(wrapper, img);
    }
    wrapper.appendChild(img);
    
    // Gmail 스타일 리사이즈 핸들 생성 (8개)
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
            startImageResizeInEditor(wrapper, img, e, handle.resizeType);
            return false;
        });
        
        resizeHandle.style.pointerEvents = 'auto';
        
        wrapper.appendChild(resizeHandle);
    });
    
    wrapper._clickHandler = function(e) {
        if (!e.target.closest('.image-resize-handle') && !e.target.closest('.image-delete-btn')) {
            e.stopPropagation();
            e.stopImmediatePropagation();
            selectImageInEditor(wrapper);
            justDragged = false;
        }
    };
    wrapper.addEventListener('click', wrapper._clickHandler, true);
    
    wrapper._mousedownHandler = function(e) {
        if (!e.target.closest('.image-resize-handle') && !e.target.closest('.image-delete-btn')) {
            e.stopPropagation();
        }
    };
    wrapper.addEventListener('mousedown', wrapper._mousedownHandler, true);
    
    let isDragging = false;
    let dragEndTime = 0;
    let draggedWrapper = null;
    let draggedImageSrc = null;
    
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
        const timeSinceDragEnd = Date.now() - dragEndTime;
        if (!isDragging && timeSinceDragEnd > 500 && !e.target.closest('.image-wrapper')) {
            deselectAllImagesInEditor();
        }
    });
    
    editor.addEventListener('drop', function(e) {
        console.log('Drop event:', draggedImageSrc);
        
        // 이미지 wrapper를 드래그 중이면 항상 preventDefault
        if (draggedImageSrc) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            // 드래그된 wrapper 찾기
            let draggedWrapperElement = draggedWrapper || imageWrapperMapEditor.get(draggedImageSrc);
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
            
            setTimeout(() => {
                let targetWrapper = draggedWrapperElement || imageWrapperMapEditor.get(draggedImageSrc);
                
                if (!targetWrapper || !document.contains(targetWrapper)) {
                    const allWrappers = editor.querySelectorAll('.image-wrapper');
                    for (const wrapper of allWrappers) {
                        const img = wrapper.querySelector('img');
                        if (img && img.src === draggedImageSrc) {
                            targetWrapper = wrapper;
                            imageWrapperMapEditor.set(draggedImageSrc, wrapper);
                            break;
                        }
                    }
                }
                
                if (targetWrapper) {
                    ensureWrapperStructureInEditor(targetWrapper);
                    selectImageInEditor(targetWrapper);
                    
                    setTimeout(() => {
                        ensureWrapperStructureInEditor(targetWrapper);
                        selectImageInEditor(targetWrapper);
                    }, 50);
                    setTimeout(() => {
                        ensureWrapperStructureInEditor(targetWrapper);
                        selectImageInEditor(targetWrapper);
                    }, 150);
                    setTimeout(() => {
                        ensureWrapperStructureInEditor(targetWrapper);
                        selectImageInEditor(targetWrapper);
                    }, 300);
                }
                
                isDragging = false;
            }, 10);
        } else {
            return; // 이미지가 아니면 기본 동작 허용
        }
    }, true);
    
    // MutationObserver 추가
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) {
                        // 새로 추가된 이미지가 wrapper 없이 추가되었는지 확인
                        if (node.tagName === 'IMG' && !node.closest('.image-wrapper')) {
                            const imgSrc = node.src;
                            const existingWrapper = imageWrapperMapEditor.get(imgSrc);
                            if (existingWrapper && document.contains(existingWrapper)) {
                                return;
                            }
                            // wrapper 없이 추가된 이미지는 wrapper로 감싸기
                            setTimeout(() => {
                                if (node.parentNode && !node.closest('.image-wrapper')) {
                                    setupImageResizeForEditor(node, editor);
                                }
                            }, 10);
                        }
                        
                        const wrapper = node.classList?.contains('image-wrapper') ? node : node.querySelector?.('.image-wrapper');
                        if (wrapper) {
                            ensureWrapperStructureInEditor(wrapper);
                        }
                    }
                });
                
                mutation.removedNodes.forEach(function(node) {
                    if (node.nodeType === 1 && node.classList?.contains('image-wrapper')) {
                        const img = node.querySelector('img');
                        if (img && img.src) {
                            imageWrapperMapEditor.delete(img.src);
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
function ensureWrapperStructureInEditor(wrapper) {
    if (!wrapper || !document.contains(wrapper)) return;
    
    // 이미지가 wrapper 안에 있는지 확인
    let img = wrapper.querySelector('img');
    if (!img) {
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
        imageWrapperMapEditor.set(img.src, wrapper);
    }
    
    // 리사이즈 핸들 확인 및 재설정
    let resizeHandles = wrapper.querySelectorAll('.image-resize-handle');
    if (resizeHandles.length < 8) {
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
        
        resizeHandles.forEach(handle => handle.remove());
        
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
                startImageResizeInEditor(wrapper, img, e, handle.resizeType);
                return false;
            });
            
            resizeHandle.style.pointerEvents = 'auto';
            wrapper.appendChild(resizeHandle);
        });
    }
    
    // 삭제 버튼 확인 및 위치 재설정
    let deleteBtn = wrapper.querySelector('.image-delete-btn');
    if (!deleteBtn) {
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
            if (imgSrc) imageWrapperMapEditor.delete(imgSrc);
            wrapper.remove();
        });
        
        wrapper.appendChild(deleteBtn);
    } else {
        deleteBtn.style.position = 'absolute';
        deleteBtn.style.top = '-12px';
        deleteBtn.style.right = '-12px';
    }
    
    // 클릭 이벤트 리스너 재설정
    if (wrapper._clickHandler) {
        wrapper.removeEventListener('click', wrapper._clickHandler, true);
    }
    wrapper._clickHandler = function(e) {
        if (!e.target.closest('.image-resize-handle') && !e.target.closest('.image-delete-btn')) {
            e.stopPropagation();
            e.stopImmediatePropagation();
            selectImageInEditor(wrapper);
        }
    };
    wrapper.addEventListener('click', wrapper._clickHandler, true);
    
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

function selectImageInEditor(wrapper) {
    if (!wrapper || !document.contains(wrapper)) return;
    
    ensureWrapperStructureInEditor(wrapper);
    
    deselectAllImagesInEditor();
    wrapper.classList.add('image-selected');
    const resizeHandles = wrapper.querySelectorAll('.image-resize-handle');
    const deleteBtn = wrapper.querySelector('.image-delete-btn');
    resizeHandles.forEach(handle => handle.style.display = 'block');
    if (deleteBtn) {
        deleteBtn.style.display = 'block';
        deleteBtn.style.position = 'absolute';
        deleteBtn.style.top = '-12px';
        deleteBtn.style.right = '-12px';
    }
}

function deselectAllImagesInEditor() {
    const selectedImages = document.querySelectorAll('.image-selected');
    selectedImages.forEach(wrapper => {
        wrapper.classList.remove('image-selected');
        const resizeHandles = wrapper.querySelectorAll('.image-resize-handle');
        const deleteBtn = wrapper.querySelector('.image-delete-btn');
        resizeHandles.forEach(handle => handle.style.display = 'none');
        if (deleteBtn) deleteBtn.style.display = 'none';
    });
}

function startImageResizeInEditor(wrapper, img, e, resizeType) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = img.offsetWidth || img.naturalWidth;
    const startHeight = img.offsetHeight || img.naturalHeight;
    const aspectRatio = startWidth / startHeight;
    const maintainAspectRatio = ['nw', 'ne', 'sw', 'se'].includes(resizeType);
    
    wrapper.classList.add('resizing');
    document.body.style.userSelect = 'none';
    
    const originalZIndex = wrapper.style.zIndex;
    wrapper.style.zIndex = '1';
    
    function resize(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const diffX = e.clientX - startX;
        const diffY = e.clientY - startY;
        
        let newWidth = startWidth;
        let newHeight = startHeight;
        
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
        
        if (maintainAspectRatio) {
            if (Math.abs(diffX) > Math.abs(diffY)) {
                newHeight = newWidth / aspectRatio;
            } else {
                newWidth = newHeight * aspectRatio;
            }
        }
        
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
        wrapper.style.zIndex = originalZIndex || '';
    }
    
    document.addEventListener('mousemove', resize, { passive: false });
    document.addEventListener('mouseup', stopResize, { once: true, passive: false });
    
    const cursorMap = {
        'nw': 'nwse-resize', 'n': 'ns-resize', 'ne': 'nesw-resize',
        'e': 'ew-resize', 'se': 'nwse-resize', 's': 'ns-resize',
        'sw': 'nesw-resize', 'w': 'ew-resize'
    };
    document.body.style.cursor = cursorMap[resizeType] || 'nwse-resize';
    
    return false;
}

window.onload = function () {
    window.resizeTo(800, 700); // Set window size to be large enough for the content

    const editor = document.getElementById('editor');

    // 붙여넣기 이벤트 처리
    editor.addEventListener('paste', async (event) => {
        const clipboardData = event.clipboardData || window.clipboardData;
        const items = clipboardData.items;
        
        // 먼저 HTML 텍스트 확인 (워드 문서 등)
        const htmlData = clipboardData.getData('text/html');
        if (htmlData) {
            // HTML이 있으면 기본 동작 허용 (브라우저가 자동으로 처리)
            // 단, 이미지만 있는 경우는 제외
            const hasImageOnly = htmlData.match(/<img[^>]*>/i) && !htmlData.match(/<[^>]+>/g) || htmlData.match(/<img[^>]*>/g)?.length === htmlData.match(/<[^>]+>/g)?.length;
            if (!hasImageOnly) {
                // HTML 텍스트가 있으면 기본 동작 허용
                // 붙여넣기 후 wrapper 없이 추가된 이미지 확인
                setTimeout(() => {
                    const images = editor.querySelectorAll('img:not(.image-wrapper img)');
                    images.forEach(img => {
                        if (!img.closest('.image-wrapper')) {
                            setupImageResizeForEditor(img, editor);
                        }
                    });
                }, 100);
                return;
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
                event.preventDefault();
                hasImage = true;
                const file = item.getAsFile();
                const formData = new FormData();
                formData.append('image', file);

                const response = await fetch('/upload_image', {
                    method: 'POST',
                    body: formData
                });
                const result = await response.json();

                if (result.status === 'success') {
                    const img = document.createElement('img');
                    img.src = result.image_url;
                    
                    img.onload = function() {
                        const wrapper = setupImageResizeForEditor(img, editor);
                        editor.appendChild(wrapper);
                        setTimeout(() => {
                            selectImageInEditor(wrapper);
                        }, 100);
                    };
                    
                    img.onerror = function() {
                        alert('이미지를 불러올 수 없습니다.');
                    };
                } else {
                    alert(result.message);
                }
                break;
            }
        }
        
        // 이미지가 없고 HTML도 없으면 기본 동작 허용
        if (!hasImage && !htmlData) {
            return;
        }
    });

    // 텍스트 입력 시 줄바꿈 처리
    editor.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            const br = document.createElement('br');
            editor.appendChild(br);
            // 커서를 줄바꿈 후로 이동
            const range = document.createRange();
            const sel = window.getSelection();
            range.setStartAfter(br);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
        }
    });
};
