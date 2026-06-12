import os
from pathlib import Path
from dotenv import load_dotenv

# 공통/서버 설정 → 로컬 개발 설정(있으면 덮어씀)
# 서버: config.env 만 존재 | 로컬: config.env.local 이 DATABASE_URL 등을 override
load_dotenv('config.env')
_local_env = Path('config.env.local')
if _local_env.is_file():
    load_dotenv(_local_env, override=True)

# 로컬에서 프로덕션 DB에 실수로 연결하는 것 방지
if os.environ.get('FLASK_ENV', 'development') == 'development':
    _url = os.environ.get('DATABASE_URL', '')
    if _url and ('146.190.96.68' in _url or _url.rstrip('/').endswith('jhc_conference_db')):
        raise ValueError(
            '로컬 개발 중 프로덕션 DB에 연결되어 있습니다. '
            'config.env.local.example 을 config.env.local 로 복사하고 로컬 DATABASE_URL을 설정하세요.'
        )

class Config:
    # Flask 설정
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    
    # 데이터베이스 설정 - PostgreSQL 필수
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
    if not SQLALCHEMY_DATABASE_URI:
        raise ValueError("DATABASE_URL environment variable is required")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
    }
    
    # 파일 업로드 설정
    max_content_length = os.environ.get('MAX_CONTENT_LENGTH', '16777216')
    # 주석이나 공백 제거
    max_content_length = max_content_length.split('#')[0].strip()
    MAX_CONTENT_LENGTH = int(max_content_length)
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', 'uploads')
    
    # 이메일 설정
    MAIL_SERVER = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.environ.get('MAIL_PORT', 587))
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'True').lower() == 'true'
    MAIL_USE_SSL = os.environ.get('MAIL_USE_SSL', 'False').lower() == 'true'
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER')

class DevelopmentConfig(Config):
    DEBUG = True
    FLASK_ENV = 'development'

class ProductionConfig(Config):
    DEBUG = False
    FLASK_ENV = 'production'

class TestingConfig(Config):
    TESTING = True
    # 테스트용 PostgreSQL URL 또는 메모리 데이터베이스 사용
    SQLALCHEMY_DATABASE_URI = os.environ.get('TEST_DATABASE_URL') or 'postgresql://test:test@localhost:5432/test_db'

# 설정 매핑
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
} 