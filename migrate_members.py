#!/usr/bin/env python3
"""
회원 데이터베이스 마이그레이션 스크립트
PostgreSQL 데이터베이스 'jhc_members'를 생성하고 테이블을 설정합니다.
"""

import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import os
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv('config.env')

def create_database():
    """jhc_members 데이터베이스 생성"""
    try:
        # 기본 데이터베이스에 연결
        conn = psycopg2.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            port=os.getenv('DB_PORT', '5432'),
            user=os.getenv('DB_USER', 'postgres'),
            password=os.getenv('DB_PASSWORD', ''),
            database='postgres'  # 기본 데이터베이스
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        # 데이터베이스 존재 여부 확인
        cursor.execute("SELECT 1 FROM pg_catalog.pg_database WHERE datname = 'jhc_members'")
        exists = cursor.fetchone()
        
        if not exists:
            cursor.execute('CREATE DATABASE jhc_members')
            print("✅ jhc_members 데이터베이스가 생성되었습니다.")
        else:
            print("ℹ️  jhc_members 데이터베이스가 이미 존재합니다.")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ 데이터베이스 생성 중 오류: {e}")
        return False
    
    return True

def setup_member_display_settings():
    """회원 표시 설정 초기화"""
    try:
        from app import app, db
        from models import MemberDisplaySettings
        
        with app.app_context():
            # 기존 설정 삭제
            MemberDisplaySettings.query.delete()
            
            # 기본 표시 설정 추가
            settings = [
                {'column_name': 'username', 'display_name': '아이디', 'is_visible': True, 'display_order': 1},
                {'column_name': 'name_kor', 'display_name': '이름', 'is_visible': True, 'display_order': 2},
                {'column_name': 'email', 'display_name': '이메일', 'is_visible': True, 'display_order': 3},
                {'column_name': 'workplace_name', 'display_name': '근무처', 'is_visible': True, 'display_order': 4},
                {'column_name': 'position', 'display_name': '직위', 'is_visible': True, 'display_order': 5},
                {'column_name': 'specialty', 'display_name': '진료과목', 'is_visible': True, 'display_order': 6},
                {'column_name': 'phone', 'display_name': '전화번호', 'is_visible': False, 'display_order': 7},
                {'column_name': 'mobile', 'display_name': '휴대전화', 'is_visible': False, 'display_order': 8},
                {'column_name': 'birth_date', 'display_name': '생년월일', 'is_visible': False, 'display_order': 9},
                {'column_name': 'gender', 'display_name': '성별', 'is_visible': False, 'display_order': 10},
                {'column_name': 'workplace_type', 'display_name': '근무처구분', 'is_visible': False, 'display_order': 11},
                {'column_name': 'specialty_eng', 'display_name': '진료과목(영문)', 'is_visible': False, 'display_order': 12},
                {'column_name': 'address', 'display_name': '주소', 'is_visible': False, 'display_order': 13},
                {'column_name': 'workplace_phone', 'display_name': '근무처전화', 'is_visible': False, 'display_order': 14},
                {'column_name': 'workplace_fax', 'display_name': '근무처FAX', 'is_visible': False, 'display_order': 15},
                {'column_name': 'alma_mater', 'display_name': '출신학교', 'is_visible': False, 'display_order': 16},
                {'column_name': 'major', 'display_name': '전공과목', 'is_visible': False, 'display_order': 17},
                {'column_name': 'graduation_year', 'display_name': '졸업년도', 'is_visible': False, 'display_order': 18},
                {'column_name': 'highest_degree', 'display_name': '최종학위', 'is_visible': False, 'display_order': 19},
                {'column_name': 'residency_institution', 'display_name': '레지던트(이수기관)', 'is_visible': False, 'display_order': 20},
                {'column_name': 'residency_hospital', 'display_name': '레지던트(수련병원)', 'is_visible': False, 'display_order': 21},
                {'column_name': 'specialist_year', 'display_name': '전문의취득년도', 'is_visible': False, 'display_order': 22},
                {'column_name': 'profile_public', 'display_name': '개인정보공개', 'is_visible': False, 'display_order': 23},
                {'column_name': 'sms_receipt', 'display_name': 'SMS수신', 'is_visible': False, 'display_order': 24},
                {'column_name': 'email_receipt', 'display_name': '정보메일수신', 'is_visible': False, 'display_order': 25},
                {'column_name': 'mail_receipt', 'display_name': '우편물수령', 'is_visible': False, 'display_order': 26},
                {'column_name': 'is_active', 'display_name': '상태', 'is_visible': True, 'display_order': 27},
                {'column_name': 'created_at', 'display_name': '가입일', 'is_visible': True, 'display_order': 28}
            ]
            
            for setting_data in settings:
                setting = MemberDisplaySettings(**setting_data)
                db.session.add(setting)
            
            db.session.commit()
            print("✅ 회원 표시 설정이 초기화되었습니다.")
            
    except Exception as e:
        print(f"❌ 회원 표시 설정 초기화 중 오류: {e}")

def main():
    """메인 실행 함수"""
    print("🚀 회원 데이터베이스 마이그레이션을 시작합니다...")
    
    # 1. 데이터베이스 생성
    if create_database():
        print("✅ 데이터베이스 생성 완료")
    else:
        print("❌ 데이터베이스 생성 실패")
        return
    
    # 2. 테이블 생성 (Flask-SQLAlchemy가 자동으로 처리)
    try:
        from app import app, db
        with app.app_context():
            db.create_all()
            print("✅ 테이블 생성 완료")
    except Exception as e:
        print(f"❌ 테이블 생성 중 오류: {e}")
        return
    
    # 3. 회원 표시 설정 초기화
    setup_member_display_settings()
    
    print("🎉 회원 데이터베이스 마이그레이션이 완료되었습니다!")
    print("\n📋 다음 단계:")
    print("1. /register 경로로 회원가입 페이지 접속")
    print("2. /members 경로로 회원 관리 페이지 접속")
    print("3. 회원가입 후 회원 목록에서 확인")

if __name__ == "__main__":
    main() 