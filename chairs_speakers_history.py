"""역대 좌장/연자/패널 CSV 집계 및 세션 이력 연계."""

from __future__ import annotations

import csv
import os
import re
from collections import defaultdict
from typing import Any

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
HISTORY_CSV = os.path.join(BASE_DIR, 'data', 'chairs_speakers_history.csv')
SESSIONS_CSV = os.path.join(BASE_DIR, 'data', 'chairs_speakers_sessions.csv')

PERSON_FIELDS = [
    '국가', '국가약어', '성명(KOR)', '성명(ENG)', '이름(First Name)', '성(Last Name)',
    '이메일', '전화', '소속(ENG)', '과(ENG)', '소속(KOR)', '과(KOR)', '직위',
    '면허번호', '생년월일', '회원구분', '연자비', '은행정보', '프로필',
]

SESSION_FIELDS = [
    '날짜 (Date)', '역할', '발표자 (Speaker)',
    '세션주제 (Session Topic)', '발표 주제 (Lecture Title)',
    '국가', '소속(KOR)', '과(KOR)', '전화', '이메일',
]

_SESSION_NAME_KEYS = ('성명(KOR)', '발표자 (Speaker)', '발표자', 'Speaker', '성명')
_SESSION_DATE_KEYS = ('연도', '날짜 (Date)', '날짜', 'Date')
_SESSION_TITLE_KEYS = (
    '세션제목', '세션 제목', '세션주제 (Session Topic)', '세션 주제', 'Session Topic',
)
_PRESENTATION_TITLE_KEYS = (
    '발표제목', '발표 제목', '발표 주제 (Lecture Title)', '발표주제', 'Lecture Title',
)


def _clean(value: Any) -> str:
    if value is None:
        return ''
    return str(value).strip()


def _normalize_email(email: str) -> str:
    return _clean(email).split(',')[0].strip().lower()


def _first_nonempty(row: dict, keys: tuple[str, ...]) -> str:
    for key in keys:
        val = _clean(row.get(key))
        if val:
            return val
    return ''


def _extract_year(value: str) -> str:
    value = _clean(value)
    if not value:
        return ''
    match = re.match(r'^(\d{4})', value)
    return match.group(1) if match else value


def _looks_like_latin_name(name: str) -> bool:
    return bool(re.match(r"^[A-Za-z\s\-.'()]+$", name))


def _normalize_session_row(row: dict) -> dict:
    """업로드 CSV의 다양한 헤더를 내부 표준 필드로 맞춤."""
    out = dict(row)

    speaker = _first_nonempty(row, _SESSION_NAME_KEYS)
    if speaker:
        if _clean(out.get('성명(KOR)')) or _clean(out.get('성명(ENG)')):
            pass
        elif _looks_like_latin_name(speaker):
            out['성명(ENG)'] = speaker
        else:
            out['성명(KOR)'] = speaker

    year = _first_nonempty(row, _SESSION_DATE_KEYS)
    if year and not _clean(out.get('연도')):
        out['연도'] = _extract_year(year) if not re.fullmatch(r'\d{4}', year) else year

    session_title = _first_nonempty(row, _SESSION_TITLE_KEYS)
    if session_title:
        out['세션제목'] = session_title

    presentation_title = _first_nonempty(row, _PRESENTATION_TITLE_KEYS)
    if presentation_title:
        out['발표제목'] = presentation_title

    return out


def _format_title_list(sessions: list[dict], field: str) -> str:
    parts: list[str] = []
    seen: set[tuple[str, str]] = set()
    for session in sessions:
        title = _clean(session.get(field))
        if not title:
            continue
        key = (session.get('year', ''), title)
        if key in seen:
            continue
        seen.add(key)
        year = _clean(session.get('year'))
        parts.append(f'{year}: {title}' if year else title)
    return ' | '.join(parts)


class _UnionFind:
    def __init__(self) -> None:
        self.parent: dict[str, str] = {}

    def find(self, item: str) -> str:
        self.parent.setdefault(item, item)
        if self.parent[item] != item:
            self.parent[item] = self.find(self.parent[item])
        return self.parent[item]

    def union(self, a: str, b: str) -> None:
        root_a, root_b = self.find(a), self.find(b)
        if root_a != root_b:
            self.parent[root_b] = root_a


