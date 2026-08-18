(function () {
    const MAX_ORGS = 10;
    const MAX_AUTHORS = 15;
    const WORD_LIMIT = 300;
    const COUNTRIES = [
        'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Armenia', 'Australia', 'Austria',
        'Azerbaijan', 'Bahrain', 'Bangladesh', 'Belarus', 'Belgium', 'Bolivia', 'Bosnia and Herzegovina',
        'Brazil', 'Bulgaria', 'Cambodia', 'Canada', 'Chile', 'China', 'Colombia', 'Croatia',
        'Czech Republic', 'Denmark', 'Egypt', 'Estonia', 'Ethiopia', 'Finland', 'France',
        'Georgia', 'Germany', 'Ghana', 'Greece', 'Hong Kong', 'Hungary', 'Iceland', 'India',
        'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Japan', 'Jordan',
        'Kazakhstan', 'Kenya', 'Korea, Democratic People\'s Republic of', 'Korea, Republic of',
        'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lithuania', 'Luxembourg',
        'Macao', 'Malaysia', 'Mexico', 'Mongolia', 'Morocco', 'Myanmar', 'Nepal', 'Netherlands',
        'New Zealand', 'Nigeria', 'Norway', 'Oman', 'Pakistan', 'Peru', 'Philippines', 'Poland',
        'Portugal', 'Qatar', 'Romania', 'Russia', 'Saudi Arabia', 'Serbia', 'Singapore',
        'Slovakia', 'Slovenia', 'South Africa', 'Spain', 'Sri Lanka', 'Sweden', 'Switzerland',
        'Taiwan', 'Thailand', 'Turkey', 'Ukraine', 'United Arab Emirates', 'United Kingdom',
        'United States', 'Uzbekistan', 'Venezuela', 'Vietnam', 'Yemen',
    ];

    const orgCount = document.getElementById('orgCount');
    const authorCount = document.getElementById('authorCount');
    const orgBody = document.getElementById('orgTableBody');
    const authorBody = document.getElementById('authorTableBody');
    const form = document.getElementById('abstractForm');
    const wordCountEl = document.getElementById('wordCount');
    const toolbar = [
        ['bold', 'italic'],
        [{ list: 'bullet' }, { list: 'ordered' }],
        [{ indent: '-1' }, { indent: '+1' }],
        [{ script: 'sub' }, { script: 'super' }],
    ];

    function fillCountSelect(select, max) {
        select.innerHTML = '';
        for (let i = 0; i <= max; i += 1) {
            const option = document.createElement('option');
            option.value = String(i);
            option.textContent = String(i);
            select.appendChild(option);
        }
        select.value = '0';
    }

    function countryOptionsHtml(selected) {
        const options = ['<option value="">:::: Choose Your Country ::::</option>'];
        COUNTRIES.forEach(function (name) {
            const selectedAttr = selected === name ? ' selected' : '';
            options.push('<option value="' + name.replace(/"/g, '&quot;') + '"' + selectedAttr + '>' + name + '</option>');
        });
        return options.join('');
    }

    function renderOrgRows(count) {
        const previous = Array.from(orgBody.querySelectorAll('tr')).map(function (row) {
            return {
                department: row.querySelector('input[name="department"]')?.value || '',
                organization: row.querySelector('input[name="organization"]')?.value || '',
                country: row.querySelector('select[name="country"]')?.value || '',
            };
        });
        orgBody.innerHTML = '';
        for (let i = 0; i < count; i += 1) {
            const saved = previous[i] || {};
            const department = saved.department || '';
            const organization = saved.organization || '';
            const country = saved.country || '';
            const tr = document.createElement('tr');
            tr.innerHTML =
                '<td class="col-no">' + (i + 1) + '</td>' +
                '<td>' +
                    '<div class="institution-fields">' +
                        '<label class="institution-field">' +
                            '<span><span class="req">*</span> Department</span>' +
                            '<input type="text" name="department">' +
                        '</label>' +
                        '<label class="institution-field">' +
                            '<span><span class="req">*</span> Organization</span>' +
                            '<input type="text" name="organization">' +
                        '</label>' +
                        '<label class="institution-field">' +
                            '<span><span class="req">*</span> Country</span>' +
                            '<select name="country">' + countryOptionsHtml(country) + '</select>' +
                        '</label>' +
                    '</div>' +
                '</td>';
            tr.querySelector('input[name="department"]').value = department;
            tr.querySelector('input[name="organization"]').value = organization;
            orgBody.appendChild(tr);
        }
    }

    function collectAuthorData() {
        const rows = Array.from(authorBody.querySelectorAll('tr'));
        const blocks = [];
        for (let i = 0; i < rows.length; i += 3) {
            const main = rows[i];
            const emailRow = rows[i + 1];
            const instRow = rows[i + 2];
            if (!main) break;
            blocks.push({
                presenting: !!main.querySelector('input[data-field="presenting"]')?.checked,
                corresponding: !!main.querySelector('input[data-field="corresponding"]')?.checked,
                firstName: main.querySelector('input[data-field="first_name"]')?.value || '',
                familyName: main.querySelector('input[data-field="family_name"]')?.value || '',
                degrees: Array.from(main.querySelectorAll('input[data-field="degree"]:checked')).map((el) => el.value),
                email: emailRow?.querySelector('input[data-field="email"]')?.value || '',
                institutions: Array.from(instRow?.querySelectorAll('input[data-field="institution"]:checked') || []).map((el) => el.value),
            });
        }
        return blocks;
    }

    function degreeChecksHtml(index, selected) {
        const degrees = ['M.D.', 'Ph.D.', 'M.S.', 'B.S.', 'Others'];
        return degrees.map(function (deg) {
            const checked = selected.indexOf(deg) !== -1 ? ' checked' : '';
            return '<label class="check-inline"><input type="checkbox" data-field="degree" name="degree_' + index + '" value="' + deg + '"' + checked + '> ' + deg + '</label>';
        }).join('');
    }

    function institutionChecksHtml(index, selected) {
        const orgTotal = Number(orgCount.value) || 0;
        if (!orgTotal) {
            return '';
        }
        let html = '';
        for (let n = 1; n <= orgTotal; n += 1) {
            const value = String(n);
            const checked = selected.indexOf(value) !== -1 ? ' checked' : '';
            html += '<label class="check-inline"><input type="checkbox" data-field="institution" name="inst_' + index + '" value="' + value + '"' + checked + '> ' + value + '</label>';
        }
        return html;
    }

    function mapDraftAuthors(authors) {
        return (authors || []).map(function (author) {
            return {
                presenting: !!author.presenting,
                corresponding: !!author.corresponding,
                firstName: author.first_name || '',
                familyName: author.family_name || '',
                degrees: author.degrees || [],
                email: author.email || '',
                institutions: (author.institutions || []).map(String),
            };
        });
    }

    function renderAuthorRows(count, seed) {
        const previous = seed || collectAuthorData();
        authorBody.innerHTML = '';
        for (let i = 0; i < count; i += 1) {
            const saved = previous[i] || {
                presenting: false,
                corresponding: false,
                firstName: '',
                familyName: '',
                degrees: [],
                email: '',
                institutions: [],
            };
            const main = document.createElement('tr');
            main.className = 'author-main-row';
            main.innerHTML =
                '<td class="col-flag"><input type="radio" data-field="presenting" name="presenting" value="' + i + '"' + (saved.presenting ? ' checked' : '') + '></td>' +
                '<td class="col-flag"><input type="radio" data-field="corresponding" name="corresponding" value="' + i + '"' + (saved.corresponding ? ' checked' : '') + '></td>' +
                '<td><input type="text" data-field="first_name" name="first_name_' + i + '"></td>' +
                '<td><input type="text" data-field="family_name" name="family_name_' + i + '"></td>' +
                '<td class="degree-cell">' + degreeChecksHtml(i, saved.degrees) + '</td>';
            main.querySelector('input[data-field="first_name"]').value = saved.firstName;
            main.querySelector('input[data-field="family_name"]').value = saved.familyName;

            const emailRow = document.createElement('tr');
            emailRow.innerHTML =
                '<th class="author-sub-label" colspan="2">E-mail</th>' +
                '<td colspan="3"><input type="email" class="author-wide-input" data-field="email" name="email_' + i + '"></td>';
            emailRow.querySelector('input[data-field="email"]').value = saved.email;

            const instRow = document.createElement('tr');
            instRow.className = 'author-block-end';
            instRow.innerHTML =
                '<th class="author-sub-label" colspan="2">Institution No.</th>' +
                '<td colspan="3" class="institution-no-cell">' + institutionChecksHtml(i, saved.institutions) + '</td>';

            authorBody.appendChild(main);
            authorBody.appendChild(emailRow);
            authorBody.appendChild(instRow);
        }
    }

    const editors = {
        purpose: new Quill('#editorPurpose', {
            theme: 'snow',
            placeholder: '',
            modules: { toolbar: toolbar },
        }),
        method: new Quill('#editorMethod', {
            theme: 'snow',
            placeholder: '',
            modules: { toolbar: toolbar },
        }),
        results: new Quill('#editorResults', {
            theme: 'snow',
            placeholder: '',
            modules: { toolbar: toolbar },
        }),
        conclusion: new Quill('#editorConclusion', {
            theme: 'snow',
            placeholder: '',
            modules: { toolbar: toolbar },
        }),
    };

    function editorWordCount() {
        const text = Object.values(editors)
            .map((editor) => editor.getText())
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
        if (!text) return 0;
        return text.split(' ').filter(Boolean).length;
    }

    function updateWordCount() {
        const count = editorWordCount();
        wordCountEl.textContent = String(count);
        wordCountEl.classList.toggle('over-limit', count > WORD_LIMIT);
    }

    Object.values(editors).forEach((editor) => {
        editor.on('text-change', updateWordCount);
    });

    function syncEditorFields() {
        document.getElementById('purposeHtml').value = editors.purpose.root.innerHTML;
        document.getElementById('methodHtml').value = editors.method.root.innerHTML;
        document.getElementById('resultsHtml').value = editors.results.root.innerHTML;
        document.getElementById('conclusionHtml').value = editors.conclusion.root.innerHTML;
    }

    function editorHasText(editor) {
        return editor.getText().trim().length > 0;
    }

    function applyDraft(draft) {
        orgCount.value = String(draft.org_count || 0);
        renderOrgRows(Number(orgCount.value) || 0);
        (draft.institutions || []).forEach(function (inst, i) {
            const row = orgBody.querySelectorAll('tr')[i];
            if (!row) return;
            row.querySelector('input[name="department"]').value = inst.department || '';
            row.querySelector('input[name="organization"]').value = inst.organization || '';
            row.querySelector('select[name="country"]').value = inst.country || '';
        });

        authorCount.value = String(draft.author_count || 0);
        renderAuthorRows(Number(authorCount.value) || 0, mapDraftAuthors(draft.authors));

        document.getElementById('topicFirst').value = draft.topic_first || '';
        document.getElementById('topicSecond').value = draft.topic_second || '';
        document.getElementById('abstractTitle').value = draft.title || '';
        editors.purpose.root.innerHTML = draft.purpose || '';
        editors.method.root.innerHTML = draft.method || '';
        editors.results.root.innerHTML = draft.results || '';
        editors.conclusion.root.innerHTML = draft.conclusion || '';
        if (draft.copyright) {
            const copyright = form.querySelector('input[name="copyright"][value="' + draft.copyright + '"]');
            if (copyright) copyright.checked = true;
        }
        updateWordCount();
    }

    fillCountSelect(orgCount, MAX_ORGS);
    fillCountSelect(authorCount, MAX_AUTHORS);
    if (window.ABSTRACT_DRAFT) {
        applyDraft(window.ABSTRACT_DRAFT);
    } else {
        renderOrgRows(0);
        renderAuthorRows(0);
    }

    orgCount.addEventListener('change', function () {
        renderOrgRows(Number(orgCount.value) || 0);
        renderAuthorRows(Number(authorCount.value) || 0);
    });
    authorCount.addEventListener('change', function () {
        renderAuthorRows(Number(authorCount.value) || 0);
    });

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        syncEditorFields();

        if (!Number(orgCount.value)) {
            alert('소속 기관 수를 선택해 주세요.');
            return;
        }
        const orgRows = Array.from(orgBody.querySelectorAll('tr'));
        for (let i = 0; i < orgRows.length; i += 1) {
            const row = orgRows[i];
            if (!row.querySelector('input[name="department"]').value.trim() ||
                !row.querySelector('input[name="organization"]').value.trim() ||
                !row.querySelector('select[name="country"]').value) {
                alert((i + 1) + '번 기관의 Department, Organization, Country를 모두 입력해 주세요.');
                return;
            }
        }
        if (!Number(authorCount.value)) {
            alert('저자 수를 선택해 주세요.');
            return;
        }
        const authors = collectAuthorData();
        for (let i = 0; i < authors.length; i += 1) {
            const author = authors[i];
            if (!author.firstName.trim() || !author.familyName.trim()) {
                alert((i + 1) + '번 저자의 First Name과 Family Name을 입력해 주세요.');
                return;
            }
            if (!author.email.trim()) {
                alert((i + 1) + '번 저자의 E-mail을 입력해 주세요.');
                return;
            }
            if (!author.institutions.length) {
                alert((i + 1) + '번 저자의 Institution No.를 선택해 주세요.');
                return;
            }
        }
        if (!authors.some(function (author) { return author.presenting; })) {
            alert('Presenting author를 한 명 선택해 주세요.');
            return;
        }
        if (!authors.some(function (author) { return author.corresponding; })) {
            alert('Corresponding author를 한 명 선택해 주세요.');
            return;
        }
        if (!document.getElementById('topicFirst').value) {
            alert('First Preference topic을 선택해 주세요.');
            return;
        }
        if (!document.getElementById('abstractTitle').value.trim()) {
            alert('Abstract Title을 입력해 주세요.');
            return;
        }
        if (!editorHasText(editors.purpose) || !editorHasText(editors.method) ||
            !editorHasText(editors.results) || !editorHasText(editors.conclusion)) {
            alert('Purpose, Method, Results, Conclusion을 모두 입력해 주세요.');
            return;
        }
        if (editorWordCount() > WORD_LIMIT) {
            alert('초록 본문은 300 words 이하여야 합니다.');
            return;
        }
        const copyright = form.querySelector('input[name="copyright"]:checked');
        if (!copyright) {
            alert('저작권 동의 여부를 선택해 주세요.');
            return;
        }
        if (copyright.value !== 'yes') {
            alert('초록을 제출하려면 저작권에 동의해야 합니다.');
            return;
        }

        HTMLFormElement.prototype.submit.call(form);
    });
})();
