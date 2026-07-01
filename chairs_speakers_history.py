"""역대 좌장/연자/패널 CSV 집계 및 세션 이력 연계."""

from __future__ import annotations

import csv
import json
import os
import re
from collections import defaultdict
from typing import Any

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
HISTORY_CSV = os.path.join(BASE_DIR, 'data', 'chairs_speakers_history.csv')
SESSIONS_CSV = os.path.join(BASE_DIR, 'data', 'chairs_speakers_sessions.csv')
MANUAL_MERGE_FILE = os.path.join(BASE_DIR, 'data', 'chairs_speakers_manual_merges.json')

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


def _session_entry_from_row(row: dict, parsed: dict, year: str) -> dict | None:
    """좌장 → 세션주제, 연자/패널 → 발표주제 로 역할별 제목 분리."""
    role_type = parsed['role_type']
    if role_type == '기타':
        return None

    speaker = _first_nonempty(row, _SESSION_NAME_KEYS)
    if not speaker:
        return None

    session_topic = _clean(row.get('세션제목'))
    lecture_title = _clean(row.get('발표제목'))

    if role_type == '좌장':
        session_title = session_topic
        presentation_title = ''
    elif role_type in ('연자', '패널'):
        session_title = ''
        presentation_title = lecture_title or session_topic
    else:
        return None

    if not session_title and not presentation_title:
        return None

    return {
        'year': year,
        'role_type': role_type,
        'region': parsed['region'],
        'dept': parsed['dept'],
        'role_raw': parsed['role_raw'],
        'session_title': session_title,
        'presentation_title': presentation_title,
    }


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


def _row_strong_identifiers(row: dict) -> list[str]:
    """면허번호·이메일만 동일 인물 병합에 사용 (동명이인 구분)."""
    ids: list[str] = []
    license_no = _clean(row.get('면허번호'))
    if license_no and license_no != '-':
        ids.append(f'lic:{license_no}')
    email = _normalize_email(row.get('이메일', ''))
    if email:
        ids.append(f'email:{email}')
    return ids


def _weak_person_key(row: dict) -> str:
    """면허번호·이메일이 없을 때 성명+소속 등으로 동명이인 구분."""
    parts = [
        _clean(row.get('성명(KOR)')).lower(),
        _clean(row.get('성명(ENG)')).lower(),
        _clean(row.get('생년월일')),
        _clean(row.get('소속(KOR)')),
        _clean(row.get('과(KOR)')),
        _clean(row.get('전화')),
    ]
    blob = '|'.join(p for p in parts if p)
    if blob:
        return f'weak:{blob}'
    return f'row:{id(row)}'


def _load_merge_config() -> dict:
    if not os.path.isfile(MANUAL_MERGE_FILE):
        return {'merge_groups': [], 'dismissed': []}
    with open(MANUAL_MERGE_FILE, encoding='utf-8') as f:
        data = json.load(f)
    return {
        'merge_groups': data.get('merge_groups', []),
        'dismissed': data.get('dismissed', []),
    }


def _save_merge_config(config: dict) -> None:
    os.makedirs(os.path.dirname(MANUAL_MERGE_FILE), exist_ok=True)
    with open(MANUAL_MERGE_FILE, 'w', encoding='utf-8') as f:
        json.dump(config, f, ensure_ascii=False, indent=2)


def _candidate_group_id(person_keys: list[str]) -> str:
    return '|'.join(sorted(set(k for k in person_keys if k)))


def _apply_manual_merge_groups(uf: _UnionFind, preferred_key: dict[str, str], groups: list[list[str]]) -> None:
    for group in groups:
        keys = [k for k in group if k]
        if len(keys) < 2:
            continue
        for i in range(1, len(keys)):
            uf.union(keys[0], keys[i])
        root = uf.find(keys[0])
        for ident in keys:
            current = preferred_key.get(root)
            if current is None or _id_priority(ident) < _id_priority(current):
                preferred_key[root] = ident


def _build_person_index() -> tuple[_UnionFind, dict[str, str]]:
    """면허번호·이메일이 같을 때 자동 병합 + 관리자 확인 수동 병합."""
    uf = _UnionFind()
    preferred_key: dict[str, str] = {}

    for path in (HISTORY_CSV, SESSIONS_CSV):
        for raw_row in _read_csv(path):
            row = _normalize_session_row(raw_row) if path == SESSIONS_CSV else raw_row
            strong_ids = _row_strong_identifiers(row)
            if not strong_ids:
                continue
            for i in range(1, len(strong_ids)):
                uf.union(strong_ids[0], strong_ids[i])
            root = uf.find(strong_ids[0])
            for ident in strong_ids:
                current = preferred_key.get(root)
                if current is None or _id_priority(ident) < _id_priority(current):
                    preferred_key[root] = ident

    config = _load_merge_config()
    _apply_manual_merge_groups(uf, preferred_key, config.get('merge_groups', []))

    return uf, preferred_key


def person_key_from_row(row: dict, uf: _UnionFind | None = None, preferred_key: dict[str, str] | None = None) -> str:
    if uf is None or preferred_key is None:
        uf, preferred_key = _build_person_index()
    strong_ids = _row_strong_identifiers(row)
    if strong_ids:
        root = uf.find(strong_ids[0])
        return preferred_key.get(root, strong_ids[0])
    return _weak_person_key(row)