def _id_priority(ident: str) -> int:
    if ident.startswith('lic:'):
        return 0
    if ident.startswith('email:'):
        return 1
    if ident.startswith('kor:'):
        return 2
    if ident.startswith('eng:'):
        return 3
    return 9


def _row_identifiers(row: dict) -> list[str]:
    ids: list[str] = []
    license_no = _clean(row.get('면허번호'))
    if license_no and license_no != '-':
        ids.append(f'lic:{license_no}')
    email = _normalize_email(row.get('이메일', ''))
    if email:
        ids.append(f'email:{email}')
    name_kor = _clean(row.get('성명(KOR)')).lower()
    if name_kor:
        ids.append(f'kor:{name_kor}')
    name_eng = _clean(row.get('성명(ENG)')).lower()
    if name_eng:
        ids.append(f'eng:{name_eng}')
    return ids


def _build_person_index() -> tuple[_UnionFind, dict[str, str]]:
    """면허번호·이메일·성명 중 하나라도 같으면 동일 인물로 묶음."""
    uf = _UnionFind()
    preferred_key: dict[str, str] = {}

    for path in (HISTORY_CSV, SESSIONS_CSV):
        for raw_row in _read_csv(path):
            row = _normalize_session_row(raw_row) if path == SESSIONS_CSV else raw_row
            ids = _row_identifiers(row)
            if not ids:
                continue
            for i in range(1, len(ids)):
                uf.union(ids[0], ids[i])
            root = uf.find(ids[0])
            for ident in ids:
                current = preferred_key.get(root)
                if current is None or _id_priority(ident) < _id_priority(current):
                    preferred_key[root] = ident

    return uf, preferred_key


def person_key_from_row(row: dict, uf: _UnionFind | None = None, preferred_key: dict[str, str] | None = None) -> str:
    ids = _row_identifiers(row)
    if not ids:
        return f'row:{id(row)}'
    if uf is None or preferred_key is None:
        uf, preferred_key = _build_person_index()
    root = uf.find(ids[0])
    return preferred_key.get(root, ids[0])


def _row_person_root(row: dict, uf: _UnionFind) -> str | None:
    ids = _row_identifiers(row)
    if not ids:
        return None
    return uf.find(ids[0])

def parse_role_label(role_raw: str) -> dict:
    role_raw = _clean(role_raw)
    if '패널' in role_raw:
        role_type = '패널'
    elif '좌장' in role_raw:
        role_type = '좌장'
    elif '연자' in role_raw:
        role_type = '연자'
    else:
        role_type = '기타'

    region = '해외' if '해외' in role_raw else '국내'
    dept = '타과' if '타과' in role_raw else '본과'
    return {
        'role_type': role_type,
        'region': region,
        'dept': dept,
        'role_raw': role_raw,
    }


def _read_csv(path: str) -> list[dict]:
    if not os.path.isfile(path):
        return []
    with open(path, encoding='utf-8-sig', newline='') as f:
        return list(csv.DictReader(f))


def _merge_person_fields(target: dict, row: dict) -> None:
    for field in PERSON_FIELDS:
        val = _clean(row.get(field))
        if val and not target.get(field):
            target[field] = val


def _format_year_tags(entries: list[dict]) -> str:
    seen = set()
    parts = []
    for entry in sorted(entries, key=lambda e: (e['year'], e['region'], e['dept'])):
        key = (entry['year'], entry['region'], entry['dept'])
        if key in seen:
            continue
        seen.add(key)
        parts.append(f"{entry['year']}({entry['region']}·{entry['dept']})")
    return ', '.join(parts)


