(function () {
  const eventId = document.body.dataset.eventId;
  const listEl = document.getElementById('arAbstractList');
  const filterEl = document.getElementById('arAbstractFilter');
  const resultsBody = document.getElementById('arResultsBody');
  const modal = document.getElementById('arReviewerModal');
  const modalSub = document.getElementById('arReviewerModalSubtitle');
  const searchEl = document.getElementById('arReviewerSearch');
  const searchResults = document.getElementById('arReviewerSearchResults');

  let abstracts = [];
  let activeSubmissionId = null;
  let searchTimer = null;

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

  function sessionAbbrevBadge(abbrev, title) {
    const label = (abbrev || '').trim();
    if (!label) {
      return '<span class="ar-session-abbrev is-empty">미배정</span>';
    }
    const color = sessionPillColor(label);
    const tip = title ? ` title="${esc(title)}"` : '';
    return (
      `<span class="ar-session-abbrev"${tip} `
      + `style="background:${color.bg};color:${color.fg};border-color:${color.fg}33;">`
      + `${esc(label)}</span>`
    );
  }

  async function api(url, options) {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...(options && options.headers) },
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || '요청 처리에 실패했습니다.');
    return data;
  }

  function filteredAbstracts() {
    const q = (filterEl.value || '').trim().toLowerCase();
    if (!q) return abstracts;
    return abstracts.filter((item) => {
      const hay = [
        item.title,
        item.submitter_name,
        item.affiliation,
        item.department,
        item.session_abbrev,
        item.session_title,
      ].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }

  function renderBoard() {
    const rows = filteredAbstracts();
    if (!rows.length) {
      listEl.innerHTML = '<div class="ar-empty">표시할 제출 초록이 없습니다.</div>';
      return;
    }
    listEl.innerHTML = rows.map((item) => {
      const reviewers = (item.reviewers || []).map((r) => `
        <span class="ar-chip ${r.submitted ? 'scored' : ''}">
          ${esc(r.name)}${r.submitted ? ` · ${r.total_score}점` : ' · 미채점'}
          <button type="button" data-unassign="${r.assignment_id}" title="해제">×</button>
        </span>
      `).join('');
      const scored = (item.reviewers || []).find((r) => r.submitted);
      const scoreLine = scored
        ? `<div class="ar-avg">총점 ${scored.total_score} / 40</div>`
        : '';
      const abbrev = sessionAbbrevBadge(item.session_abbrev, item.session_title);
      const hasReviewer = (item.reviewers || []).length > 0;
      const assignBtn = hasReviewer
        ? '<button type="button" class="btn btn-secondary btn-sm" disabled title="한 초록당 심사자 1명">심사자 지정됨</button>'
        : `<button type="button" class="btn btn-primary btn-sm" data-assign="${item.submission_id}">심사자 지정</button>`;
      return `
        <article class="ar-card" data-submission="${item.submission_id}">
          <div class="ar-card-top">
            <div>
              <h3>
                ${abbrev}
                <span class="ar-card-title-text">${esc(item.title) || '(제목 없음)'}</span>
              </h3>
              <p class="ar-meta">
                ${esc(item.submitter_name)}
                ${item.affiliation ? ` · ${esc(item.affiliation)}` : ''}
                ${item.department ? ` · ${esc(item.department)}` : ''}
              </p>
            </div>
            ${assignBtn}
          </div>
          <div class="ar-reviewers">
            ${reviewers || '<span class="ar-meta">지정된 심사자 없음</span>'}
          </div>
          ${scoreLine}
        </article>
      `;
    }).join('');
  }

  async function loadBoard() {
    listEl.textContent = '불러오는 중...';
    const data = await api(`/api/event/${eventId}/abstract_review/board`);
    abstracts = data.abstracts || [];
    renderBoard();
  }

  function fmtScore(value) {
    if (value == null || value === '') return '-';
    const n = Number(value);
    if (Number.isNaN(n)) return '-';
    return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
  }

  function scoreCells(scores, total, pending) {
    if (pending) {
      return `
        <td class="ar-pending" colspan="5">미채점</td>
      `;
    }
    const s = scores || {};
    return `
      <td class="ar-num">${fmtScore(s.originality)}</td>
      <td class="ar-num">${fmtScore(s.methodology)}</td>
      <td class="ar-num">${fmtScore(s.conclusions)}</td>
      <td class="ar-num">${fmtScore(s.academic_contribution)}</td>
      <td class="ar-score">${fmtScore(total)}점</td>
    `;
  }

  function scoreTableHead() {
    return `
      <tr>
        <th>순위</th>
        <th>세션</th>
        <th>제출자</th>
        <th>초록 제목</th>
        <th>참신성</th>
        <th>연구방법</th>
        <th>결론</th>
        <th>기여도</th>
        <th>총점</th>
      </tr>
    `;
  }

  function renderResults(data) {
    const reviewers = data.reviewers || [];
    if (!reviewers.length) {
      resultsBody.innerHTML = '<div class="ar-empty">아직 배정·채점 결과가 없습니다.</div>';
      return;
    }

    resultsBody.innerHTML = reviewers.map((rev) => {
      const rows = (rev.items || []).map((item) => {
        const abbrev = item.session_abbrev
          ? sessionAbbrevBadge(item.session_abbrev, item.session_title)
          : '<span class="ar-meta">-</span>';
        return `
          <tr>
            <td class="ar-rank-num">${item.submitted ? (item.rank ?? '-') : '-'}</td>
            <td>${abbrev}</td>
            <td>
              <strong>${esc(item.submitter_name)}</strong><br>
              <span class="ar-meta">${esc(item.affiliation)}${item.department ? ` · ${esc(item.department)}` : ''}</span>
            </td>
            <td class="ar-meta">${esc(item.title)}</td>
            ${scoreCells(item.scores, item.total_score, !item.submitted)}
          </tr>
        `;
      }).join('');
      return `
        <section class="ar-result-block">
          <div class="ar-result-head">
            <h3>${esc(rev.name)}</h3>
            <span>${rev.scored_count}/${rev.assigned_count} 채점 완료</span>
          </div>
          <div class="ar-table-scroll">
            <table class="ar-rank-table">
              <thead>${scoreTableHead()}</thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </section>
      `;
    }).join('');
  }

  async function loadResults() {
    resultsBody.textContent = '불러오는 중...';
    const data = await api(`/api/event/${eventId}/abstract_review/results`);
    renderResults(data);
  }

  function openModal(submissionId) {
    const item = abstracts.find((a) => a.submission_id === submissionId);
    if (!item) return;
    if ((item.reviewers || []).length > 0) {
      alert('이 초록에는 이미 심사자가 있습니다. 한 초록당 심사자는 1명만 가능합니다.');
      return;
    }
    activeSubmissionId = submissionId;
    modalSub.textContent = [
      item.session_abbrev,
      item.submitter_name,
      item.title || '(제목 없음)',
    ].filter(Boolean).join(' · ');
    searchEl.value = '';
    searchResults.innerHTML = '<div class="ar-empty">이름을 검색해 심사자를 고르세요.</div>';
    modal.hidden = false;
    searchEl.focus();
  }

  function closeModal() {
    modal.hidden = true;
    activeSubmissionId = null;
  }

  async function searchParticipants(q) {
    if (!q.trim()) {
      searchResults.innerHTML = '<div class="ar-empty">이름을 검색해 심사자를 고르세요.</div>';
      return;
    }
    searchResults.textContent = '검색 중...';
    const data = await api(
      `/api/event/${eventId}/abstract_review/participants?q=${encodeURIComponent(q.trim())}`
    );
    const people = data.people || [];
    if (!people.length) {
      searchResults.innerHTML = '<div class="ar-empty">검색 결과가 없습니다.</div>';
      return;
    }
    searchResults.innerHTML = people.map((p) => `
      <div class="ar-search-item">
        <div>
          <strong>${esc(p.name)}</strong>
          <small>${esc(p.email)}${p.affiliation ? ` · ${esc(p.affiliation)}` : ''}${p.role ? ` · ${esc(p.role)}` : ''}</small>
        </div>
        <button type="button" class="btn btn-primary btn-sm" data-pick="${p.id}">지정</button>
      </div>
    `).join('');
  }

  document.querySelectorAll('.ar-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.ar-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const name = tab.dataset.tab;
      document.getElementById('arAssignPanel').hidden = name !== 'assign';
      document.getElementById('arResultsPanel').hidden = name !== 'results';
      if (name === 'results') loadResults().catch((err) => {
        resultsBody.innerHTML = `<div class="ar-empty">${esc(err.message)}</div>`;
      });
    });
  });

  filterEl.addEventListener('input', () => renderBoard());

  listEl.addEventListener('click', async (e) => {
    const assignBtn = e.target.closest('[data-assign]');
    if (assignBtn) {
      openModal(Number(assignBtn.dataset.assign));
      return;
    }
    const unassignBtn = e.target.closest('[data-unassign]');
    if (unassignBtn) {
      if (!confirm('이 심사자 지정을 해제할까요?')) return;
      try {
        await api(`/api/event/${eventId}/abstract_review/assign/${unassignBtn.dataset.unassign}`, {
          method: 'DELETE',
        });
        await loadBoard();
      } catch (err) {
        alert(err.message);
      }
    }
  });

  document.getElementById('arReviewerModalClose').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  searchEl.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      searchParticipants(searchEl.value).catch((err) => {
        searchResults.innerHTML = `<div class="ar-empty">${esc(err.message)}</div>`;
      });
    }, 220);
  });

  searchResults.addEventListener('click', async (e) => {
    const pick = e.target.closest('[data-pick]');
    if (!pick || !activeSubmissionId) return;
    try {
      await api(`/api/event/${eventId}/abstract_review/assign`, {
        method: 'POST',
        body: JSON.stringify({
          submission_id: activeSubmissionId,
          reviewer_participant_id: Number(pick.dataset.pick),
        }),
      });
      closeModal();
      await loadBoard();
    } catch (err) {
      alert(err.message);
    }
  });

  document.getElementById('arResultsRefresh').addEventListener('click', () => {
    loadResults().catch((err) => {
      resultsBody.innerHTML = `<div class="ar-empty">${esc(err.message)}</div>`;
    });
  });

  document.getElementById('arResultsExcel').addEventListener('click', () => {
    window.location.href = `/api/event/${eventId}/abstract_review/results/excel`;
  });

  loadBoard().catch((err) => {
    listEl.innerHTML = `<div class="ar-empty">${esc(err.message)}</div>`;
  });
})();
