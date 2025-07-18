from flask import Flask, render_template, request, redirect, url_for, jsonify, send_file, send_from_directory, after_this_request
import os
import pandas as pd
from werkzeug.utils import secure_filename
from flask_mail import Mail, Message
import unicodedata
import logging
from datetime import datetime
from io import BytesIO
import qrcode
from urllib.parse import urlencode
from urllib.parse import quote, unquote
import uuid
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
import re
from dateutil import parser
from werkzeug.security import generate_password_hash, check_password_hash
from zipfile import ZipFile
import tempfile
import shutil
import zipfile

# SQLAlchemy 및 모델 import
from flask_sqlalchemy import SQLAlchemy
from models import db, Event, Participant, ParticipantFile, User, UserSession, Member, MemberDisplaySettings
from config import config

app = Flask(__name__, static_folder='static')

# 환경 설정
config_name = os.environ.get('FLASK_ENV', 'development')
app.config.from_object(config[config_name])

# SQLAlchemy 초기화
db.init_app(app)

# 로깅 설정
logging.basicConfig(level=logging.DEBUG)

# QR 코드 저장 폴더 설정 (다운로드 폴더로 변경됨)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def generate_qr(number):
    """QR 코드 생성 및 사용자 PC 다운로드 폴더에 저장 (행사명/이벤트ID 폴더 없이)"""
    try:
        qr = qrcode.make(str(number))
        qr_filename = f"{number}.png"
        # 환경에 따른 다운로드 폴더 설정
        if os.path.exists("/app/downloads"):  # Docker 환경 (서버)
            download_base = "/app/downloads"
        else:  # 로컬 환경
            home_dir = os.path.expanduser("~")
            download_base = os.path.join(home_dir, "Downloads")
        download_folder = os.path.join(download_base, "QR_Codes")
        os.makedirs(download_folder, exist_ok=True)
        qr_path = os.path.join(download_folder, qr_filename)
        qr.save(qr_path)
        # 전체 경로 반환
        return qr_path
    except Exception as e:
        logging.error(f"QR generation failed for {number}: {str(e)}")
        raise

# 업로드 폴더 설정
app.config['UPLOAD_FOLDER'] = 'uploads'
SUBFOLDERS = {
    'cv': 'CV',
    'photo': 'Photo',
    'ppt': 'PPT',
    'script': 'Script'
}
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
for subfolder in SUBFOLDERS.values():
    os.makedirs(os.path.join(app.config['UPLOAD_FOLDER'], subfolder), exist_ok=True)
ALLOWED_EXTENSIONS = {'csv', 'xlsx', 'pdf', 'png', 'jpg', 'jpeg', 'docx', 'ppt', 'pptx'}
ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg'}

# 이미지 업로드를 위한 설정 추가
app.config['IMAGE_UPLOAD_FOLDER'] = 'uploads/images'
os.makedirs(app.config['IMAGE_UPLOAD_FOLDER'], exist_ok=True)

# Email Configuration
mail = Mail(app)

def allowed_file(filename, allowed_extensions=ALLOWED_EXTENSIONS):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_extensions

def sanitize(value):
    return value if isinstance(value, str) else str(value)

def clean_text(text):
    return unicodedata.normalize("NFKD", text)

def parse_birth_date(date_str):
    """생년월일 문자열을 date 객체로 변환"""
    if not date_str:
        return None
    
    # 여러 형식 지원
    formats = [
        '%Y/%m/%d',  # 2025/07/08
        '%Y-%m-%d',  # 2025-07-08
        '%Y.%m.%d',  # 2025.07.08
    ]
    
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    
    # 모든 형식이 실패하면 None 반환
    return None

def parse_event_date(date_str):
    """이벤트 날짜 문자열을 date 객체로 변환 (YYYY/MM/DD 또는 YYYY-MM-DD 지원)"""
    for fmt in ('%Y/%m/%d', '%Y-%m-%d'):
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    raise ValueError(f"날짜 형식이 올바르지 않습니다: {date_str}")

def get_form_data(request):
    """폼 데이터를 수집하여 딕셔너리로 반환"""
    return {
        'name_kor': request.form.get('name_kor') or request.args.get('name_kor', ''),
        'email': request.form.get('email') or request.args.get('email', ''),
        'terms_service': request.form.get('terms_service') or request.args.get('terms_service', ''),
        'terms_privacy': request.form.get('terms_privacy') or request.args.get('terms_privacy', ''),
        'username': request.form.get('username', ''),
        'name_eng_first': request.form.get('name_eng_first', ''),
        'name_eng_last': request.form.get('name_eng_last', ''),
        'birth_date': request.form.get('birth_date', ''),
        'gender': request.form.get('gender', ''),
        'phone_prefix': request.form.get('phone_prefix', ''),
        'phone_middle': request.form.get('phone_middle', ''),
        'phone_end': request.form.get('phone_end', ''),
        'mobile_prefix': request.form.get('mobile_prefix', ''),
        'mobile_middle': request.form.get('mobile_middle', ''),
        'mobile_end': request.form.get('mobile_end', ''),
        'license_number': request.form.get('license_number', ''),
        'workplace_name': request.form.get('workplace_name', ''),
        'workplace_name_eng': request.form.get('workplace_name_eng', ''),
        'workplace_type': request.form.get('workplace_type', ''),
        'position': request.form.get('position', ''),
        'specialty': request.form.get('specialty', ''),
        'specialty_eng': request.form.get('specialty_eng', ''),
        'address': request.form.get('address', ''),
        'address_eng': request.form.get('address_eng', ''),
        'workplace_phone_prefix': request.form.get('workplace_phone_prefix', ''),
        'workplace_phone_middle': request.form.get('workplace_phone_middle', ''),
        'workplace_phone_end': request.form.get('workplace_phone_end', ''),
        'workplace_fax_prefix': request.form.get('workplace_fax_prefix', ''),
        'workplace_fax_middle': request.form.get('workplace_fax_middle', ''),
        'workplace_fax_end': request.form.get('workplace_fax_end', ''),
        'mail_receipt_location': request.form.get('mail_receipt_location', ''),
        'home_address': request.form.get('home_address', ''),
        'alma_mater': request.form.get('alma_mater', ''),
        'major': request.form.get('major', ''),
        'graduation_year': request.form.get('graduation_year', ''),
        'highest_degree': request.form.get('highest_degree', ''),
        'residency_institution': request.form.get('residency_institution', ''),
        'residency_hospital': request.form.get('residency_hospital', ''),
        'specialist_year': request.form.get('specialist_year', ''),
        'profile_public': request.form.get('profile_public', ''),
        'sms_receipt': request.form.get('sms_receipt', ''),
        'email_receipt': request.form.get('email_receipt', ''),
        'mail_receipt': request.form.get('mail_receipt', '')
    }

def init_db():
    """데이터베이스 초기화"""
    with app.app_context():
        db.create_all()
        print("Database tables created!")

def get_all_participants_with_attendance():
    """모든 참가자 정보 조회 (출석 정보 포함)"""
    participants = Participant.query.all()
    return [{
        'id': p.id, 'event_id': p.event_id, 'registration': p.registration or '', 
        'division': p.division or '', 'role': p.role or '', 'country': p.country or '', 
        'name_kor': p.name_kor or '', 'affiliation_kor': p.affiliation_kor or '', 
        'department_kor': p.department_kor or '', 'first_name': p.first_name or '', 
        'family_name': p.family_name or '', 'affiliation_eng': p.affiliation_eng or '', 
        'department_eng': p.department_eng or '', 'accept_or_decline': p.accept_or_decline or '', 
        'email': p.email or '', 'phone': p.phone or '', 'position': p.position or '', 
        'license_number': str(p.license_number) if p.license_number else '', 
        'cv': p.cv or '', 'photo': p.photo or '', 'ppt': p.ppt or '', 'script': p.script or '', 
        'agree': p.agree or '', 'remark_user': str(p.remark_user) if p.remark_user else '', 
        'remark_admin': str(p.remark_admin) if p.remark_admin else '', 
        'check_in_time': p.check_in_time.isoformat() if p.check_in_time else '', 
        'check_out_time': p.check_out_time.isoformat() if p.check_out_time else '', 
        'decline_reason': p.decline_reason or ''
    } for p in participants]

def migrate_existing_events():
    """기존 이벤트에 event_id 생성"""
    events = Event.query.filter(Event.event_id.is_(None)).all()
    for event in events:
        event_date = event.start_date
        base_event_id = event_date.strftime('%Y-%m')
        existing_events = Event.query.filter(
            Event.event_id.like(f"{base_event_id}%"),
            Event.id != event.id
        ).all()
        
        if not existing_events:
            new_event_id = base_event_id
        else:
            suffixes = [e.event_id[len(base_event_id) + 1:] for e in existing_events if e.event_id.startswith(base_event_id + '-')]
            if not suffixes:
                new_event_id = f"{base_event_id}-A"
            else:
                last_suffix = sorted(suffixes)[-1]
                next_suffix = chr(ord(last_suffix) + 1)
                new_event_id = f"{base_event_id}-{next_suffix}"
        
        event.event_id = new_event_id
    
    db.session.commit()

def migrate_participant_codes():
    """참가자 코드 생성"""
    events = Event.query.all()
    for event in events:
        participants = Participant.query.filter_by(event_id=event.id).order_by(Participant.id).all()
        for code, participant in enumerate(participants, 1):
            participant.code = code
    
    db.session.commit()

# 데이터베이스 초기화
with app.app_context():
    init_db()
    migrate_existing_events()
    migrate_participant_codes()

@app.route('/')
def index():
    """루트 경로 - 이벤트 페이지로 리다이렉트"""
    return redirect(url_for('admin_event_page'))

@app.route('/compose_email')
def compose_email():
    participant_ids = request.args.get('participants', '')
    return render_template('compose_email.html', participant_ids=participant_ids)

@app.route('/event')
def admin_event_page():
    """행사 관리 페이지"""
    events = db.session.query(
        Event.id, Event.name, Event.start_date, Event.end_date, Event.event_id,
        db.func.count(Participant.id).label('participant_count')
    ).outerjoin(Participant).group_by(
        Event.id, Event.name, Event.start_date, Event.end_date, Event.event_id
    ).all()
    
    return render_template('admin_event.html', events=events)

@app.route('/members')
def members_page():
    """회원 목록 페이지"""
    members = Member.query.order_by(Member.created_at.desc()).all()
    return render_template('admin_members.html', members=members)

