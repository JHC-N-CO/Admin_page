(function () {
  const eventId = document.body.dataset.eventId;
  const logoutUrl = document.body.dataset.logoutUrl;
  const listEl = document.getElementById('arPortalList');

  const CRITERIA = [
    { key: 'originality', label: '발표 주제의 참신성 (최대 10점)' },
    { key: 'methodology', label: '연구 방법의 타당성 (최대 10점)' },
    { key: 'conclusions', label: '결론의 타당성 (최대 10점)' },
    { key: 'academic_contribution', label: '학문적 기여도 (최대 10점)' },
  ];

  let items = [];
  const editing = {};

  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  const SESSION_PILL_COLORS = [
    { bg: '#dbeafe', fg: '#1d4ed8' },
    { bg: '#dcfce7', fg: '#166534' },
    { bg: '#ffedd5', fg: '#c2410c' },
    { bg: '#fce7f3', fg: '#be185d' },
    { bg: '#e0e7ff', fg: '#3730a3' },
    { bg: '#fef3c7', fg: '#a16207' },
    { bg: '#ccfbf1', fg: '#0f766e' },
    { bg: '#fee2e2', fg: '#b91c1c' },
    { bg: '#ede9fe', fg: '#6d28d9' },
    { bg: '#ecfccb', fg: '#4d7c0f' },
  ];

  function sessionPillColor(key) {
    const text = String(key || '');
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash |= 0;
    }
    return SESSION_PILL_COLORS[Math.abs(hash) % SESSION_PILL_COLORS.length];
  }

  function sessionCodeBadge(label) {
    const text = (label || '').trim();
    if (!text) return '';
    const color = sessionPillColor(text);
    return (
      `<span class="ar-topic-code" `
      + `style="background:${color.bg};color:${color.fg};border:1px solid ${color.fg}33;">`
      + `${esc(text)}</span>`
    );
  }

  function scoreOptions(selected, disabled) {
    let html = '<option value="">점수 선택</option>';
    for (let i = 1; i <= 10; i += 1) {
      html += `<option value="${i}" ${Number(selected) === i ? 'selected' : ''}>${i} 점</option>`;
    }
    return html;
  }

  function isLocked(item) {
    return !!item.submitted && !editing[item.assignment_id];
  }

  function allScoresFilled(item) {
    return CRITERIA.every((c) => item[c.key] != null && item[c.key] !== '');
  }

  function render() {
    if (!items.length) {
      listEl.innerHTML = '<div class="ar-score-card"><p class="ar-empty">심사할 주제가 없습니다</p></div>';
      return;
    }

    listEl.innerHTML = items.map((item) => {
      const locked = isLocked(item);
      const submitted = !!item.submitted;
      const cardClass = submitted && !editing[item.assignment_id] ? 'ar-score-card is-submitted' : 'ar-score-card';
      const badge = submitted
        ? `<span class="ar-total-badge">총점: ${item.total_score}/40</span>`
        : '';
      const fields = CRITERIA.map((c) => `
        <div class="ar-score-row">
          <label>${esc(c.label)}</label>
          <select name="${c.key}" data-id="${item.assignment_id}" ${locked ? 'disabled' : ''}>
            ${scoreOptions(item[c.key])}
          </select>
        </div>
      `).join('');
      const canSubmit = !locked && allScoresFilled(item);
      return `
        <article class="${cardClass}" data-assignment="${item.assignment_id}">
          <div class="ar-score-head">
            <div class="ar-score-titles">
              <h3>
                ${sessionCodeBadge(item.topic_code || item.session_abbrev || '')}
                <span class="ar-topic-title">${esc(item.title) || '(제목 없음)'}</span>
              </h3>
              <p class="ar-meta">
                발표자: ${esc(item.submitter_name)}
                ${item.department ? ` | 부서: ${esc(item.department)}` : ''}
                ${item.affiliation ? ` | 소속: ${esc(item.affiliation)}` : ''}
              </p>
              ${item.session_title
                ? `<p class="ar-meta">세션: ${esc(item.session_title)}${item.session_abbrev ? ` (${esc(item.session_abbrev)})` : ''}</p>`
                : ''}
              ${item.presentation_time
                ? `<p class="ar-presentation-time">발표시간: ${esc(item.presentation_time)}</p>`
                : ''}
            </div>
            <div class="ar-score-actions">
              ${badge}
              <button type="button" class="btn btn-secondary btn-sm" data-edit="${item.assignment_id}">수정</button>
            </div>
          </div>
          <div class="ar-score-grid">${fields}</div>
          <div class="ar-score-footer ar-score-footer-end">
            <button type="button" class="btn btn-primary" data-submit="${item.assignment_id}" ${canSubmit ? '' : 'disabled'}>
              제출완료
            </button>
          </div>
        </article>
      `;
    }).join('');
  }

  async function load(opts) {
    const options = opts || {};
    if (!options.silent) listEl.textContent = '데이터를 불러오는 중...';
    const res = await fetch(`/api/abstract_review/${eventId}/assignments`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = `/abstract_review/${eventId}`;
        return;
      }
      throw new Error(data.error || '목록을 불러오지 못했습니다.');
    }
    items = (data.items || []).map((row) => ({ ...row }));
    Object.keys(editing).forEach((key) => { delete editing[key]; });
    render();
  }

  listEl.addEventListener('change', (e) => {
    const select = e.target.closest('select[data-id]');
    if (!select) return;
    const id = Number(select.dataset.id);
    const item = items.find((row) => row.assignment_id === id);
    if (!item) return;
    const val = select.value;
    item[select.name] = val ? Number(val) : null;
    render();
  });

  listEl.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('[data-edit]');
    if (editBtn) {
      const id = Number(editBtn.dataset.edit);
      editing[id] = true;
      const item = items.find((row) => row.assignment_id === id);
      if (item) item.submitted = false;
      render();
      return;
    }

    const submitBtn = e.target.closest('[data-submit]');
    if (!submitBtn || submitBtn.disabled) return;
    const id = Number(submitBtn.dataset.submit);
    const item = items.find((row) => row.assignment_id === id);
    if (!item || !allScoresFilled(item)) {
      alert('모든 항목에 점수를 입력해주세요');
      return;
    }

    const pendingBefore = items.filter((row) => !row.submitted || editing[row.assignment_id]).length;
    submitBtn.disabled = true;
    try {
      const res = await fetch(`/api/abstract_review/${eventId}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignment_id: id,
          originality: item.originality,
          methodology: item.methodology,
          conclusions: item.conclusions,
          academic_contribution: item.academic_contribution,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || '점수 저장에 실패했습니다');

      delete editing[id];
      item.submitted = true;
      item.total_score = data.total_score;
      item.rank = data.rank;
      alert(`${item.topic_code || '초록'} 점수가 저장되었습니다`);
      await load({ silent: true });

      if (pendingBefore <= 1) {
        const stillPending = items.some((row) => !row.submitted);
        if (!stillPending) {
          setTimeout(() => {
            alert('심사가 완료되었습니다');
            window.location.href = logoutUrl;
          }, 400);
        }
      }
    } catch (err) {
      alert(err.message);
      submitBtn.disabled = false;
    }
  });

  load().catch((err) => {
    listEl.innerHTML = `<div class="ar-empty">${esc(err.message)}</div>`;
  });
})();