def load_aggregated_history() -> list[dict]:
    uf, preferred_key = _build_person_index()
    people: dict[str, dict] = {}
    role_entries: dict[str, dict[str, list]] = defaultdict(lambda: defaultdict(list))

    for row in _read_csv(HISTORY_CSV):
        key = person_key_from_row(row, uf, preferred_key)
        if key not in people:
            people[key] = {'person_key': key}
        _merge_person_fields(people[key], row)

        parsed = parse_role_label(row.get('역할', ''))
        year = _clean(row.get('연도'))
        if not year:
            continue
        entry = {
            'year': year,
            'region': parsed['region'],
            'dept': parsed['dept'],
            'role_raw': parsed['role_raw'],
        }
        role_type = parsed['role_type']
        bucket = role_entries[key][role_type]
        if entry not in bucket:
            bucket.append(entry)

    session_map: dict[tuple, list[dict]] = defaultdict(list)
    for raw_row in _read_csv(SESSIONS_CSV):
        row = _normalize_session_row(raw_row)
        parsed = parse_role_label(row.get('역할', ''))
        year = _clean(row.get('연도'))
        if not year:
            continue
        pkey = person_key_from_row(row, uf, preferred_key)
        sk = (year, parsed['role_type'], pkey)
        session_map[sk].append({
            'year': year,
            'role_type': parsed['role_type'],
            'region': parsed['region'],
            'dept': parsed['dept'],
            'role_raw': parsed['role_raw'],
            'session_title': _clean(row.get('세션제목')),
            'presentation_title': _clean(row.get('발표제목')),
        })

    results = []
    for key, person in people.items():
        chairs = role_entries[key].get('좌장', [])
        speakers = role_entries[key].get('연자', [])
        panels = role_entries[key].get('패널', [])

        sessions = []
        for role_type, entries in [('좌장', chairs), ('연자', speakers), ('패널', panels)]:
            for entry in entries:
                sk = (entry['year'], role_type, key)
                if sk in session_map:
                    sessions.extend(session_map[sk])
        sessions.sort(key=lambda s: (s['year'], s['role_type']))

        person.update({
            'chair_years': _format_year_tags(chairs),
            'speaker_years': _format_year_tags(speakers),
            'panel_years': _format_year_tags(panels),
            'sessions': sessions,
            'session_titles': _format_title_list(sessions, 'session_title'),
            'presentation_titles': _format_title_list(sessions, 'presentation_title'),
        })
        results.append(person)

    results.sort(key=lambda p: (_clean(p.get('성명(KOR)')) or _clean(p.get('성명(ENG)'))).lower())
    return results


def _write_csv_rows(path: str, fieldnames: list[str], rows: list[dict]) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction='ignore')
        writer.writeheader()
        writer.writerows(rows)


def _history_fieldnames(rows: list[dict]) -> list[str]:
    if rows:
        return list(rows[0].keys())
    if os.path.isfile(HISTORY_CSV):
        with open(HISTORY_CSV, encoding='utf-8-sig', newline='') as f:
            return list(csv.DictReader(f).fieldnames or [])
    return []


def delete_people_by_keys(person_keys: list[str]) -> int:
    """선택한 인물의 역대 명단·세션 이력을 CSV에서 삭제. 삭제된 인물 수 반환."""
    keys = {k for k in person_keys if k}
    if not keys:
        return 0

    uf, _preferred_key = _build_person_index()
    delete_roots = {uf.find(k) for k in keys}

    history_rows = _read_csv(HISTORY_CSV)
    history_fieldnames = _history_fieldnames(history_rows)
    kept_history = [
        r for r in history_rows
        if _row_person_root(r, uf) not in delete_roots
    ]
    before_roots = {_row_person_root(r, uf) for r in history_rows} - {None}
    after_roots = {_row_person_root(r, uf) for r in kept_history} - {None}
    removed_people = len(before_roots - after_roots)
    _write_csv_rows(HISTORY_CSV, history_fieldnames, kept_history)

    session_rows = _read_csv(SESSIONS_CSV)
    if session_rows:
        session_fieldnames = list(session_rows[0].keys())
        kept_sessions = [
            r for r in session_rows
            if _row_person_root(_normalize_session_row(r), uf) not in delete_roots
        ]
        _write_csv_rows(SESSIONS_CSV, session_fieldnames, kept_sessions)

    return removed_people


def save_uploaded_csv(upload_path: str, target: str) -> None:
    if target == 'history':
        dest = HISTORY_CSV
    elif target == 'sessions':
        dest = SESSIONS_CSV
    else:
        raise ValueError('target must be history or sessions')

    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(upload_path, 'rb') as src:
        data = src.read()
    if not data:
        raise ValueError('빈 파일입니다.')
    with open(dest, 'wb') as dst:
        dst.write(data)


def ensure_sessions_template() -> None:
    os.makedirs(os.path.dirname(SESSIONS_CSV), exist_ok=True)
    if os.path.isfile(SESSIONS_CSV):
        return
    with open(SESSIONS_CSV, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=SESSION_FIELDS)
        writer.writeheader()