@app.route('/add_member', methods=['GET', 'POST'])
def add_member():
    """관리자용 회원 추가 페이지"""
    if request.method == 'POST':
        # 폼 데이터 수집
        form_data = get_form_data(request)
        
        try:
            # 필수 필드 검증
            required_fields = ['username', 'password', 'license_number']
            for field in required_fields:
                if not request.form.get(field):
                    return render_template('add_member.html', 
                                         error=f'{field}을(를) 입력해주세요.',
                                         **form_data)
            
            # 중복 확인
            existing_member = Member.query.filter(
                (Member.username == request.form.get('username')) | 
                (Member.email == request.form.get('email'))
            ).first()
            
            if existing_member:
                return render_template('add_member.html', 
                                     error='이미 등록된 아이디 또는 이메일입니다.',
                                     **form_data)
            
            # 새 회원 생성
            member = Member(
                username=request.form.get('username'),
                password_hash=generate_password_hash(request.form.get('password')),
                email=request.form.get('email'),
                name_kor=request.form.get('name_kor'),
                name_eng=f"{request.form.get('name_eng_first', '')} {request.form.get('name_eng_last', '')}".strip(),
                birth_date=parse_birth_date(request.form.get('birth_date')) if request.form.get('birth_date') else None,
                gender=request.form.get('gender'),
                phone=f"{request.form.get('phone_prefix', '')}-{request.form.get('phone_middle', '')}-{request.form.get('phone_end', '')}" if request.form.get('phone_prefix') else None,
                mobile=f"{request.form.get('mobile_prefix', '')}-{request.form.get('mobile_middle', '')}-{request.form.get('mobile_end', '')}" if request.form.get('mobile_prefix') else None,
                license_number=request.form.get('license_number'),
                workplace_name=request.form.get('workplace_name'),
                workplace_name_eng=request.form.get('workplace_name_eng'),
                workplace_type=request.form.get('workplace_type'),
                position=request.form.get('position'),
                specialty=request.form.get('specialty'),
                specialty_eng=request.form.get('specialty_eng'),
                address=request.form.get('address'),
                address_eng=request.form.get('address_eng'),
                workplace_phone=f"{request.form.get('workplace_phone_prefix')}-{request.form.get('workplace_phone_middle')}-{request.form.get('workplace_phone_end')}" if request.form.get('workplace_phone_prefix') else None,
                workplace_fax=f"{request.form.get('workplace_fax_prefix')}-{request.form.get('workplace_fax_middle')}-{request.form.get('workplace_fax_end')}" if request.form.get('workplace_fax_prefix') else None,
                mail_receipt_location=request.form.get('mail_receipt_location'),
                home_address=request.form.get('home_address'),
                alma_mater=request.form.get('alma_mater'),
                major=request.form.get('major'),
                graduation_year=int(request.form.get('graduation_year')) if request.form.get('graduation_year') else None,
                highest_degree=request.form.get('highest_degree'),
                residency_institution=request.form.get('residency_institution'),
                residency_hospital=request.form.get('residency_hospital'),
                specialist_year=int(request.form.get('specialist_year')) if request.form.get('specialist_year') else None,
                profile_public=request.form.get('profile_public') == 'true',
                sms_receipt=request.form.get('sms_receipt') == 'true',
                email_receipt=request.form.get('email_receipt') == 'true',
                mail_receipt=request.form.get('mail_receipt') == 'true',
                terms_agreed=True,
                terms_agreed_at=datetime.utcnow(),
                is_active=True  # 관리자가 추가하는 회원은 바로 활성화
            )
            
            # 프로필 사진 업로드
            if 'profile_photo' in request.files:
                file = request.files['profile_photo']
                if file and file.filename and allowed_file(file.filename, ALLOWED_IMAGE_EXTENSIONS):
                    filename = secure_filename(file.filename)
                    filepath = os.path.join(app.config['IMAGE_UPLOAD_FOLDER'], f"profile_{member.username}_{filename}")
                    file.save(filepath)
                    member.profile_photo = filepath
            
            db.session.add(member)
            db.session.commit()
            
            return redirect(url_for('members_page'))
            
        except Exception as e:
            db.session.rollback()
            logging.error(f"Error adding member: {str(e)}")
            return render_template('add_member.html', 
                                 error=f'회원 추가 중 오류가 발생했습니다: {str(e)}',
                                 **form_data)
    
    # GET 요청 시 빈 폼 표시
    return render_template('add_member.html')

@app.route('/register/step1', methods=['GET', 'POST'])
def register_step1():
    """회원가입 1단계: 가입확인"""
    if request.method == 'POST':
        name_kor = request.form.get('name_kor')
        email = request.form.get('email')
        
        if not name_kor or not email:
            return render_template('register_step1.html', error='이름과 이메일을 모두 입력해주세요.')
        
        # 기존 회원 재확인
        member = Member.query.filter(
            (Member.name_kor == name_kor) & (Member.email == email)
        ).first()
        
        if member:
            return render_template('register_step1.html', error='이미 등록된 회원입니다.')
        
        # 2단계로 이동
        return redirect(url_for('register_step2', name_kor=name_kor, email=email))
    
    # GET 요청 시 URL 파라미터에서 값 가져오기
    name_kor = request.args.get('name_kor', '')
    email = request.args.get('email', '')
    
    return render_template('register_step1.html', name_kor=name_kor, email=email)

@app.route('/register/step2', methods=['GET', 'POST'])
def register_step2():
    """회원가입 2단계: 약관동의"""
    if request.method == 'POST':
        name_kor = request.form.get('name_kor')
        email = request.form.get('email')
        terms_service = request.form.get('terms_service')
        terms_privacy = request.form.get('terms_privacy')
        
        if not terms_service or not terms_privacy:
            return render_template('register_step2.html', 
                                 error='모든 약관에 동의해주세요.',
                                 name_kor=name_kor, email=email)
        
        # 3단계로 이동
        return redirect(url_for('register_step3', 
                               name_kor=name_kor, 
                               email=email,
                               terms_service=terms_service,
                               terms_privacy=terms_privacy))
    
    # GET 요청 시 URL 파라미터에서 값 가져오기
    name_kor = request.args.get('name_kor', '')
    email = request.args.get('email', '')
    
    return render_template('register_step2.html', name_kor=name_kor, email=email)

@app.route('/register/step3', methods=['GET', 'POST'])
def register_step3():
    """회원가입 3단계: 회원정보 입력"""
    if request.method == 'POST':
        # 폼 데이터 수집
        form_data = get_form_data(request)
        
        try:
            # 필수 필드 검증
            required_fields = ['username', 'password', 'password_confirm', 'license_number']
            for field in required_fields:
                if not request.form.get(field):
                    return render_template('register_step3.html', 
                                         error=f'{field}을(를) 입력해주세요.',
                                         **form_data)
            
            # 비밀번호 확인
            if request.form.get('password') != request.form.get('password_confirm'):
                return render_template('register_step3.html', 
                                     error='비밀번호가 일치하지 않습니다.',
                                     **form_data)
            
            # 중복 확인
            existing_member = Member.query.filter(
                (Member.username == request.form.get('username')) | 
                (Member.email == request.form.get('email'))
            ).first()
            
            if existing_member:
                return render_template('register_step3.html', 
                                     error='이미 등록된 아이디 또는 이메일입니다.',
                                     **form_data)
            
            # 새 회원 생성
            member = Member(
                username=request.form.get('username'),
                password_hash=generate_password_hash(request.form.get('password')),
                email=request.form.get('email'),
                name_kor=request.form.get('name_kor'),
                name_eng=f"{request.form.get('name_eng_first', '')} {request.form.get('name_eng_last', '')}".strip(),
                birth_date=parse_birth_date(request.form.get('birth_date')) if request.form.get('birth_date') else None,
                gender=request.form.get('gender'),
                phone=f"{request.form.get('phone_prefix', '')}-{request.form.get('phone_middle', '')}-{request.form.get('phone_end', '')}" if request.form.get('phone_prefix') else None,
                mobile=f"{request.form.get('mobile_prefix', '')}-{request.form.get('mobile_middle', '')}-{request.form.get('mobile_end', '')}" if request.form.get('mobile_prefix') else None,
                license_number=request.form.get('license_number'),
                workplace_name=request.form.get('workplace_name'),
                workplace_name_eng=request.form.get('workplace_name_eng'),
                workplace_type=request.form.get('workplace_type'),
                position=request.form.get('position'),
                specialty=request.form.get('specialty'),
                specialty_eng=request.form.get('specialty_eng'),
                address=request.form.get('address'),
                address_eng=request.form.get('address_eng'),
                workplace_phone=f"{request.form.get('workplace_phone_prefix')}-{request.form.get('workplace_phone_middle')}-{request.form.get('workplace_phone_end')}" if request.form.get('workplace_phone_prefix') else None,
                workplace_fax=f"{request.form.get('workplace_fax_prefix')}-{request.form.get('workplace_fax_middle')}-{request.form.get('workplace_fax_end')}" if request.form.get('workplace_fax_prefix') else None,
                mail_receipt_location=request.form.get('mail_receipt_location'),
                home_address=request.form.get('home_address'),
                alma_mater=request.form.get('alma_mater'),
                major=request.form.get('major'),
                graduation_year=int(request.form.get('graduation_year')) if request.form.get('graduation_year') else None,
                highest_degree=request.form.get('highest_degree'),
                residency_institution=request.form.get('residency_institution'),
                residency_hospital=request.form.get('residency_hospital'),
                specialist_year=int(request.form.get('specialist_year')) if request.form.get('specialist_year') else None,
                profile_public=request.form.get('profile_public') == 'true',
                sms_receipt=request.form.get('sms_receipt') == 'true',
                email_receipt=request.form.get('email_receipt') == 'true',
                mail_receipt=request.form.get('mail_receipt') == 'true',
                terms_agreed=True,
                terms_agreed_at=datetime.utcnow()
            )
            
            # 프로필 사진 업로드
            if 'profile_photo' in request.files:
                file = request.files['profile_photo']
                if file and file.filename and allowed_file(file.filename, ALLOWED_IMAGE_EXTENSIONS):
                    filename = secure_filename(file.filename)
                    filepath = os.path.join(app.config['IMAGE_UPLOAD_FOLDER'], f"profile_{member.username}_{filename}")
                    file.save(filepath)
                    member.profile_photo = filepath
            
            db.session.add(member)
            db.session.commit()
            
            # 4단계로 이동
            return redirect(url_for('register_step4', success='회원가입이 완료되었습니다. 관리자 승인 후 로그인이 가능합니다.'))
            
        except Exception as e:
            db.session.rollback()
            logging.error(f"Error during registration: {str(e)}")
            return render_template('register_step3.html', 
                                 error=f'회원가입 중 오류가 발생했습니다: {str(e)}',
                                 **form_data)
    
    # GET 요청 시 URL 파라미터에서 값 가져오기
    form_data = get_form_data(request)
    return render_template('register_step3.html', **form_data)

@app.route('/register/step4')
def register_step4():
    """회원가입 4단계: 가입완료"""
    success = request.args.get('success', '')
    return render_template('register_step4.html', success=success)

@app.route('/api/check-username', methods=['POST'])
def check_username():
    """아이디 중복확인 API"""
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        
        if not username:
            return jsonify({'available': False, 'error': '아이디를 입력해주세요.'})
        
        # 아이디 형식 검사 (4~20자 영문소문자, 숫자)
        import re
        if not re.match(r'^[a-z0-9]{4,20}$', username):
            return jsonify({'available': False, 'error': '아이디는 4~20자의 영문소문자와 숫자만 사용 가능합니다.'})
        
        # 데이터베이스에서 중복 확인
        existing_member = Member.query.filter_by(username=username).first()
        
        if existing_member:
            return jsonify({'available': False, 'message': '이미 사용 중인 아이디입니다.'})
        else:
            return jsonify({'available': True, 'message': '사용 가능한 아이디입니다.'})
            
    except Exception as e:
        logging.error(f"Error checking username: {str(e)}")
        return jsonify({'available': False, 'error': '중복확인 중 오류가 발생했습니다.'})