def _format_role_context(region: str, dept: str) -> str:
    """연도·역할 표시용 — 원본에 있는 정보만 (본과는 기본값으로 넣지 않음)."""
    parts: list[str] = []
    if region:
        parts.append(region)
    if dept:
        parts.append(dept)
    return '·'.join(parts)


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

    if '해외' in role_raw or '국외' in role_raw:
        region = '해외'
    elif '국내' in role_raw:
        region = '국내'
    else:
        region = ''

    dept = '타과' if '타과' in role_raw else ''
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
        context = _format_role_context(entry['region'], entry['dept'])
        if context:
            parts.append(f"{entry['year']}({context})")
        else:
            parts.append(str(entry['year']))
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

    person_sessions: dict[str, list[dict]] = defaultdict(list)
    for raw_row in _read_csv(SESSIONS_CSV):
        row = _normalize_session_row(raw_row)
        parsed = parse_role_label(row.get('역할', ''))
        year = _clean(row.get('연도'))
        if not year:
            continue
        entry = _session_entry_from_row(row, parsed, year)
        if not entry:
            continue
        pkey = person_key_from_row(row, uf, preferred_key)
        person_sessions[pkey].append(entry)

    results = []
    for key, person in people.items():
        chairs = role_entries[key].get('좌장', [])
        speakers = role_entries[key].get('연자', [])
        panels = role_entries[key].get('패널', [])

        sessions = person_sessions.get(key, [])
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


def _person_summary(person: dict) -> dict:
    return {
        'person_key': person.get('person_key', ''),
        '성명(KOR)': person.get('성명(KOR)', ''),
        '성명(ENG)': person.get('성명(ENG)', ''),
        '이메일': person.get('이메일', ''),
        '면허번호': person.get('면허번호', ''),
        '과(KOR)': person.get('과(KOR)', ''),
        '소속(KOR)': person.get('소속(KOR)', ''),
        'speaker_years': person.get('speaker_years', ''),
        'chair_years': person.get('chair_years', ''),
    }


def find_duplicate_candidates(people: list[dict]) -> list[dict]:
    """이름은 같지만 면허·이메일이 달라 자동 병합되지 않은 후보."""
    config = _load_merge_config()
    dismissed = set(config.get('dismissed', []))
    by_name: dict[str, dict[str, dict]] = defaultdict(dict)

    for person in people:
        pkey = person.get('person_key', '')
        if not pkey:
            continue
        kor = _clean(person.get('성명(KOR)')).lower()
        eng = _clean(person.get('성명(ENG)')).lower()
        if kor:
            by_name[f'kor:{kor}'][pkey] = person
        if eng:
            by_name[f'eng:{eng}'][pkey] = person

    candidates: list[dict] = []
    seen_ids: set[str] = set()
    for _name_key, people_map in by_name.items():
        if len(people_map) < 2:
            continue
        keys = sorted(people_map.keys())
        group_id = _candidate_group_id(keys)
        if group_id in dismissed or group_id in seen_ids:
            continue
        seen_ids.add(group_id)
        first = people_map[keys[0]]
        label = _clean(first.get('성명(KOR)')) or _clean(first.get('성명(ENG)')) or '이름 없음'
        candidates.append({
            'group_id': group_id,
            'label': label,
            'people': [_person_summary(people_map[k]) for k in keys],
        })

    candidates.sort(key=lambda c: c['label'].lower())
    return candidates


def manual_merge_person_keys(person_keys: list[str]) -> int:
    """관리자 확인 후 동일 인물로 수동 병합. 병합 전 인원 수 - 병합 후 인원 수 반환."""
    keys = sorted(set(k for k in person_keys if k))
    if len(keys) < 2:
        raise ValueError('병합할 인물을 2명 이상 선택하세요.')

    before = len(load_aggregated_history())
    config = _load_merge_config()
    new_group = set(keys)
    updated_groups: list[list[str]] = []
    for group in config.get('merge_groups', []):
        gset = set(group)
        if gset & new_group:
            new_group |= gset
        else:
            updated_groups.append(group)
    updated_groups.append(sorted(new_group))
    config['merge_groups'] = updated_groups
    group_id = _candidate_group_id(keys)
    config['dismissed'] = [d for d in config.get('dismissed', []) if d != group_id]
    _save_merge_config(config)
    after = len(load_aggregated_history())
    return max(before - after, 1)


def dismiss_duplicate_group(person_keys: list[str]) -> None:
    """동명이인 등 다른 사람으로 확인 — 더 이상 중복 의심 목록에 표시하지 않음."""
    keys = sorted(set(k for k in person_keys if k))
    if len(keys) < 2:
        raise ValueError('무시할 그룹을 선택하세요.')
    config = _load_merge_config()
    group_id = _candidate_group_id(keys)
    dismissed = set(config.get('dismissed', []))
    dismissed.add(group_id)
    config['dismissed'] = sorted(dismissed)
    _save_merge_config(config)


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

    uf, preferred_key = _build_person_index()

    history_rows = _read_csv(HISTORY_CSV)
    history_fieldnames = _history_fieldnames(history_rows)
    before_keys = {person_key_from_row(r, uf, preferred_key) for r in history_rows}
    kept_history = [
        r for r in history_rows
        if person_key_from_row(r, uf, preferred_key) not in keys
    ]
    after_keys = {person_key_from_row(r, uf, preferred_key) for r in kept_history}
    removed_people = len(before_keys - after_keys)
    _write_csv_rows(HISTORY_CSV, history_fieldnames, kept_history)

    session_rows = _read_csv(SESSIONS_CSV)
    if session_rows:
        session_fieldnames = list(session_rows[0].keys())
        kept_sessions = [
            r for r in session_rows
            if person_key_from_row(_normalize_session_row(r), uf, preferred_key) not in keys
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
