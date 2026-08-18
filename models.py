from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from sqlalchemy.dialects.postgresql import UUID
import uuid

db = SQLAlchemy()

class Event(db.Model):
    __tablename__ = 'events'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    event_id = db.Column(db.String(50), unique=True, index=True)
    location = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    participants = db.relationship('Participant', backref='event', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Event {self.name}>'

class Participant(db.Model):
    __tablename__ = 'participants'
    
    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey('events.id', ondelete='CASCADE'), nullable=False)
    code = db.Column(db.Integer)
    registration = db.Column(db.String(100))
    division = db.Column(db.String(100))
    role = db.Column(db.String(100))
    country = db.Column(db.String(100))
    country_code = db.Column(db.String(10))  # 국가약어 (예: KR, US, JP)
    name_kor = db.Column(db.String(100))
    name_eng = db.Column(db.String(100))  # 영문 전체 이름
    affiliation_kor = db.Column(db.String(200))
    department_kor = db.Column(db.String(200))
    first_name = db.Column(db.String(100))
    family_name = db.Column(db.String(100))
    affiliation_eng = db.Column(db.String(200))
    department_eng = db.Column(db.String(200))
    accept_or_decline = db.Column(db.String(20))
    email = db.Column(db.String(200))
    phone = db.Column(db.String(50))
    position = db.Column(db.String(100))
    license_number = db.Column(db.String(100))
    birth_date = db.Column(db.Date)  # 생년월일
    workplace_type = db.Column(db.String(50))  # 회원구분 (정회원, 준회원, 종신회원)
    cv = db.Column(db.String(500))
    photo = db.Column(db.String(500))
    ppt = db.Column(db.String(500))
    script = db.Column(db.String(500))
    agree = db.Column(db.String(10))
    remark_user = db.Column(db.Text)
    remark_admin = db.Column(db.Text)
    check_in_time = db.Column(db.DateTime)
    check_out_time = db.Column(db.DateTime)
    decline_reason = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    files = db.relationship('ParticipantFile', backref='participant', lazy=True, cascade='all, delete-orphan')
    abstracts = db.relationship('AbstractSubmission', backref='participant', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Participant {self.name_kor or self.first_name}>'

class ParticipantFile(db.Model):
    __tablename__ = 'participant_files'
    
    id = db.Column(db.Integer, primary_key=True)
    participant_id = db.Column(db.Integer, db.ForeignKey('participants.id', ondelete='CASCADE'), nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    filepath = db.Column(db.String(500), nullable=False)
    file_type = db.Column(db.String(50))  # cv, photo, ppt, script
    file_size = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<ParticipantFile {self.filename}>'


class AbstractSubmission(db.Model):
    __tablename__ = 'abstract_submissions'

    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey('events.id', ondelete='CASCADE'), nullable=False, index=True)
    participant_id = db.Column(db.Integer, db.ForeignKey('participants.id', ondelete='CASCADE'), nullable=False, index=True)
    title = db.Column(db.String(500))
    topic_first = db.Column(db.String(200))
    topic_second = db.Column(db.String(200))
    payload_json = db.Column(db.Text)
    status = db.Column(db.String(20), default='submitted', nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<AbstractSubmission {self.title}>'

# 회원 모델
class Member(db.Model):
    __tablename__ = 'members'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # 로그인 정보
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(200), unique=True, nullable=False)
    
    # 약관 동의
    terms_agreed = db.Column(db.Boolean, default=False)
    terms_agreed_at = db.Column(db.DateTime)
    
    # 프로필 사진
    profile_photo = db.Column(db.String(500))
    
    # 기본정보
    name_kor = db.Column(db.String(100), nullable=False)
    name_eng = db.Column(db.String(100))
    first_name = db.Column(db.String(100))
    last_name = db.Column(db.String(100))
    birth_date = db.Column(db.Date)
    gender = db.Column(db.String(10))  # 남성, 여성
    phone = db.Column(db.String(50))
    mobile = db.Column(db.String(50))
    license_number = db.Column(db.String(100), unique=True)  # 의사면허번호
    
    # 근무처 정보
    workplace_name = db.Column(db.String(200))
    workplace_name_eng = db.Column(db.String(200))
    workplace_type = db.Column(db.String(50))  # 의과대학, 종합병원, 개원, 휴직, 기타
    member_type = db.Column(db.String(50))  # 정회원, 준회원, 종신회원
    position = db.Column(db.String(50))  # 전문의, 전공의, 기타
    specialty = db.Column(db.String(100))  # 신경과, 소아과, 신경외과, 정신과, 기타
    specialty_eng = db.Column(db.String(100))
    department_kor = db.Column(db.String(200))  # 부서명(한글)
    department_eng = db.Column(db.String(200))  # 부서명(영문)
    
    # 주소 정보
    address_postcode = db.Column(db.String(10))
    address = db.Column(db.String(500))
    address_eng = db.Column(db.String(500))
    workplace_phone = db.Column(db.String(50))
    workplace_fax = db.Column(db.String(50))
    mail_receipt_location = db.Column(db.String(20))  # 근무처, 자택
    home_address_postcode = db.Column(db.String(10))
    home_address = db.Column(db.String(500))
    
    # 기타 정보
    alma_mater = db.Column(db.String(200))  # 출신학교(학사)
    major = db.Column(db.String(200))  # 전공과목
    graduation_year = db.Column(db.Integer)  # 졸업년도
    highest_degree = db.Column(db.String(20))  # 학사, 석사, 박사
    residency_institution = db.Column(db.String(200))  # 레지던트(이수기관)
    residency_hospital = db.Column(db.String(200))  # 레지던트(수련병원)
    specialist_year = db.Column(db.Integer)  # 전문의 취득년도
    
    # 정보 공개 및 수신 여부
    profile_public = db.Column(db.Boolean, default=False)  # 개인정보 공개(회원검색)
    sms_receipt = db.Column(db.Boolean, default=False)  # SMS 수신
    email_receipt = db.Column(db.Boolean, default=False)  # 정보메일수신
    mail_receipt = db.Column(db.Boolean, default=False)  # 우편물 수령
    
    # 상태 및 관리
    is_active = db.Column(db.Boolean, default=True)
    is_verified = db.Column(db.Boolean, default=False)  # 이메일 인증 여부
    verification_token = db.Column(db.String(255))
    verification_expires = db.Column(db.DateTime)
    
    # 타임스탬프
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<Member {self.name_kor}>'

# 회원 표시 설정 모델 (관리자가 설정)
class MemberDisplaySettings(db.Model):
    __tablename__ = 'member_display_settings'
    
    id = db.Column(db.Integer, primary_key=True)
    column_name = db.Column(db.String(100), unique=True, nullable=False)
    display_name = db.Column(db.String(100), nullable=False)
    is_visible = db.Column(db.Boolean, default=True)
    display_order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<MemberDisplaySettings {self.column_name}>'

# 향후 확장을 위한 사용자 모델 (회원가입/로그인 기능용)
class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(100))
    last_name = db.Column(db.String(100))
    role = db.Column(db.String(20), default='user')  # admin, user
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<User {self.username}>'

# 세션 관리를 위한 모델
class UserSession(db.Model):
    __tablename__ = 'user_sessions'
    
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.String(255), unique=True, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<UserSession {self.session_id}>' 