@app.route('/api/check-license', methods=['POST'])
def check_license():
    """의사면허번호 중복확인 API"""
    try:
        data = request.get_json()
        license_number = data.get('license_number', '').strip()
        
        if not license_number:
            return jsonify({'available': False, 'error': '의사면허번호를 입력해주세요.'})
        
        # 데이터베이스에서 중복 확인
        existing_member = Member.query.filter_by(license_number=license_number).first()
        
        if existing_member:
            return jsonify({'available': False, 'message': '이미 등록된 의사면허번호입니다.'})
        else:
            return jsonify({'available': True, 'message': '사용 가능한 의사면허번호입니다.'})
            
    except Exception as e:
        logging.error(f"Error checking license: {str(e)}")
        return jsonify({'available': False, 'error': '중복확인 중 오류가 발생했습니다.'})

@app.route('/members/delete', methods=['POST'])
def delete_members():
    """회원 삭제"""
    selected_members = request.form.getlist('selected_members')
    if selected_members:
        member_ids = [int(member_id) for member_id in selected_members]
        Member.query.filter(Member.id.in_(member_ids)).delete(synchronize_session=False)
        db.session.commit()
    return redirect(url_for('members_page'))

@app.route('/members/edit/<int:member_id>', methods=['GET', 'POST'])
def edit_member(member_id):
    """회원 정보 수정"""
    member = Member.query.get_or_404(member_id)
    
    if request.method == 'POST':
        try:
            # 폼 데이터로 회원 정보 업데이트
            member.username = request.form.get('username')
            member.email = request.form.get('email')
            member.name_kor = request.form.get('name_kor')
            member.name_eng = f"{request.form.get('name_eng_first', '')} {request.form.get('name_eng_last', '')}".strip()
            member.birth_date = parse_birth_date(request.form.get('birth_date')) if request.form.get('birth_date') else None
            member.gender = request.form.get('gender')
            member.phone = f"{request.form.get('phone_prefix', '')}-{request.form.get('phone_middle', '')}-{request.form.get('phone_end', '')}" if request.form.get('phone_prefix') else None
            member.mobile = f"{request.form.get('mobile_prefix', '')}-{request.form.get('mobile_middle', '')}-{request.form.get('mobile_end', '')}" if request.form.get('mobile_prefix') else None
            member.license_number = request.form.get('license_number')
            member.workplace_name = request.form.get('workplace_name')
            member.workplace_name_eng = request.form.get('workplace_name_eng')
            member.workplace_type = request.form.get('workplace_type')
            member.position = request.form.get('position')
            member.specialty = request.form.get('specialty')
            member.specialty_eng = request.form.get('specialty_eng')
            member.address = request.form.get('address')
            member.address_eng = request.form.get('address_eng')
            member.workplace_phone = f"{request.form.get('workplace_phone_prefix')}-{request.form.get('workplace_phone_middle')}-{request.form.get('workplace_phone_end')}" if request.form.get('workplace_phone_prefix') else None
            member.workplace_fax = f"{request.form.get('workplace_fax_prefix')}-{request.form.get('workplace_fax_middle')}-{request.form.get('workplace_fax_end')}" if request.form.get('workplace_fax_prefix') else None
            member.mail_receipt_location = request.form.get('mail_receipt_location')
            member.home_address = request.form.get('home_address')
            member.alma_mater = request.form.get('alma_mater')
            member.major = request.form.get('major')
            member.graduation_year = int(request.form.get('graduation_year')) if request.form.get('graduation_year') else None
            member.highest_degree = request.form.get('highest_degree')
            member.residency_institution = request.form.get('residency_institution')
            member.residency_hospital = request.form.get('residency_hospital')
            member.specialist_year = int(request.form.get('specialist_year')) if request.form.get('specialist_year') else None
            member.profile_public = request.form.get('profile_public') == 'true'
            member.sms_receipt = request.form.get('sms_receipt') == 'true'
            member.email_receipt = request.form.get('email_receipt') == 'true'
            member.mail_receipt = request.form.get('mail_receipt') == 'true'
            
            # 비밀번호 변경 (입력된 경우에만)
            if request.form.get('password'):
                if request.form.get('password') != request.form.get('password_confirm'):
                    return render_template('edit_member.html', member=member, error='비밀번호가 일치하지 않습니다.')
                member.password_hash = generate_password_hash(request.form.get('password'))
            
            # 프로필 사진 업로드
            if 'profile_photo' in request.files:
                file = request.files['profile_photo']
                if file and allowed_file(file.filename, ALLOWED_IMAGE_EXTENSIONS):
                    filename = secure_filename(file.filename)
                    filepath = os.path.join(app.config['IMAGE_UPLOAD_FOLDER'], f"profile_{member.username}_{filename}")
                    file.save(filepath)
                    member.profile_photo = filepath
            
            db.session.commit()
            return redirect(url_for('members_page'))
            
        except Exception as e:
            db.session.rollback()
            logging.error(f"Error updating member: {str(e)}")
            return render_template('edit_member.html', member=member, error=f'회원 정보 수정 중 오류가 발생했습니다: {str(e)}')
    
    # GET 요청 시 회원 정보를 폼에 미리 채움
    return render_template('edit_member.html', member=member)

@app.route('/members/export')
def export_members():
    """회원 목록 Excel 다운로드"""
    members = Member.query.all()
    
    # DataFrame 생성
    data = []
    for member in members:
        data.append({
            '아이디': member.username,
            '이름': member.name_kor,
            '이름(영문)': member.name_eng,
            '이메일': member.email,
            '생년월일': member.birth_date.strftime('%Y-%m-%d') if member.birth_date else '',
            '성별': member.gender,
            '전화번호': member.phone,
            '휴대전화': member.mobile,
            '의사면허번호': member.license_number or '',
            '근무처명': member.workplace_name,
            '근무처명(영문)': member.workplace_name_eng,
            '근무처구분': member.workplace_type,
            '직위': member.position,
            '진료과목': member.specialty,
            '진료과목(영문)': member.specialty_eng,
            '주소': member.address,
            '주소(영문)': member.address_eng,
            '근무처전화': member.workplace_phone,
            '근무처FAX': member.workplace_fax,
            '우편물수령장소': member.mail_receipt_location,
            '자택주소': member.home_address,
            '출신학교': member.alma_mater,
            '전공과목': member.major,
            '졸업년도': member.graduation_year,
            '최종학위': member.highest_degree,
            '레지던트(이수기관)': member.residency_institution,
            '레지던트(수련병원)': member.residency_hospital,
            '전문의취득년도': member.specialist_year,
            '개인정보공개': '공개' if member.profile_public else '비공개',
            'SMS수신': '받음' if member.sms_receipt else '받지않음',
            '정보메일수신': '받음' if member.email_receipt else '받지않음',
            '우편물수령': '받음' if member.mail_receipt else '받지않음',
            '상태': '활성' if member.is_active else '비활성',
            '가입일': member.created_at.strftime('%Y-%m-%d %H:%M:%S') if member.created_at else ''
        })
    
    df = pd.DataFrame(data)
    
    # Excel 파일 생성
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='회원목록', index=False)
    
    output.seek(0)
    
    return send_file(
        output,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name=f'회원목록_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
    )

@app.route('/create_event', methods=['POST'])
def create_event():
    """이벤트 생성"""
    name = request.form['name']
    start_date = parse_event_date(request.form['start_date'])
    end_date = parse_event_date(request.form['end_date'])
    
    # event_id 생성
    base_event_id = start_date.strftime('%Y-%m')
    existing_events = Event.query.filter(Event.event_id.like(f"{base_event_id}%")).all()
    
    if not existing_events:
        event_id = base_event_id
    else:
        suffixes = [e.event_id[len(base_event_id) + 1:] for e in existing_events if e.event_id.startswith(base_event_id + '-')]
        if not suffixes:
            event_id = f"{base_event_id}-A"
        else:
            last_suffix = sorted(suffixes)[-1]
            next_suffix = chr(ord(last_suffix) + 1)
            event_id = f"{base_event_id}-{next_suffix}"
    
    new_event = Event(name=name, start_date=start_date, end_date=end_date, event_id=event_id)
    db.session.add(new_event)
    db.session.commit()
    
    return redirect(url_for('admin_event_page'))

@app.route('/get_files/<int:participant_id>', methods=['GET'])
def get_files(participant_id):
    """참가자 파일 목록 조회"""
    files = ParticipantFile.query.filter_by(participant_id=participant_id).all()
    return jsonify([{
        'id': f.id,
        'filename': f.filename,
        'filepath': f.filepath,
        'file_type': f.file_type,
        'file_size': f.file_size
    } for f in files])

@app.route('/download_file/<int:file_id>', methods=['GET'])
def download_file(file_id):
    """파일 다운로드"""
    file_record = ParticipantFile.query.get_or_404(file_id)
    try:
        return send_file(file_record.filepath, as_attachment=True, download_name=file_record.filename)
    except Exception as e:
        logging.error(f"File download failed: {e}")
        return "File not found", 404

@app.route('/delete_events', methods=['POST'])
def delete_events():
    """이벤트 삭제"""
    selected_events = request.form.getlist('selected_events')
    if selected_events:
        # 문자열을 정수로 변환
        event_ids = [int(event_id) for event_id in selected_events]
        Event.query.filter(Event.id.in_(event_ids)).delete(synchronize_session=False)
        db.session.commit()
    return redirect(url_for('admin_event_page'))

@app.route('/event/<int:event_id>')
def participant_management(event_id):
    """참가자 관리 페이지"""
    event = Event.query.get_or_404(event_id)
    participants = Participant.query.filter_by(event_id=event_id).all()
    
    # 튜플 형태로 변환 (기존 템플릿 호환성)
    event_tuple = (event.id, event.name, event.start_date, event.end_date, event.event_id)
    participants_tuples = []
    
    for p in participants:
        participants_tuples.append((
            p.id, p.event_id, p.code, p.registration, p.division, p.role, p.country,
            p.name_kor, p.affiliation_kor, p.department_kor, p.first_name, p.family_name,
            p.affiliation_eng, p.department_eng, p.accept_or_decline, p.email, p.phone,
            p.position, p.license_number, p.cv, p.photo, p.ppt, p.script, p.agree,
            p.remark_user, p.remark_admin, p.check_in_time, p.check_out_time, p.decline_reason
        ))
    
    return render_template('admin_participants.html', event=event_tuple, participants=participants_tuples)

