#!/usr/bin/env python3
"""
SQLite에서 PostgreSQL로 데이터 마이그레이션 스크립트
"""

import sqlite3
import psycopg
import os
from datetime import datetime
from dotenv import load_dotenv
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 환경 변수 로드
load_dotenv()

def get_sqlite_connection():
    """SQLite 데이터베이스 연결"""
    try:
        conn = sqlite3.connect('events.db')
        return conn
    except sqlite3.Error as e:
        logger.error(f"SQLite 연결 실패: {e}")
        raise

def get_postgres_connection():
    """PostgreSQL 데이터베이스 연결"""
    try:
        database_url = os.environ.get('DATABASE_URL')
        if not database_url:
            raise ValueError("DATABASE_URL 환경 변수가 설정되지 않았습니다.")
        
        conn = psycopg.connect(database_url)
        return conn
    except psycopg.Error as e:
        logger.error(f"PostgreSQL 연결 실패: {e}")
        raise

def create_tables(conn):
    """PostgreSQL에 테이블 생성"""
    cursor = conn.cursor()
    
    # events 테이블 생성
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS events (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            event_id VARCHAR(50) UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # event_id 인덱스 생성
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_event_id ON events(event_id)')
    
    # participants 테이블 생성
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS participants (
            id SERIAL PRIMARY KEY,
            event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
            code INTEGER,
            registration VARCHAR(100),
            division VARCHAR(100),
            role VARCHAR(100),
            country VARCHAR(100),
            name_kor VARCHAR(100),
            affiliation_kor VARCHAR(200),
            department_kor VARCHAR(200),
            first_name VARCHAR(100),
            family_name VARCHAR(100),
            affiliation_eng VARCHAR(200),
            department_eng VARCHAR(200),
            accept_or_decline VARCHAR(20),
            email VARCHAR(200),
            phone VARCHAR(50),
            position VARCHAR(100),
            license_number VARCHAR(100),
            cv VARCHAR(500),
            photo VARCHAR(500),
            ppt VARCHAR(500),
            script VARCHAR(500),
            agree VARCHAR(10),
            remark_user TEXT,
            remark_admin TEXT,
            check_in_time TIMESTAMP,
            check_out_time TIMESTAMP,
            decline_reason TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # participant_files 테이블 생성
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS participant_files (
            id SERIAL PRIMARY KEY,
            participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
            filename VARCHAR(255) NOT NULL,
            filepath VARCHAR(500) NOT NULL,
            file_type VARCHAR(50),
            file_size INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # users 테이블 생성 (향후 확장용)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(80) UNIQUE NOT NULL,
            email VARCHAR(120) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            first_name VARCHAR(100),
            last_name VARCHAR(100),
            role VARCHAR(20) DEFAULT 'user',
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # user_sessions 테이블 생성
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_sessions (
            id SERIAL PRIMARY KEY,
            session_id VARCHAR(255) UNIQUE NOT NULL,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    logger.info("PostgreSQL 테이블 생성 완료")

def migrate_events(sqlite_conn, postgres_conn):
    """events 테이블 마이그레이션"""
    sqlite_cursor = sqlite_conn.cursor()
    postgres_cursor = postgres_conn.cursor()
    
    sqlite_cursor.execute('SELECT id, name, start_date, end_date, event_id FROM events')
    events = sqlite_cursor.fetchall()
    
    for event in events:
        postgres_cursor.execute('''
            INSERT INTO events (id, name, start_date, end_date, event_id)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (id) DO NOTHING
        ''', event)
    
    postgres_conn.commit()
    logger.info(f"events 테이블 마이그레이션 완료: {len(events)}개 레코드")

def migrate_participants(sqlite_conn, postgres_conn):
    """participants 테이블 마이그레이션"""
    sqlite_cursor = sqlite_conn.cursor()
    postgres_cursor = postgres_conn.cursor()
    
    sqlite_cursor.execute('''
        SELECT id, event_id, code, registration, division, role, country, 
               name_kor, affiliation_kor, department_kor, first_name, family_name,
               affiliation_eng, department_eng, accept_or_decline, email, phone,
               position, license_number, cv, photo, ppt, script, agree,
               remark_user, remark_admin, check_in_time, check_out_time, decline_reason
        FROM participants
    ''')
    participants = sqlite_cursor.fetchall()
    
    for participant in participants:
        # 날짜/시간 필드 처리
        check_in_time = None
        check_out_time = None
        
        if participant[26]:  # check_in_time
            try:
                check_in_time = datetime.fromisoformat(participant[26].replace('Z', '+00:00'))
            except:
                check_in_time = None
                
        if participant[27]:  # check_out_time
            try:
                check_out_time = datetime.fromisoformat(participant[27].replace('Z', '+00:00'))
            except:
                check_out_time = None
        
        postgres_cursor.execute('''
            INSERT INTO participants (
                id, event_id, code, registration, division, role, country,
                name_kor, affiliation_kor, department_kor, first_name, family_name,
                affiliation_eng, department_eng, accept_or_decline, email, phone,
                position, license_number, cv, photo, ppt, script, agree,
                remark_user, remark_admin, check_in_time, check_out_time, decline_reason
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO NOTHING
        ''', participant[:26] + (check_in_time, check_out_time, participant[28]))
    
    postgres_conn.commit()
    logger.info(f"participants 테이블 마이그레이션 완료: {len(participants)}개 레코드")

def migrate_participant_files(sqlite_conn, postgres_conn):
    """participant_files 테이블 마이그레이션"""
    sqlite_cursor = sqlite_conn.cursor()
    postgres_cursor = postgres_conn.cursor()
    
    sqlite_cursor.execute('SELECT id, participant_id, filename, filepath FROM participant_files')
    files = sqlite_cursor.fetchall()
    
    for file_record in files:
        postgres_cursor.execute('''
            INSERT INTO participant_files (id, participant_id, filename, filepath)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (id) DO NOTHING
        ''', file_record)
    
    postgres_conn.commit()
    logger.info(f"participant_files 테이블 마이그레이션 완료: {len(files)}개 레코드")

def reset_sequences(postgres_conn):
    """PostgreSQL 시퀀스 재설정"""
    cursor = postgres_conn.cursor()
    
    # 각 테이블의 시퀀스 재설정
    tables = ['events', 'participants', 'participant_files', 'users', 'user_sessions']
    
    for table in tables:
        cursor.execute(f'''
            SELECT setval(pg_get_serial_sequence('{table}', 'id'), 
                         COALESCE((SELECT MAX(id) FROM {table}), 1))
        ''')
    
    postgres_conn.commit()
    logger.info("PostgreSQL 시퀀스 재설정 완료")

def main():
    """메인 마이그레이션 함수"""
    logger.info("PostgreSQL 마이그레이션 시작")
    
    try:
        # 데이터베이스 연결
        sqlite_conn = get_sqlite_connection()
        postgres_conn = get_postgres_connection()
        
        # PostgreSQL 테이블 생성
        create_tables(postgres_conn)
        
        # 데이터 마이그레이션
        migrate_events(sqlite_conn, postgres_conn)
        migrate_participants(sqlite_conn, postgres_conn)
        migrate_participant_files(sqlite_conn, postgres_conn)
        
        # 시퀀스 재설정
        reset_sequences(postgres_conn)
        
        logger.info("PostgreSQL 마이그레이션 완료!")
        
    except Exception as e:
        logger.error(f"마이그레이션 실패: {e}")
        raise
    finally:
        # 연결 종료
        if 'sqlite_conn' in locals():
            sqlite_conn.close()
        if 'postgres_conn' in locals():
            postgres_conn.close()

if __name__ == '__main__':
    main() 