@app.route('/add_participant/<int:event_id>', methods=['GET', 'POST'])
def add_participant(event_id):
    """참가자 추가"""
    event = Event.query.get_or_404(event_id)
    
    if request.method == 'POST':
        try:
            # 폼 데이터 처리
            participant = Participant(
                event_id=event_id,
                registration=request.form.get('registration'),
                division=request.form.get('division'),
                role=request.form.get('role'),
                country=request.form.get('country'),
                name_kor=request.form.get('name_kor'),
                affiliation_kor=request.form.get('affiliation_kor'),
                department_kor=request.form.get('department_kor'),
                first_name=request.form.get('first_name'),
                family_name=request.form.get('family_name'),
                affiliation_eng=request.form.get('affiliation_eng'),
                department_eng=request.form.get('department_eng'),
                accept_or_decline=request.form.get('accept_or_decline'),
                email=request.form.get('email'),
                phone=request.form.get('phone'),
                position=request.form.get('position'),
                license_number=request.form.get('license_number'),
                agree=request.form.get('agree'),
                remark_user=request.form.get('remark_user'),
                remark_admin=request.form.get('remark_admin')
            )
            
            # 파일 업로드 처리
            for field in ['cv', 'photo', 'ppt', 'script']:
                if field in request.files:
                    file = request.files[field]
                    if file and file.filename and allowed_file(file.filename):
                        filename = secure_filename(file.filename)
                        filepath = os.path.join(app.config['UPLOAD_FOLDER'], SUBFOLDERS.get(field, ''), filename)
                        file.save(filepath)
                        setattr(participant, field, filepath)
            
            db.session.add(participant)
            db.session.commit()
            
            # 참가자 코드 자동 생성
            if not participant.code:
                # 해당 이벤트의 최대 코드 번호 찾기
                max_code = db.session.query(db.func.max(Participant.code)).filter_by(event_id=event_id).scalar()
                participant.code = (max_code or 0) + 1
                db.session.commit()
            
            return redirect(url_for('participant_management', event_id=event_id))
            
        except Exception as e:
            db.session.rollback()
            logging.error(f"Error adding participant: {str(e)}")
            return render_template('add_participant.html', event=event, error=f"참가자 추가 중 오류가 발생했습니다: {str(e)}")
    
    return render_template('add_participant.html', event=event)

@app.route('/upload_participants/<int:event_id>', methods=['GET', 'POST'])
def upload_participants(event_id):
    """참가자 일괄 업로드"""
    event = Event.query.get_or_404(event_id)
    
    def parse_datetime_or_none(val):
        try:
            if pd.isna(val) or val in ['', 'nan', 'NaN', None]:
                return None
            return parser.parse(str(val))
        except Exception:
            return None
    
    if request.method == 'POST':
        if 'file' not in request.files:
            logging.error("No file uploaded")
            return 'No file uploaded', 400
        
        file = request.files['file']
        if file.filename == '':
            logging.error("No file selected")
            return 'No file selected', 400
        
        logging.info(f"Processing file: {file.filename}")
        
        if file and allowed_file(file.filename, {'csv', 'xlsx'}):
            try:
                if file.filename.endswith('.csv'):
                    df = pd.read_csv(file, encoding='utf-8', dtype=str, na_values=['nan', 'NaN', ''], keep_default_na=False)
                else:
                    df = pd.read_excel(file, dtype=str, na_values=['nan', 'NaN', ''], keep_default_na=False)
                
                logging.info(f"File loaded successfully. Shape: {df.shape}")
                logging.info(f"Original columns: {list(df.columns)}")
                
                # NaN 값을 빈 문자열로 변환
                df = df.fillna('')
                
                # 컬럼명 정규화 (소문자로 변환하고 공백 제거)
                df.columns = [col.lower().strip() for col in df.columns]
                logging.info(f"Normalized columns: {list(df.columns)}")
                
                # 컬럼명 매핑 (admin.py와 동일)
                column_mapping = {
                    'name_kor': 'name (kor)', 'affiliation_kor': 'affiliation (kor)', 'department_kor': 'department (kor)',
                    'first_name': 'first name', 'family_name': 'family name', 'affiliation_eng': 'affiliation (eng)',
                    'department_eng': 'department (eng)', 'accept_or_decline': 'accept or decline', 'license_number': 'license #',
                    'remark_user': 'remark (user)', 'remark_admin': 'remark (admin)', 'check_in_time': 'check_in_time',
                    'check_out_time': 'check_out_time', 'decline_reason': 'decline_reason'
                }
                df.rename(columns=column_mapping, inplace=True)
                logging.info(f"After mapping columns: {list(df.columns)}")
                
                # 모든 가능한 컬럼
                all_columns = [
                    'registration', 'division', 'role', 'country', 'name (kor)', 'affiliation (kor)', 'department (kor)',
                    'first name', 'family name', 'affiliation (eng)', 'department (eng)', 'accept or decline',
                    'email', 'phone', 'position', 'license #', 'cv', 'photo', 'ppt', 'script', 'agree',
                    'remark (user)', 'remark (admin)', 'check_in_time', 'check_out_time', 'decline_reason'
                ]
                present_columns = [col for col in all_columns if col in df.columns]
                missing_columns = [col for col in all_columns if col not in df.columns]
                
                logging.info(f"Present columns: {present_columns}")
                logging.info(f"Missing columns: {missing_columns}")
                logging.info(f"First row data: {df.iloc[0].to_dict() if len(df) > 0 else 'No data'}")
                
                # 데이터 처리 및 저장
                participants_added = 0
                for index, row in df.iterrows():
                    try:
                        sanitized_data = {}
                        for key in all_columns:
                            value = row.get(key, '').strip() if key in row else ''
                            # datetime 필드의 경우 빈 값이면 None으로 설정
                            if key in ['check_in_time', 'check_out_time']:
                                sanitized_data[key] = value if value else None
                            else:
                                sanitized_data[key] = value
                        
                        # 최소한의 필수 데이터 확인
                        if not sanitized_data.get('name (kor)') and not sanitized_data.get('first name'):
                            logging.warning(f"Row {index}: Missing name data, skipping")
                            continue
                        
                        participant = Participant(
                            event_id=event_id,
                            registration=sanitized_data.get('registration', ''),
                            division=sanitized_data.get('division', ''),
                            role=sanitized_data.get('role', ''),
                            country=sanitized_data.get('country', ''),
                            name_kor=sanitized_data.get('name (kor)', ''),
                            affiliation_kor=sanitized_data.get('affiliation (kor)', ''),
                            department_kor=sanitized_data.get('department (kor)', ''),
                            first_name=sanitized_data.get('first name', ''),
                            family_name=sanitized_data.get('family name', ''),
                            affiliation_eng=sanitized_data.get('affiliation (eng)', ''),
                            department_eng=sanitized_data.get('department (eng)', ''),
                            accept_or_decline=sanitized_data.get('accept or decline', ''),
                            email=sanitized_data.get('email', ''),
                            phone=sanitized_data.get('phone', ''),
                            position=sanitized_data.get('position', ''),
                            license_number=sanitized_data.get('license #', ''),
                            agree=sanitized_data.get('agree', ''),
                            remark_user=sanitized_data.get('remark (user)', ''),
                            remark_admin=sanitized_data.get('remark (admin)', ''),
                            check_in_time=sanitized_data.get('check_in_time') if sanitized_data.get('check_in_time') else None,
                            check_out_time=sanitized_data.get('check_out_time') if sanitized_data.get('check_out_time') else None,
                            decline_reason=sanitized_data.get('decline_reason', '')
                        )
                        db.session.add(participant)
                        participants_added += 1
                        logging.info(f"Added participant {participants_added}: {sanitized_data.get('name (kor)', sanitized_data.get('first name', 'Unknown'))}")
                    except Exception as e:
                        logging.error(f"Error processing row {index}: {e}")
                        continue
                
                logging.info(f"Attempting to commit {participants_added} participants to database")
                db.session.commit()
                logging.info(f"Successfully committed {participants_added} participants")
                
                # 참가자 코드 자동 생성 (기존 코드 다음부터 시작)
                # 현재 이벤트의 최대 코드 번호 찾기
                max_code = db.session.query(db.func.max(Participant.code)).filter_by(event_id=event_id).scalar()
                start_code = (max_code or 0) + 1
                
                # 코드가 없는 참가자들에 대해 순차적으로 코드 부여
                participants = Participant.query.filter_by(event_id=event_id).filter(Participant.code.is_(None)).all()
                for i, participant in enumerate(participants, start_code):
                    participant.code = i
                db.session.commit()
                logging.info(f"Generated codes for {len(participants)} participants starting from {start_code}")
                
                # 누락 컬럼 경고 메시지(선택)
                if missing_columns:
                    logging.warning(f"Missing columns: {missing_columns}")
                    return f'업로드 완료 - {participants_added}명 추가됨 (누락 컬럼: {", ".join(missing_columns)})', 200
                
                logging.info(f"Upload completed successfully. {participants_added} participants added.")
                return redirect(url_for('participant_management', event_id=event_id))
            except Exception as e:
                logging.error(f"Upload failed: {e}")
                db.session.rollback()
                return f'Upload failed: {str(e)}', 500
        else:
            logging.error(f"Invalid file type: {file.filename}")
            return 'Invalid file type. Please upload CSV or Excel file.', 400
    
    return render_template('upload_participant.html', event=event)

@app.route('/delete_file/<int:file_id>', methods=['POST'])
def delete_file(file_id):
    """파일 삭제"""
    file_record = ParticipantFile.query.get_or_404(file_id)
    try:
        if os.path.exists(file_record.filepath):
            os.remove(file_record.filepath)
        db.session.delete(file_record)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        logging.error(f"File deletion failed: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/delete_participants/<int:event_id>', methods=['POST'])
def delete_participants(event_id):
    """참가자 삭제"""
    selected_participants = request.form.getlist('selected_participants')
    if selected_participants:
        # 문자열을 정수로 변환
        participant_ids = [int(participant_id) for participant_id in selected_participants]
        Participant.query.filter(Participant.id.in_(participant_ids)).delete(synchronize_session=False)
        db.session.commit()
    return redirect(url_for('participant_management', event_id=event_id))

@app.route('/edit_participant/<int:participant_id>', methods=['GET', 'POST'])
def edit_participant(participant_id):
    """참가자 편집"""
    participant = Participant.query.get_or_404(participant_id)
    
    if request.method == 'POST':
        # 폼 데이터 업데이트
        participant.registration = request.form.get('registration')
        participant.division = request.form.get('division')
        participant.role = request.form.get('role')
        participant.country = request.form.get('country')
        participant.name_kor = request.form.get('name_kor')
        participant.affiliation_kor = request.form.get('affiliation_kor')
        participant.department_kor = request.form.get('department_kor')
        participant.first_name = request.form.get('first_name')
        participant.family_name = request.form.get('family_name')
        participant.affiliation_eng = request.form.get('affiliation_eng')
        participant.department_eng = request.form.get('department_eng')
        participant.accept_or_decline = request.form.get('accept_or_decline')
        participant.email = request.form.get('email')
        participant.phone = request.form.get('phone')
        participant.position = request.form.get('position')
        participant.license_number = request.form.get('license_number')
        participant.agree = request.form.get('agree')
        participant.remark_user = request.form.get('remark_user')
        participant.remark_admin = request.form.get('remark_admin')
        
        # 파일 업로드 처리
        for field in ['cv', 'photo', 'ppt', 'script']:
            if field in request.files:
                file = request.files[field]
                if file and allowed_file(file.filename):
                    filename = secure_filename(file.filename)
                    filepath = os.path.join(app.config['UPLOAD_FOLDER'], SUBFOLDERS.get(field, ''), filename)
                    file.save(filepath)
                    setattr(participant, field, filepath)
        
        db.session.commit()
        return redirect(url_for('participant_management', event_id=participant.event_id))
    
    return render_template('edit_participant.html', participant=participant)

@app.route('/delete_file_field/<int:participant_id>/<string:field>', methods=['POST'])
def delete_file_field(participant_id, field):
    """특정 파일 필드 삭제"""
    participant = Participant.query.get_or_404(participant_id)
    if hasattr(participant, field):
        filepath = getattr(participant, field)
        if filepath and os.path.exists(filepath):
            os.remove(filepath)
        setattr(participant, field, None)
        db.session.commit()
    return jsonify({'success': True})

@app.route('/upload_image', methods=['POST'])
def upload_image():
    """이미지 업로드 (이메일용)"""
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if file and allowed_file(file.filename, ALLOWED_IMAGE_EXTENSIONS):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['IMAGE_UPLOAD_FOLDER'], filename)
        file.save(filepath)
        return jsonify({'url': f'/uploads/images/{filename}'})
    
    return jsonify({'error': 'Invalid file type'}), 400

@app.route('/send_email', methods=['POST'])
def send_email():
    participant_ids = request.form.get('participant_ids', '').split(',')
    participant_ids = [int(pid) for pid in participant_ids if pid.strip().isdigit()]
    subject = request.form.get('subject', '')
    body = request.form.get('body', '')
    cc = request.form.get('cc', '')
    include_buttons = request.form.get('include_buttons') == 'yes'
    
    if not participant_ids or not subject or not body:
        return jsonify({'status': 'error', 'message': 'Missing required fields'}), 400
    
    participants = Participant.query.filter(Participant.id.in_(participant_ids)).all()
    recipient_emails = [p.email for p in participants if p.email]
    if not recipient_emails:
        return jsonify({'status': 'error', 'message': 'No valid recipient emails found.'}), 400
    
    def replace_img_src(match):
        img_tag = match.group(0)
        src_match = re.search(r'src="([^"]+)"', img_tag)
        if src_match:
            img_path = src_match.group(1)
            if img_path.startswith('/uploads/images/'):
                full_path = os.path.join(BASE_DIR, img_path.lstrip('/'))
                if os.path.exists(full_path):
                    with open(full_path, 'rb') as img_file:
                        img_data = img_file.read()
                    return f'<img src="cid:image_{hash(img_path)}" style="max-width: 100%; height: auto;">'
        return img_tag
    
    body = re.sub(r'<img[^>]+>', replace_img_src, body)
    
    try:
        for participant in participants:
            if participant.email:
                # 각 참가자별로 실제 동작하는 URL 생성
                accept_url = url_for('accept_response', participant_id=participant.id, response='accept', _external=True)
                decline_url = url_for('accept_response', participant_id=participant.id, response='decline', _external=True)
                email_body = body
                if include_buttons:
                    email_body += '<br><br>'
                    email_body += f'<a href="{accept_url}" style="padding:10px 20px;background:#4CAF50;color:white;text-decoration:none;border-radius:5px;">Accept</a> '
                    email_body += f'<a href="{decline_url}" style="padding:10px 20px;background:#F44336;color:white;text-decoration:none;border-radius:5px;">Decline</a>'
                msg = Message(
                    subject=subject,
                    recipients=[participant.email],
                    html=email_body
                )
                if cc:
                    msg.cc = [email.strip() for email in cc.split(',') if email.strip()]
                img_pattern = r'<img[^>]+src="([^"]+)"[^>]*>'
                for img_match in re.finditer(img_pattern, email_body):
                    img_path = img_match.group(1)
                    if img_path.startswith('/uploads/images/'):
                        full_path = os.path.join(BASE_DIR, img_path.lstrip('/'))
                        if os.path.exists(full_path):
                            with open(full_path, 'rb') as img_file:
                                msg.attach(
                                    f'image_{hash(img_path)}.png',
                                    'image/png',
                                    img_file.read(),
                                    'inline',
                                    headers=[('Content-ID', f'<image_{hash(img_path)}>')]
                                )
                mail.send(msg)
        return jsonify({'status': 'success', 'message': f'Email sent to {len(recipient_emails)} participants'})
    except Exception as e:
        logging.error(f"Email sending failed: {e}")
        return jsonify({'status': 'error', 'message': f'Failed to send email: {str(e)}'}), 500

@app.route('/uploads/images/<filename>')
def serve_image(filename):
    """이미지 파일 서빙"""
    return send_from_directory(app.config['IMAGE_UPLOAD_FOLDER'], filename)

@app.route('/decline_popup', methods=['GET'])
def decline_popup():
    """거절 사유 팝업"""
    participant_id = request.args.get('participant_id')
    return render_template('decline_reason.html', participant_id=participant_id)

@app.route('/accept_response', methods=['GET', 'POST'])
def accept_response():
    """참가자 응답 처리"""
    if request.method == 'GET':
        participant_id = request.args.get('participant_id')
        response = request.args.get('response')  # 'accept' or 'decline'
        participant = Participant.query.get(participant_id) if participant_id else None
        
        # Accept인 경우 즉시 처리
        if response == 'accept' and participant:
            participant.accept_or_decline = 'Accept'
            participant.decline_reason = None
            db.session.commit()
        
        return render_template('accept_response.html', participant=participant, response=response)
    
    elif request.method == 'POST':
        participant_id = request.form.get('participant_id')
        response = request.form.get('response')
        decline_reason = request.form.get('decline_reason', '')
        
        participant = Participant.query.get_or_404(participant_id)
        
        if response == 'accept':
            participant.accept_or_decline = 'Accept'
            participant.decline_reason = None
        elif response == 'decline':
            participant.accept_or_decline = 'Decline'
            participant.decline_reason = decline_reason
        
        db.session.commit()
        
        return jsonify({'success': True})

@app.route('/view_decline_reason/<int:participant_id>')
def view_decline_reason(participant_id):
    """거절 사유 조회"""
    participant = Participant.query.get_or_404(participant_id)
    return jsonify({'decline_reason': participant.decline_reason or ''})

@app.route('/participant_by_code', methods=['GET'])
def get_participant_by_code():
    code = request.args.get('code')
    event_id = request.args.get('event_id')
    if not code or not event_id:
        return jsonify({'status': 'error', 'message': 'Code and event_id are required'}), 400
    try:
        code = int(code)
        event_id = int(event_id)
    except Exception:
        return jsonify({'status': 'error', 'message': 'Invalid code or event_id'}), 400
    participant = Participant.query.filter_by(code=code, event_id=event_id).first()
    if not participant:
        return jsonify({'status': 'error', 'message': '참가자를 찾을 수 없습니다.'}), 404
    return jsonify({
        'status': 'success',
        'participant': {
        'id': participant.id,
            'name_kor': participant.name_kor or f"{participant.first_name} {participant.family_name}",
        'event_id': participant.event_id,
            'accept_or_decline': participant.accept_or_decline,
            'check_in_time': participant.check_in_time.strftime('%Y-%m-%d %H:%M:%S') if participant.check_in_time else None,
            'check_out_time': participant.check_out_time.strftime('%Y-%m-%d %H:%M:%S') if participant.check_out_time else None
        }
    })

@app.route('/participant/check_attendance_by_code', methods=['POST'])
def check_attendance_by_code():
    """통합 출석 처리: 첫 번째는 체크인, 그 다음부터는 체크아웃"""
    code = request.form.get('code') or request.args.get('code')
    event_id = request.form.get('event_id') or request.args.get('event_id')
    if not code or not event_id:
        return jsonify({'status': 'error', 'message': 'Code and event_id are required'}), 400
    try:
        code = int(code)
        event_id = int(event_id)
    except Exception:
        return jsonify({'status': 'error', 'message': 'Invalid code or event_id'}), 400
    
    participant = Participant.query.filter_by(code=code, event_id=event_id).first()
    if not participant:
        return jsonify({'status': 'error', 'message': 'Participant not found'}), 404
    
    from datetime import datetime, timezone, timedelta
    
    # 서버 환경 자동 감지 및 한국 시간 계산
    import os
    import time
    
    # 시스템 시간대 확인
    try:
        # 시스템 시간대 정보 가져오기
        timezone_info = time.tzname[time.daylight]
        print(f"DEBUG: System timezone: {timezone_info}")
        
        # 환경변수로 시간대 확인
        env_tz = os.environ.get('TZ', '')
        print(f"DEBUG: Environment TZ: {env_tz}")
        
        # 현재 로컬 시간과 UTC 시간 비교
        local_time = datetime.now()
        utc_time = datetime.now(timezone.utc)
        
        print(f"DEBUG: Local time: {local_time}")
        print(f"DEBUG: UTC time: {utc_time}")
        print(f"DEBUG: Time difference: {local_time.hour - utc_time.hour} hours")
        
        # 한국 시간대인지 확인 (KST, Asia/Seoul, +09:00 등)
        is_korea_timezone = (
            'KST' in str(timezone_info).upper() or 
            'KOREA' in str(timezone_info).upper() or 
            'SEOUL' in str(timezone_info).upper() or
            'ASIA/SEOUL' in str(env_tz).upper() or
            '+09' in str(env_tz)
        )
        
        # UTC 환경인지 명시적으로 확인
        is_utc_timezone = (
            'UTC' in str(timezone_info).upper() or
            'ETC/UTC' in str(env_tz).upper() or
            env_tz == '' or  # TZ 환경변수가 설정되지 않음
            abs(local_time.hour - utc_time.hour) <= 1  # 로컬과 UTC 시간이 같거나 1시간 이내 차이
        )
        
        if is_korea_timezone:
            # 이미 한국 시간대
            now = local_time
            print(f"DEBUG: Server is in Korea timezone, using local time")
        elif is_utc_timezone:
            # UTC 시간대이므로 +9시간 추가
            now = utc_time.replace(tzinfo=timezone.utc) + timedelta(hours=9)
            print(f"DEBUG: Server is in UTC timezone, converting to Korea time (+9 hours)")
        else:
            # 기타 시간대는 UTC + 9시간으로 처리
            now = utc_time.replace(tzinfo=timezone.utc) + timedelta(hours=9)
            print(f"DEBUG: Server timezone unknown, using UTC + 9 hours as fallback")
            
    except Exception as e:
        # 에러 발생 시 기본적으로 UTC + 9시간 사용
        print(f"DEBUG: Error detecting timezone: {e}")
        now = datetime.now(timezone.utc) + timedelta(hours=9)
        print(f"DEBUG: Using fallback: UTC + 9 hours")
    
    # 디버깅 로그
    print(f"DEBUG: Code {code}, Event {event_id}")
    print(f"DEBUG: Current check_in_time: {participant.check_in_time}")
    print(f"DEBUG: Current check_out_time: {participant.check_out_time}")
    print(f"DEBUG: Final Korea time: {now}")
    print(f"DEBUG: Final Korea time strftime: {now.strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 참가자 이름
    participant_name = participant.name_kor or f"{participant.first_name} {participant.family_name}"
    
    # 체크인이 없으면 체크인으로 처리
    if not participant.check_in_time:
        print(f"DEBUG: Performing CHECK-IN for participant {participant_name}")
        participant.check_in_time = now
        # 체크인 시에는 체크아웃 시간을 명시적으로 None으로 설정
        participant.check_out_time = None
        db.session.commit()
        print(f"DEBUG: After check-in - check_in_time: {participant.check_in_time}, check_out_time: {participant.check_out_time}")
        # 서버 시간을 그대로 사용 (이미 한국 시간)
        korea_time_str = participant.check_in_time.strftime('%Y-%m-%d %H:%M:%S')
        
        return jsonify({
            'status': 'success', 
            'message': 'Check-in successful', 
            'action': 'check_in',
            'participant_name': participant_name,
            'check_in_time': korea_time_str,  # 서버 로컬 시간 (한국 시간)
            'check_out_time': None  # 체크인 시에는 체크아웃 시간을 None으로 반환
        })
    
    # 체크인이 있으면 체크아웃으로 처리
    else:
        print(f"DEBUG: Performing CHECK-OUT for participant {participant_name}")
        participant.check_out_time = now
        db.session.commit()
        print(f"DEBUG: After check-out - check_in_time: {participant.check_in_time}, check_out_time: {participant.check_out_time}")
        # 서버 시간을 그대로 사용 (이미 한국 시간으로 변환됨)
        korea_checkin_str = participant.check_in_time.strftime('%Y-%m-%d %H:%M:%S')
        korea_checkout_str = participant.check_out_time.strftime('%Y-%m-%d %H:%M:%S')
        
        return jsonify({
            'status': 'success', 
            'message': 'Check-out successful', 
            'action': 'check_out',
            'participant_name': participant_name,
            'check_in_time': korea_checkin_str,  # 서버 로컬 시간 (한국 시간)
            'check_out_time': korea_checkout_str  # 서버 로컬 시간 (한국 시간)
        })

@app.route('/track_checkin/<int:event_id>')
def track_checkin(event_id):
    """출석 관리 페이지"""
    event = Event.query.get_or_404(event_id)
    return render_template('track_checkin.html', event=event)

@app.route('/download_participants_excel/<int:event_id>', methods=['POST'])
def download_participants_excel(event_id):
    """참가자 엑셀 다운로드"""
    event = Event.query.get_or_404(event_id)
    selected_columns = request.form.getlist('selected_columns')
    participant_ids = request.form.get('selected_participants', '')
    if participant_ids:
        ids = [int(pid) for pid in participant_ids.split(',') if pid.strip().isdigit()]
        participants = Participant.query.filter(Participant.id.in_(ids)).all()
    else:
        participants = Participant.query.filter_by(event_id=event_id).all()
    
    # 코드 번호로 오름차순 정렬
    participants = sorted(participants, key=lambda p: int(p.code) if p.code and p.code.isdigit() else 0)
    
    # 데이터 준비
    data = []
    for p in participants:
        data.append({
            'Event ID': event.event_id,
            'Code': p.code,
            'Registration': p.registration,
            'Division': p.division,
            'Role': p.role,
            'Country': p.country,
            'Name (KOR)': p.name_kor,
            'Affiliation (KOR)': p.affiliation_kor,
            'Department (KOR)': p.department_kor,
            'First Name': p.first_name,
            'Family Name': p.family_name,
            'Affiliation (ENG)': p.affiliation_eng,
            'Department (ENG)': p.department_eng,
            'Accept/Decline': p.accept_or_decline,
            'Email': p.email,
            'Phone': p.phone,
            'Position': p.position,
            'License #': p.license_number,
            'Agree': p.agree,
            'Remark (User)': p.remark_user,
            'Remark (Admin)': p.remark_admin,
            'Check-In Time': p.check_in_time.strftime('%Y-%m-%d %H:%M:%S') if p.check_in_time else '',
            'Check-Out Time': p.check_out_time.strftime('%Y-%m-%d %H:%M:%S') if p.check_out_time else '',
            'Decline Reason': p.decline_reason
        })
    
    # 엑셀 파일 생성
    df = pd.DataFrame(data)
    if selected_columns:
        df = df[selected_columns]
    output = BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        df.to_excel(writer, sheet_name='Participants', index=False)
    
    output.seek(0)
    return send_file(
        output,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name=f'participants_{event.event_id}.xlsx'
    )

@app.route('/get_participant_status', methods=['GET'])
def get_participant_status():
    event_id = request.args.get('event_id', type=int)
    if event_id:
        participants = Participant.query.filter_by(event_id=event_id).all()
    else:
        participants = Participant.query.all()
    def format_time(dt):
        if not dt:
            return ''
        # datetime 객체면 strftime, 아니면 문자열로 처리
        if hasattr(dt, 'strftime'):
            return dt.strftime('%Y-%m-%d %H:%M')
        s = str(dt)
        # YYYY-MM-DD HH:MM:SS(.마이크로초) → YYYY-MM-DD HH:MM
        if len(s) >= 16:
            return s[:16]
        return s
    return jsonify([{
        'event_id': p.event_id,
        'code': p.code,
        'accept_or_decline': p.accept_or_decline,
        'check_in_time': format_time(p.check_in_time),
        'check_out_time': format_time(p.check_out_time),
        'remark_user': p.remark_user,
        'remark_admin': p.remark_admin,
        'decline_reason': p.decline_reason
    } for p in participants])

@app.route('/select_columns')
def select_columns():
    event_id = request.args.get('event_id')
    participants = request.args.get('participants', '')
    columns = [
        'Event ID', 'Code', 'Registration', 'Division', 'Role', 'Country',
        'Name (KOR)', 'Affiliation (KOR)', 'Department (KOR)', 'First Name', 'Family Name',
        'Affiliation (ENG)', 'Department (ENG)', 'Accept/Decline', 'Email', 'Phone',
        'Position', 'License #', 'Agree', 'Remark (User)', 'Remark (Admin)',
        'Check-In Time', 'Check-Out Time', 'Decline Reason'
    ]
    return render_template('select_columns.html', event_id=event_id, participants=participants, columns=columns)

@app.route('/download_file_path/<path:filepath>', methods=['GET'])
def download_file_path(filepath):
    """파일 경로로 다운로드"""
    try:
        return send_file(filepath, as_attachment=True)
    except Exception as e:
        logging.error(f"File download failed: {e}")
        return "File not found", 404

@app.route('/get_participants_for_qr/<int:event_id>', methods=['POST'])
def get_participants_for_qr(event_id):
    """QR 코드 생성을 위한 참가자 데이터 JSON 반환"""
    event = Event.query.get_or_404(event_id)
    participant_ids = request.form.get('selected_participants', '')
    if participant_ids:
        ids = [int(pid) for pid in participant_ids.split(',') if pid.strip().isdigit()]
        participants = Participant.query.filter(Participant.id.in_(ids)).all()
    else:
        participants = Participant.query.filter_by(event_id=event_id).all()
    
    # 코드 번호로 오름차순 정렬
    participants = sorted(participants, key=lambda p: int(p.code) if p.code and p.code.isdigit() else 0)
    
    # 행사명에서 안전한 폴더명 생성
    safe_event_name = "".join(c for c in event.name if c.isalnum() or c in (' ', '-', '_')).rstrip()
    
    # 데이터 준비
    data = []
    for p in participants:
        data.append({
            'event_id': event.event_id,
            'code': p.code,
            'name_kor': p.name_kor,
            'first_name': p.first_name,
            'family_name': p.family_name,
            'affiliation_kor': p.affiliation_kor,
            'affiliation_eng': p.affiliation_eng,
            'email': p.email,
            'accept_or_decline': p.accept_or_decline
        })
    
    return jsonify({
        'participants': data,
        'event_name': safe_event_name
    })

@app.route('/generate_qr_image/<int:code>/<path:event_name>')
def generate_qr_image(code, event_name):
    """QR 코드 이미지 생성 및 반환"""
    try:
        # QR 코드 생성
        qr = qrcode.make(str(code))
        
        # 이미지를 바이트 스트림으로 변환
        img_io = BytesIO()
        qr.save(img_io, 'PNG')
        img_io.seek(0)
        
        return send_file(
            img_io,
            mimetype='image/png',
            as_attachment=True,
            download_name=f'QR_Codes/{event_name}/{code}.png'
        )
    except Exception as e:
        logging.error(f"QR generation failed for {code}: {str(e)}")
        return "QR generation failed", 500

@app.route('/download_qr_participants_excel/<int:event_id>', methods=['POST'])
def download_qr_participants_excel(event_id):
    event = Event.query.get_or_404(event_id)
    participant_ids = request.form.get('selected_participants', '')
    if participant_ids:
        ids = [int(pid) for pid in participant_ids.split(',') if pid.strip().isdigit()]
        participants = Participant.query.filter(Participant.id.in_(ids)).order_by(Participant.code).all()
    else:
        participants = Participant.query.filter_by(event_id=event_id).order_by(Participant.code).all()

    import tempfile, shutil, zipfile
    temp_dir = tempfile.mkdtemp()
    qr_dir = os.path.join(temp_dir, "QR_Codes")
    os.makedirs(qr_dir, exist_ok=True)

    # QR 코드 생성 및 경로 수집
    data = []
    
    # 코드 번호로 오름차순 정렬 (모든 방식에 공통 적용)
    def safe_code_sort_key(p):
        if not p.code:
            return 999999  # 코드가 없는 경우 맨 뒤로
        try:
            # 문자열을 정수로 변환하여 정렬
            return int(str(p.code))
        except (ValueError, TypeError):
            return 999999  # 변환 실패 시 맨 뒤로
    
    # 정렬 전 상태 로깅
    print(f"DEBUG: Before sorting - participants codes: {[p.code for p in participants]}")
    
    participants = sorted(participants, key=safe_code_sort_key)
    
    # 정렬 후 상태 로깅
    print(f"DEBUG: After sorting - participants codes: {[p.code for p in participants]}")
    
    # 디버깅: 정렬 결과 확인
    print(f"DEBUG: Sorted participants codes: {[p.code for p in participants]}")
    
    if request.form.get('export_layout', 'normal') == 'odd_even':
        # participants에서 바로 홀수/짝수 분리 (중복 정렬 X)
        odd_participants = [p for p in participants if p.code and int(p.code) % 2 == 1]
        even_participants = [p for p in participants if p.code and int(p.code) % 2 == 0]
        
        # 디버깅: 홀수/짝수 분리 결과 확인
        print(f"DEBUG: Odd participants codes: {[p.code for p in odd_participants]}")
        print(f"DEBUG: Even participants codes: {[p.code for p in even_participants]}")
        
        # 홀수와 짝수 참가자 데이터를 나란히 정렬
        max_rows = max(len(odd_participants), len(even_participants))
        for i in range(max_rows):
            row_data = {}
            # 홀수 참가자 데이터 (좌측)
            if i < len(odd_participants):
                p = odd_participants[i]
                if p.code:
                    qr_filename = f"{p.code}.png"
                    qr_path = os.path.join(qr_dir, qr_filename)
                    qr = qrcode.make(str(p.code))
                    qr.save(qr_path)
                    image_path_for_excel = f"QR_Codes/{p.code}.png"
                else:
                    image_path_for_excel = ""
                row_data.update({
                    'Event ID_홀수': event.event_id,
                    'Code_홀수': p.code,
                    '@Image_홀수': image_path_for_excel,
                    'Name (KOR)_홀수': p.name_kor,
                    'Name (ENG)_홀수': f"{p.first_name} {p.family_name}".strip(),
                    'Affiliation_홀수': p.affiliation_kor or p.affiliation_eng,
                    'Email_홀수': p.email,
                    'Accept/Decline_홀수': p.accept_or_decline
                })
            else:
                # 홀수 참가자가 없는 경우 빈 값으로 채움
                row_data.update({
                    'Event ID_홀수': '',
                    'Code_홀수': '',
                    '@Image_홀수': '',
                    'Name (KOR)_홀수': '',
                    'Name (ENG)_홀수': '',
                    'Affiliation_홀수': '',
                    'Email_홀수': '',
                    'Accept/Decline_홀수': ''
                })
            
            # 짝수 참가자 데이터 (우측)
            if i < len(even_participants):
                p = even_participants[i]
                if p.code:
                    qr_filename = f"{p.code}.png"
                    qr_path = os.path.join(qr_dir, qr_filename)
                    qr = qrcode.make(str(p.code))
                    qr.save(qr_path)
                    image_path_for_excel = f"QR_Codes/{p.code}.png"
                else:
                    image_path_for_excel = ""
                row_data.update({
                    'Event ID_짝수': event.event_id,
                    'Code_짝수': p.code,
                    '@Image_짝수': image_path_for_excel,
                    'Name (KOR)_짝수': p.name_kor,
                    'Name (ENG)_짝수': f"{p.first_name} {p.family_name}".strip(),
                    'Affiliation_짝수': p.affiliation_kor or p.affiliation_eng,
                    'Email_짝수': p.email,
                    'Accept/Decline_짝수': p.accept_or_decline
                })
            else:
                # 짝수 참가자가 없는 경우 빈 값으로 채움
                row_data.update({
                    'Event ID_짝수': '',
                    'Code_짝수': '',
                    '@Image_짝수': '',
                    'Name (KOR)_짝수': '',
                    'Name (ENG)_짝수': '',
                    'Affiliation_짝수': '',
                    'Email_짝수': '',
                    'Accept/Decline_짝수': ''
                })
            
            data.append(row_data)
    else:
        # 일반 방식 (코드번호 순서대로)
        print(f"DEBUG: Normal mode - processing {len(participants)} participants")
        for p in participants:
            print(f"DEBUG: Processing participant with code: {p.code}")
            if p.code:
                qr_filename = f"{p.code}.png"
                qr_path = os.path.join(qr_dir, qr_filename)
                qr = qrcode.make(str(p.code))
                qr.save(qr_path)
                image_path_for_excel = f"QR_Codes/{p.code}.png"
            else:
                image_path_for_excel = ""
            data.append({
                'Event ID': event.event_id,
                'Code': p.code,
                '@Image': image_path_for_excel,
                'Name (KOR)': p.name_kor,
                'Name (ENG)': f"{p.first_name} {p.family_name}".strip(),
                'Affiliation': p.affiliation_kor or p.affiliation_eng,
                'Email': p.email,
                'Accept/Decline': p.accept_or_decline
            })

    # Excel, TXT 파일 생성
    import pandas as pd
    df = pd.DataFrame(data)
    excel_path = os.path.join(temp_dir, "participants.xlsx")
    df.to_excel(excel_path, sheet_name='Participants', index=False)
    txt_path = os.path.join(temp_dir, "participants.txt")
    notice = "※ 압축을 푼 폴더에서 QR_Codes 폴더와 participants.xlsx, participants.txt를 사용하세요. @Image 컬럼은 QR_Codes 폴더의 이미지를 가리킵니다.\n"
    with open(txt_path, 'w', encoding='utf-16') as f:
        f.write(notice)
        df.to_csv(f, sep='\t', index=False, encoding='utf-16', lineterminator='\n')

    # ZIP 파일 생성
    zip_path = os.path.join(temp_dir, "Excel_QR_Code.zip")
    with zipfile.ZipFile(zip_path, 'w') as zipf:
        zipf.write(excel_path, "participants.xlsx")
        zipf.write(txt_path, "participants.txt")
        for filename in os.listdir(qr_dir):
            zipf.write(os.path.join(qr_dir, filename), os.path.join("QR_Codes", filename))

    from flask import after_this_request
    @after_this_request
    def cleanup(response):
        shutil.rmtree(temp_dir)
        return response

    return send_file(
        zip_path,
        mimetype='application/zip',
        as_attachment=True,
        download_name='Excel_QR_Code.zip'
    )

@app.route('/download_qr_participants_excel_with_path/<int:event_id>', methods=['POST'])
def download_qr_participants_excel_with_path(event_id):
    event = Event.query.get_or_404(event_id)
    participant_ids = request.form.get('selected_participants', '')
    custom_path = request.form.get('custom_path', '/Users/jhc/Downloads/Excel_QR_Code')
    if participant_ids:
        ids = [int(pid) for pid in participant_ids.split(',') if pid.strip().isdigit()]
        participants = Participant.query.filter(Participant.id.in_(ids)).order_by(Participant.code).all()
    else:
        participants = Participant.query.filter_by(event_id=event_id).order_by(Participant.code).all()
    
    # 코드 번호로 오름차순 정렬 (한 번만)
    def safe_code_sort_key(p):
        if not p.code:
            return 999999  # 코드가 없는 경우 맨 뒤로
        try:
            # 문자열을 정수로 변환하여 정렬
            return int(str(p.code))
        except (ValueError, TypeError):
            return 999999  # 변환 실패 시 맨 뒤로
    
    # 정렬 전 상태 로깅
    print(f"DEBUG: Before sorting - participants codes: {[p.code for p in participants]}")
    
    participants = sorted(participants, key=safe_code_sort_key)
    
    # 정렬 후 상태 로깅
    print(f"DEBUG: After sorting - participants codes: {[p.code for p in participants]}")
    
    # 경로 정규화 (백슬래시 이스케이프 처리)
    custom_path = custom_path.replace('\\', '/')
    
    # QR 코드 생성 및 실제 경로 수집
    data = []
    
    if request.form.get('export_layout', 'normal') == 'odd_even':
        # participants에서 바로 홀수/짝수 분리 (중복 정렬 X)
        odd_participants = [p for p in participants if p.code and int(p.code) % 2 == 1]
        even_participants = [p for p in participants if p.code and int(p.code) % 2 == 0]
        # 홀수와 짝수 참가자 데이터를 나란히 정렬
        max_rows = max(len(odd_participants), len(even_participants))
        for i in range(max_rows):
            row_data = {}
            # 홀수 참가자 데이터 (좌측)
            if i < len(odd_participants):
                p = odd_participants[i]
                if p.code:
                    actual_image_path = f"{custom_path}/QR_Codes/{p.code}.png"
                else:
                    actual_image_path = ""
                row_data.update({
                    'Event ID_홀수': event.event_id,
                    'Code_홀수': p.code,
                    '@Image_홀수': actual_image_path,
                    'Name (KOR)_홀수': p.name_kor,
                    'Name (ENG)_홀수': f"{p.first_name} {p.family_name}".strip(),
                    'Affiliation_홀수': p.affiliation_kor or p.affiliation_eng,
                    'Email_홀수': p.email,
                    'Accept/Decline_홀수': p.accept_or_decline
                })
            else:
                # 홀수 참가자가 없는 경우 빈 값으로 채움
                row_data.update({
                    'Event ID_홀수': '',
                    'Code_홀수': '',
                    '@Image_홀수': '',
                    'Name (KOR)_홀수': '',
                    'Name (ENG)_홀수': '',
                    'Affiliation_홀수': '',
                    'Email_홀수': '',
                    'Accept/Decline_홀수': ''
                })
            
            # 짝수 참가자 데이터 (우측)
            if i < len(even_participants):
                p = even_participants[i]
                if p.code:
                    actual_image_path = f"{custom_path}/QR_Codes/{p.code}.png"
                else:
                    actual_image_path = ""
                row_data.update({
                    'Event ID_짝수': event.event_id,
                    'Code_짝수': p.code,
                    '@Image_짝수': actual_image_path,
                    'Name (KOR)_짝수': p.name_kor,
                    'Name (ENG)_짝수': f"{p.first_name} {p.family_name}".strip(),
                    'Affiliation_짝수': p.affiliation_kor or p.affiliation_eng,
                    'Email_짝수': p.email,
                    'Accept/Decline_짝수': p.accept_or_decline
                })
            else:
                # 짝수 참가자가 없는 경우 빈 값으로 채움
                row_data.update({
                    'Event ID_짝수': '',
                    'Code_짝수': '',
                    '@Image_짝수': '',
                    'Name (KOR)_짝수': '',
                    'Name (ENG)_짝수': '',
                    'Affiliation_짝수': '',
                    'Email_짝수': '',
                    'Accept/Decline_짝수': ''
                })
            
            data.append(row_data)
    else:
        # 일반 방식 (순서대로, 이미 정렬되어 있음)
        for p in participants:
            if p.code:
                actual_image_path = f"{custom_path}/QR_Codes/{p.code}.png"
            else:
                actual_image_path = ""
            data.append({
                'Event ID': event.event_id,
                'Code': p.code,
                '@Image': actual_image_path,
                'Name (KOR)': p.name_kor,
                'Name (ENG)': f"{p.first_name} {p.family_name}".strip(),
                'Affiliation': p.affiliation_kor or p.affiliation_eng,
                'Email': p.email,
                'Accept/Decline': p.accept_or_decline
            })

    # Excel 파일 생성
    import pandas as pd
    df = pd.DataFrame(data)
    output = BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        df.to_excel(writer, index=False, sheet_name='Participants')
        worksheet = writer.sheets['Participants']
        
        # 컬럼 너비 자동 조정
        for col_num, value in enumerate(df.columns.values):
            max_length = max(
                df[value].astype(str).apply(len).max(),
                len(str(value))
            )
            worksheet.set_column(col_num, col_num, min(max_length + 2, 50))
    
    output.seek(0)
    current_date = datetime.now().strftime("%Y%m%d")
    filename = f"{event.event_id}_participants_with_paths_{current_date}.xlsx"
    
    return send_file(
        output,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name=filename
    )

@app.route('/download_qr_participants_excel_with_path_zip/<int:event_id>', methods=['POST'])
def download_qr_participants_excel_with_path_zip(event_id):
    event = Event.query.get_or_404(event_id)
    participant_ids = request.form.get('selected_participants', '')
    custom_path = request.form.get('custom_path', '/Users/jhc/Downloads/Excel_QR_Code')
    if participant_ids:
        ids = [int(pid) for pid in participant_ids.split(',') if pid.strip().isdigit()]
        participants = Participant.query.filter(Participant.id.in_(ids)).order_by(Participant.code).all()
    else:
        participants = Participant.query.filter_by(event_id=event_id).order_by(Participant.code).all()

    import tempfile, shutil, zipfile
    temp_dir = tempfile.mkdtemp()
    qr_dir = os.path.join(temp_dir, "QR_Codes")
    os.makedirs(qr_dir, exist_ok=True)

    # 경로 정규화 (백슬래시 이스케이프 처리)
    custom_path = custom_path.replace('\\', '/')
    
    # QR 코드 생성 및 실제 경로 수집
    data = []
    
    # 코드 번호로 오름차순 정렬 (모든 방식에 공통 적용)
    def safe_code_sort_key(p):
        if not p.code:
            return 999999  # 코드가 없는 경우 맨 뒤로
        try:
            # 문자열을 정수로 변환하여 정렬
            return int(str(p.code))
        except (ValueError, TypeError):
            return 999999  # 변환 실패 시 맨 뒤로
    
    # 정렬 전 상태 로깅
    print(f"DEBUG: Before sorting - participants codes: {[p.code for p in participants]}")
    
    participants = sorted(participants, key=safe_code_sort_key)
    
    # 정렬 후 상태 로깅
    print(f"DEBUG: After sorting - participants codes: {[p.code for p in participants]}")
    
    if request.form.get('export_layout', 'normal') == 'odd_even':
        # participants에서 바로 홀수/짝수 분리 (중복 정렬 X)
        odd_participants = [p for p in participants if p.code and int(p.code) % 2 == 1]
        even_participants = [p for p in participants if p.code and int(p.code) % 2 == 0]
        # 홀수와 짝수 참가자 데이터를 나란히 정렬
        max_rows = max(len(odd_participants), len(even_participants))
        for i in range(max_rows):
            row_data = {}
            # 홀수 참가자 데이터 (좌측)
            if i < len(odd_participants):
                p = odd_participants[i]
                if p.code:
                    qr_filename = f"{p.code}.png"
                    qr_path = os.path.join(qr_dir, qr_filename)
                    qr = qrcode.make(str(p.code))
                    qr.save(qr_path)
                    # 실제 파일 시스템 경로 생성
                    actual_image_path = f"{custom_path}/QR_Codes/{p.code}.png"
                else:
                    actual_image_path = ""
                row_data.update({
                    'Event ID_홀수': event.event_id,
                    'Code_홀수': p.code,
                    '@Image_홀수': actual_image_path,
                    'Name (KOR)_홀수': p.name_kor,
                    'Name (ENG)_홀수': f"{p.first_name} {p.family_name}".strip(),
                    'Affiliation_홀수': p.affiliation_kor or p.affiliation_eng,
                    'Email_홀수': p.email,
                    'Accept/Decline_홀수': p.accept_or_decline
                })
            else:
                # 홀수 참가자가 없는 경우 빈 값으로 채움
                row_data.update({
                    'Event ID_홀수': '',
                    'Code_홀수': '',
                    '@Image_홀수': '',
                    'Name (KOR)_홀수': '',
                    'Name (ENG)_홀수': '',
                    'Affiliation_홀수': '',
                    'Email_홀수': '',
                    'Accept/Decline_홀수': ''
                })
            
            # 짝수 참가자 데이터 (우측)
            if i < len(even_participants):
                p = even_participants[i]
                if p.code:
                    qr_filename = f"{p.code}.png"
                    qr_path = os.path.join(qr_dir, qr_filename)
                    qr = qrcode.make(str(p.code))
                    qr.save(qr_path)
                    # 실제 파일 시스템 경로 생성
                    actual_image_path = f"{custom_path}/QR_Codes/{p.code}.png"
                else:
                    actual_image_path = ""
                row_data.update({
                    'Event ID_짝수': event.event_id,
                    'Code_짝수': p.code,
                    '@Image_짝수': actual_image_path,
                    'Name (KOR)_짝수': p.name_kor,
                    'Name (ENG)_짝수': f"{p.first_name} {p.family_name}".strip(),
                    'Affiliation_짝수': p.affiliation_kor or p.affiliation_eng,
                    'Email_짝수': p.email,
                    'Accept/Decline_짝수': p.accept_or_decline
                })
            else:
                # 짝수 참가자가 없는 경우 빈 값으로 채움
                row_data.update({
                    'Event ID_짝수': '',
                    'Code_짝수': '',
                    '@Image_짝수': '',
                    'Name (KOR)_짝수': '',
                    'Name (ENG)_짝수': '',
                    'Affiliation_짝수': '',
                    'Email_짝수': '',
                    'Accept/Decline_짝수': ''
                })
            
            data.append(row_data)
    else:
        # 일반 방식 (코드번호 순서대로)
        for p in participants:
            if p.code:
                qr_filename = f"{p.code}.png"
                qr_path = os.path.join(qr_dir, qr_filename)
                qr = qrcode.make(str(p.code))
                qr.save(qr_path)
                # 실제 파일 시스템 경로 생성
                actual_image_path = f"{custom_path}/QR_Codes/{p.code}.png"
            else:
                actual_image_path = ""
            data.append({
                'Event ID': event.event_id,
                'Code': p.code,
                '@Image': actual_image_path,
                'Name (KOR)': p.name_kor,
                'Name (ENG)': f"{p.first_name} {p.family_name}".strip(),
                'Affiliation': p.affiliation_kor or p.affiliation_eng,
                'Email': p.email,
                'Accept/Decline': p.accept_or_decline
            })

    # Excel, TXT 파일 생성
    import pandas as pd
    df = pd.DataFrame(data)
    excel_path = os.path.join(temp_dir, "participants.xlsx")
    df.to_excel(excel_path, sheet_name='Participants', index=False)
    
    txt_path = os.path.join(temp_dir, "participants.txt")
    with open(txt_path, 'w', encoding='utf-16') as f:
        df.to_csv(f, sep='\t', index=False, encoding='utf-16', lineterminator='\n')

    # ZIP 파일 생성
    zip_path = os.path.join(temp_dir, "Excel_QR_Code.zip")
    with zipfile.ZipFile(zip_path, 'w') as zipf:
        zipf.write(excel_path, "participants.xlsx")
        zipf.write(txt_path, "participants.txt")
        for filename in os.listdir(qr_dir):
            zipf.write(os.path.join(qr_dir, filename), os.path.join("QR_Codes", filename))

    from flask import after_this_request
    @after_this_request
    def cleanup(response):
        shutil.rmtree(temp_dir)
        return response

    return send_file(
        zip_path,
        mimetype='application/zip',
        as_attachment=True,
        download_name='Excel_QR_Code.zip'
    )

@app.route('/download_custom_excel/<int:event_id>', methods=['POST'])
def download_custom_excel(event_id):
    """평점용 서식으로 엑셀 다운로드"""
    event = Event.query.get_or_404(event_id)
    participant_ids = request.form.get('selected_participants', '')
    rating_criteria = request.form.get('rating_criteria', '6')
    
    if participant_ids:
        ids = [int(pid) for pid in participant_ids.split(',') if pid.strip().isdigit()]
        participants = Participant.query.filter(Participant.id.in_(ids)).all()
    else:
        participants = Participant.query.filter_by(event_id=event_id).all()

    # Code 번호로 오름차순 정렬 (안전한 처리)
    def safe_code_sort_key(p):
        try:
            if p.code and str(p.code).isdigit():
                return int(p.code)
            return 0
        except (ValueError, TypeError):
            return 0
    
    participants = sorted(participants, key=safe_code_sort_key)
    
    data = []
    for p in participants:
        # 체크인/아웃 시간 처리
        check_in_dt = pd.to_datetime(p.check_in_time, errors='coerce') if p.check_in_time else None
        check_out_dt = pd.to_datetime(p.check_out_time, errors='coerce') if p.check_out_time else None
        
        check_in_time_str = check_in_dt.strftime('%H:%M') if pd.notna(check_in_dt) else ''
        check_out_time_str = check_out_dt.strftime('%H:%M') if pd.notna(check_out_dt) else ''
        
        check_in_status = 1 if check_in_time_str else 0
        check_out_status = 1 if check_out_time_str else 0
        
        # 체류시간 계산
        duration = (check_out_dt - check_in_dt) if (pd.notna(check_in_dt) and pd.notna(check_out_dt)) else None
        duration_seconds = duration.total_seconds() if duration and duration.total_seconds() >= 0 else 0
        duration_str = f"{int(duration_seconds // 3600)}시간 {int((duration_seconds % 3600) // 60)}분" if duration and duration.total_seconds() >= 0 else ''
        
        # 평점 계산 (올바른 로직)
        if check_in_status == 0 or check_out_status == 0:
            rating = 0
        else:
            hours = duration_seconds / 3600  # 시간 단위로 변환
            
            if rating_criteria == '1':
                # 1시간 미만=0점, 1시간 이상=1점
                rating = 1 if hours >= 1 else 0
            elif rating_criteria == '2':
                # 1시간 미만=0점, 1-2시간=1점, 2시간 이상=2점
                if hours < 1:
                    rating = 0
                elif hours < 2:
                    rating = 1
                else:
                    rating = 2
            elif rating_criteria == '3':
                # 1시간 미만=0점, 1-2시간=1점, 2-3시간=2점, 3시간 이상=3점
                if hours < 1:
                    rating = 0
                elif hours < 2:
                    rating = 1
                elif hours < 3:
                    rating = 2
                else:
                    rating = 3
            elif rating_criteria == '4':
                # 1시간 미만=0점, 1-2시간=1점, 2-3시간=2점, 3-4시간=3점, 4시간 이상=4점
                if hours < 1:
                    rating = 0
                elif hours < 2:
                    rating = 1
                elif hours < 3:
                    rating = 2
                elif hours < 4:
                    rating = 3
                else:
                    rating = 4
            elif rating_criteria == '5':
                # 1시간 미만=0점, 1-2시간=1점, 2-3시간=2점, 3-4시간=3점, 4-5시간=4점, 5시간 이상=5점
                if hours < 1:
                    rating = 0
                elif hours < 2:
                    rating = 1
                elif hours < 3:
                    rating = 2
                elif hours < 4:
                    rating = 3
                elif hours < 5:
                    rating = 4
                else:
                    rating = 5
            else:  # '6'
                # 1시간 미만=0점, 1-2시간=1점, 2-3시간=2점, 3-4시간=3점, 4-5시간=4점, 5-6시간=5점, 6시간 이상=6점
                if hours < 1:
                    rating = 0
                elif hours < 2:
                    rating = 1
                elif hours < 3:
                    rating = 2
                elif hours < 4:
                    rating = 3
                elif hours < 5:
                    rating = 4
                elif hours < 6:
                    rating = 5
                else:
                    rating = 6
        
        data.append({
            '연번': p.code if p.code else '',  # 참가자의 Code 번호 사용 (None 처리)
            '성명': p.name_kor or f'{p.first_name} {p.family_name}',
            '의사 면허번호': p.license_number,
            '교육전 서명 시간': check_in_time_str,
            '서명여부 (1=yes, 0=no) (Check-in)': check_in_status,
            '교육후 서명 시간': check_out_time_str,
            '서명여부 (1=yes, 0=no) (Check-out)': check_out_status,
            '체류시간 (자동계산)': duration_str,
            '발급평점': rating,
            '소속': p.affiliation_kor or p.affiliation_eng,
            '직업구분': p.division,
            '비고1': p.department_kor or p.department_eng
        })

    df = pd.DataFrame(data)
    output = BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        df.to_excel(writer, index=False, sheet_name=f'{rating_criteria}평점')
        worksheet = writer.sheets[f'{rating_criteria}평점']
        for col_num, _ in enumerate(df.columns):
            worksheet.set_column(col_num, col_num, None, writer.book.add_format({'num_format': '@'}))
    
    output.seek(0)
    current_date = datetime.now().strftime("%Y%m%d")
    filename = f"{event.event_id}_custom_participants_{rating_criteria}평점_{current_date}.xlsx"
    return send_file(
        output,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name=filename
    )

if __name__ == '__main__':
    app.run(debug=True) 