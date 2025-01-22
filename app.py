from flask import Flask, render_template, request, redirect, url_for, jsonify, send_file
import sqlite3
import os
import pandas as pd
from werkzeug.utils import secure_filename
from flask_mail import Mail, Message
import unicodedata
import logging
from datetime import datetime
from io import BytesIO
import pandas as pd  # Ensure pandas is imported

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
ALLOWED_EXTENSIONS = {'csv', 'xlsx', 'pdf', 'png', 'jpg', 'jpeg', 'docx'}

# Email Configuration
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USERNAME'] = 'jhchoi1979@gmail.com'
app.config['MAIL_PASSWORD'] = 'fmuislkvacigzlkw'
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USE_SSL'] = False

mail = Mail(app)

logging.basicConfig(level=logging.DEBUG)

def check_schema():
    conn = sqlite3.connect('events.db')
    cursor = conn.cursor()
    
    cursor.execute("PRAGMA table_info(participants)")
    schema = cursor.fetchall()
    conn.close()
    
    for column in schema:
        print(column)

check_schema()


def add_checkin_checkout_columns():
    conn = sqlite3.connect('events.db')
    cursor = conn.cursor()
    
    # Check existing columns
    cursor.execute("PRAGMA table_info(participants)")
    existing_columns = [column[1] for column in cursor.fetchall()]
    
    # Add columns if they don't already exist
    if "check_in_time" not in existing_columns:
        cursor.execute("ALTER TABLE participants ADD COLUMN check_in_time TEXT")
    if "check_out_time" not in existing_columns:
        cursor.execute("ALTER TABLE participants ADD COLUMN check_out_time TEXT")
    
    conn.commit()
    conn.close()
    print("Database schema checked and updated if necessary!")

add_checkin_checkout_columns()

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def sanitize(value):
    """Ensure all values are strings to avoid binary data issues."""
    return value if isinstance(value, str) else str(value)

def clean_text(text):
    # Normalize and ensure UTF-8 encoding
    return unicodedata.normalize("NFKD", text)

def init_db():
    # Initialize the database and create tables if they don't exist
    conn = sqlite3.connect('events.db')
    cursor = conn.cursor()
    
    cursor.execute('''CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL
    )''')

    cursor.execute('''CREATE TABLE IF NOT EXISTS participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER NOT NULL,
        division TEXT,
        role TEXT,
        country TEXT,
        name_kor TEXT,
        affiliation_kor TEXT,
        department_kor TEXT,
        first_name TEXT,
        family_name TEXT,
        affiliation_eng TEXT,
        department_eng TEXT,
        accept_or_decline TEXT,
        email TEXT,
        phone TEXT,
        position TEXT,
        license_number TEXT,
        cv TEXT,
        photo TEXT,
        ppt TEXT,
        script TEXT,
        agree TEXT,
        remark_user TEXT,
        remark_admin TEXT,
        FOREIGN KEY (event_id) REFERENCES events (id)
    )''')
    
    cursor.execute('''CREATE TABLE IF NOT EXISTS participant_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        participant_id INTEGER NOT NULL,
        filename TEXT NOT NULL,
        filepath TEXT NOT NULL,
        FOREIGN KEY (participant_id) REFERENCES participants (id)
    )''')

    conn.commit()
    conn.close()

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/compose_email')
def compose_email():
    participant_ids = request.args.get('participants', '')
    return render_template('compose_email.html', participant_ids=participant_ids)

@app.route('/')
def admin_page():
    conn = sqlite3.connect('events.db')
    cursor = conn.cursor()
    cursor.execute('''SELECT e.id, e.name, e.start_date, e.end_date, COUNT(p.id) as participant_count
                       FROM events e
                       LEFT JOIN participants p ON e.id = p.event_id
                       GROUP BY e.id''')
    events = cursor.fetchall()
    conn.close()
    return render_template('admin.html', events=events)

@app.route('/create_event', methods=['POST'])
def create_event():
    name = request.form['name']
    start_date = request.form['start_date']
    end_date = request.form['end_date']
    conn = sqlite3.connect('events.db')
    cursor = conn.cursor()
    cursor.execute('INSERT INTO events (name, start_date, end_date) VALUES (?, ?, ?)', (name, start_date, end_date))
    conn.commit()
    conn.close()
    return redirect(url_for('admin_page'))
    
@app.route('/get_files/<int:participant_id>', methods=['GET'])
def get_files(participant_id):
    conn = sqlite3.connect('events.db')
    cursor = conn.cursor()
    cursor.execute('SELECT id, filename FROM participant_files WHERE participant_id = ?', (participant_id,))
    files = cursor.fetchall()
    conn.close()
    return jsonify({"status": "success", "files": files})
    
@app.route('/download_file/<int:file_id>', methods=['GET'])
def download_file(file_id):
    conn = sqlite3.connect('events.db')
    cursor = conn.cursor()
    cursor.execute('SELECT filepath, filename FROM participant_files WHERE id = ?', (file_id,))
    file_data = cursor.fetchone()
    conn.close()

    if not file_data:
        return jsonify({"status": "error", "message": "File not found"}), 404

    filepath, filename = file_data
    return send_file(filepath, as_attachment=True, download_name=filename)


@app.route('/delete_events', methods=['POST'])
def delete_events():
    ids = request.form.getlist('selected_events')
    conn = sqlite3.connect('events.db')
    cursor = conn.cursor()
    cursor.executemany('DELETE FROM events WHERE id = ?', [(event_id,) for event_id in ids])
    conn.commit()
    conn.close()
    return redirect(url_for('admin_page'))

@app.route('/event/<int:event_id>')
def participant_management(event_id):
    conn = sqlite3.connect('events.db')
    cursor = conn.cursor()

    # Fetch event details
    cursor.execute('SELECT * FROM events WHERE id = ?', (event_id,))
    event = cursor.fetchone()

    # Fetch participants with check-in and check-out times
    cursor.execute('''
        SELECT id, event_id, division, role, country, name_kor, affiliation_kor, department_kor, 
               first_name, family_name, affiliation_eng, department_eng, accept_or_decline, 
               email, phone, position, license_number, cv, photo, ppt, script, agree, 
               remark_user, remark_admin, check_in_time, check_out_time
        FROM participants
        WHERE event_id = ?
    ''', (event_id,))
    participants = cursor.fetchall()
    logging.debug("Participants fetched from the database:\n%s", participants)

    # Fetch files for each participant
    participant_files = {}
    cursor.execute('SELECT participant_id, id, filename FROM participant_files')
    for row in cursor.fetchall():
        participant_id, file_id, filename = row
        if participant_id not in participant_files:
            participant_files[participant_id] = []
        participant_files[participant_id].append((file_id, filename))

    conn.close()

    # Pass all variables to the template
    return render_template(
        'participants.html',
        event=event,
        participants=participants,
        participant_files=participant_files
    )


@app.route('/add_participant/<int:event_id>', methods=['GET', 'POST'])
def add_participant(event_id):
    if request.method == 'POST':
        # Extract form data
        form_data = {
            "division": request.form.get('division', ''),
            "role": request.form.get('role', ''),
            "country": request.form.get('country', ''),
            "name_kor": request.form.get('name_kor', ''),
            "affiliation_kor": request.form.get('affiliation_kor', ''),
            "department_kor": request.form.get('department_kor', ''),
            "first_name": request.form.get('first_name', ''),
            "family_name": request.form.get('family_name', ''),
            "affiliation_eng": request.form.get('affiliation_eng', ''),
            "department_eng": request.form.get('department_eng', ''),
            "accept_or_decline": request.form.get('accept_or_decline', ''),
            "email": request.form.get('email', ''),
            "phone": request.form.get('phone', ''),
            "position": request.form.get('position', ''),
            "license_number": request.form.get('license_number', ''),
            "cv": request.form.get('cv', ''),
            "photo": request.form.get('photo', ''),
            "ppt": request.form.get('ppt', ''),
            "script": request.form.get('script', ''),
            "agree": request.form.get('agree', ''),
            "remark_user": request.form.get('remark_user', ''),
            "remark_admin": request.form.get('remark_admin', ''),
        }

        try:
            # Insert data into the database
            conn = sqlite3.connect('events.db')
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO participants (
                    event_id, division, role, country, name_kor, affiliation_kor, department_kor,
                    first_name, family_name, affiliation_eng, department_eng, accept_or_decline,
                    email, phone, position, license_number, cv, photo, ppt, script, agree,
                    remark_user, remark_admin
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (event_id, *form_data.values()))
            conn.commit()
            conn.close()

            # Redirect to the participants page with success

            response = jsonify({"status": "success"})
            response.headers['Content-Type'] = 'application/json'  # Ensure correct Content-Type
            return response
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)})
    return render_template('add_participant.html', event_id=event_id)

    return render_template('add_participant.html', event_id=event_id)

@app.route('/upload_participants/<int:event_id>', methods=['GET', 'POST'])
def upload_participants(event_id):
    if request.method == 'POST':
        if 'file' not in request.files:
            return jsonify({"status": "error", "message": "No file part"})
        file = request.files['file']
        if file.filename == '':
            return jsonify({"status": "error", "message": "No selected file"})
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)

            try:
                # Read file using pandas
                if filename.endswith('.xlsx'):
                    df = pd.read_excel(filepath)
                else:
                    df = pd.read_csv(filepath, encoding='utf-8')

                # Log the raw data read from the file
                logging.debug("Raw data read from file:\n%s", df.head())

                # Normalize column names
                df.columns = [col.lower().strip() for col in df.columns]

                # Verify required columns exist
                required_columns = ['division', 'role', 'country', 'name (kor)', 'affiliation (kor)', 'department (kor)',
                                    'first name', 'family name', 'affiliation (eng)', 'department (eng)', 'accept or decline',
                                    'email', 'phone', 'position', 'license #', 'cv', 'photo', 'ppt', 'script', 'agree',
                                    'remark (user)', 'remark (admin)']
                for col in required_columns:
                    if col not in df.columns:
                        raise ValueError(f"Missing required column: {col}")

                # Sanitize data
                df = df.applymap(sanitize)
                logging.debug("Sanitized DataFrame:\n%s", df.head())

                conn = sqlite3.connect('events.db')
                cursor = conn.cursor()
                for _, row in df.iterrows():
                    # Insert rows into the database
                    cursor.execute('''
                        INSERT INTO participants (event_id, division, role, country, name_kor, affiliation_kor,
                                                  department_kor, first_name, family_name, affiliation_eng,
                                                  department_eng, accept_or_decline, email, phone, position, 
                                                  license_number, cv, photo, ppt, script, agree, 
                                                  remark_user, remark_admin)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                                   (event_id, row['division'], row['role'], row['country'], row['name (kor)'], row['affiliation (kor)'],
                                    row['department (kor)'], row['first name'], row['family name'],
                                    row['affiliation (eng)'], row['department (eng)'], row['accept or decline'], row['email'],
                                    row['phone'], row['position'], row['license #'], row['cv'],
                                    row['photo'], row['ppt'], row['script'], row['agree'],
                                    row['remark (user)'], row['remark (admin)']))
                conn.commit()

                # Verify data stored in the database
                cursor.execute('SELECT * FROM participants')
                rows = cursor.fetchall()
                logging.debug("Data stored in the database:\n%s", rows)

                conn.close()
                return jsonify({"status": "success"})
            except ValueError as ve:
                logging.error("Error: %s", str(ve))
                return jsonify({"status": "error", "message": str(ve)})
            except Exception as e:
                logging.error("Unhandled Error: %s", str(e))
                return jsonify({"status": "error", "message": f"Failed to process file: {str(e)}"})
    return render_template('upload.html', event_id=event_id)

@app.route('/upload_file/<int:participant_id>', methods=['GET', 'POST'])
def upload_file(participant_id):
    if request.method == 'POST':
        if 'file' not in request.files:
            return jsonify({"status": "error", "message": "No file part"})
        file = request.files['file']
        if file.filename == '':
            return jsonify({"status": "error", "message": "No selected file"})
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)

            # Save file information in the database
            conn = sqlite3.connect('events.db')
            cursor = conn.cursor()
            cursor.execute('INSERT INTO participant_files (participant_id, filename, filepath) VALUES (?, ?, ?)',
                           (participant_id, filename, filepath))
            conn.commit()
            conn.close()

            return jsonify({"status": "success"})
        else:
            return jsonify({"status": "error", "message": "File type not allowed"})
    return render_template('upload_file.html', participant_id=participant_id)

@app.route('/delete_file/<int:file_id>', methods=['POST'])
def delete_file(file_id):
    conn = sqlite3.connect('events.db')
    cursor = conn.cursor()
    cursor.execute('SELECT filepath FROM participant_files WHERE id = ?', (file_id,))
    file_data = cursor.fetchone()

    if not file_data:
        conn.close()
        return jsonify({"status": "error", "message": "File not found"}), 404

    filepath = file_data[0]
    try:
        # Delete the file from the filesystem
        if os.path.exists(filepath):
            os.remove(filepath)
        
        # Delete the file record from the database
        cursor.execute('DELETE FROM participant_files WHERE id = ?', (file_id,))
        conn.commit()
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})
    finally:
        conn.close()

    return jsonify({"status": "success"})


@app.route('/delete_participants/<int:event_id>', methods=['POST'])
def delete_participants(event_id):
    ids = request.form.getlist('selected_participants')
    conn = sqlite3.connect('events.db')
    cursor = conn.cursor()
    cursor.executemany('DELETE FROM participants WHERE id = ?', [(participant_id,) for participant_id in ids])
    conn.commit()
    conn.close()
    return redirect(url_for('participant_management', event_id=event_id))

@app.route('/edit_participant/<int:participant_id>', methods=['GET', 'POST'])
def edit_participant(participant_id):
    conn = sqlite3.connect('events.db')
    cursor = conn.cursor()

    if request.method == 'POST':
        # Extract updated participant data from the form
        division = request.form.get('division', '')
        role = request.form.get('role', '')
        country = request.form.get('country', '')
        name_kor = request.form.get('name_kor', '')
        affiliation_kor = request.form.get('affiliation_kor', '')
        department_kor = request.form.get('department_kor', '')
        first_name = request.form.get('first_name', '')
        family_name = request.form.get('family_name', '')
        affiliation_eng = request.form.get('affiliation_eng', '')
        department_eng = request.form.get('department_eng', '')
        accept_or_decline = request.form.get('accept_or_decline', '')
        email = request.form.get('email', '')
        phone = request.form.get('phone', '')
        position = request.form.get('position', '')
        license_number = request.form.get('license_number', '')
        cv = request.form.get('cv', '')
        photo = request.form.get('photo', '')
        ppt = request.form.get('ppt', '')
        script = request.form.get('script', '')
        agree = request.form.get('agree', '')
        remark_user = request.form.get('remark_user', '')
        remark_admin = request.form.get('remark_admin', '')

        # Update the participant's record in the database
        cursor.execute('''
            UPDATE participants
            SET division = ?, role = ?, country = ?, name_kor = ?, affiliation_kor = ?, department_kor = ?, 
                first_name = ?, family_name = ?, affiliation_eng = ?, department_eng = ?, 
                accept_or_decline = ?, email = ?, phone = ?, position = ?, license_number = ?, cv = ?, 
                photo = ?, ppt = ?, script = ?, agree = ?, remark_user = ?, remark_admin = ?
            WHERE id = ?
        ''', (
            division, role, country, name_kor, affiliation_kor, department_kor,
            first_name, family_name, affiliation_eng, department_eng,
            accept_or_decline, email, phone, position, license_number, cv,
            photo, ppt, script, agree, remark_user, remark_admin, participant_id
        ))
        conn.commit()
        conn.close()

        return jsonify({"status": "success"})

    # Retrieve the participant's current data for the edit form
    cursor.execute('SELECT * FROM participants WHERE id = ?', (participant_id,))
    participant = cursor.fetchone()
    conn.close()

    return render_template('edit_participant.html', participant=participant)

@app.route('/send_email', methods=['POST'])
def send_email():
    participant_ids = request.form['participant_ids'].split(',')
    subject = request.form['subject']
    body = request.form['body']
    cc = request.form.get('cc', '')  # Get CC field (if provided)

    # Normalize and handle special characters
    subject = unicodedata.normalize("NFKD", subject)
    body = unicodedata.normalize("NFKD", body).replace('\xa0', ' ').strip()

    # Process CC email addresses
    cc_list = [email.strip() for email in cc.split(',')] if cc else []

    conn = sqlite3.connect('events.db')
    cursor = conn.cursor()
    cursor.execute('SELECT email FROM participants WHERE id IN ({})'.format(','.join('?' * len(participant_ids))), participant_ids)
    recipients = [row[0] for row in cursor.fetchall()]
    conn.close()

    if not recipients:
        return jsonify({"status": "error", "message": "No recipients found"}), 400

    try:
        msg = Message(subject, sender=app.config['MAIL_USERNAME'], recipients=recipients, cc=cc_list)
        msg.body = body
        msg.charset = 'utf-8'
        mail.send(msg)
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

@app.route('/participant/<int:code>', methods=['GET'])
def get_participant_by_code(code):
    conn = sqlite3.connect('events.db')
    cursor = conn.cursor()
    cursor.execute("""
        SELECT name_kor, email, check_in_time, check_out_time
        FROM participants
        WHERE id = ?
    """, (code,))
    participant = cursor.fetchone()
    conn.close()

    if participant:
        return jsonify({
            "status": "success",
            "participant": {
                "name_kor": participant[0],
                "email": participant[1],
                "check_in_time": participant[2],
                "check_out_time": participant[3],
            }
        })
    else:
        return jsonify({"status": "error", "message": "Participant not found"}), 404

@app.route('/participant/check_in/<int:code>', methods=['POST'])
def check_in_participant(code):
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    conn = sqlite3.connect('events.db')
    cursor = conn.cursor()
    cursor.execute("UPDATE participants SET check_in_time = ? WHERE id = ?", (now, code))
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "message": "Checked in successfully", "check_in_time": now})

@app.route('/participant/check_out/<int:code>', methods=['POST'])
def check_out_participant(code):
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    conn = sqlite3.connect('events.db')
    cursor = conn.cursor()
    cursor.execute("UPDATE participants SET check_out_time = ? WHERE id = ?", (now, code))
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "message": "Checked out successfully", "check_out_time": now})

@app.route('/track_checkin')
def track_checkin_page():
    return render_template('track_checkin.html')

@app.route('/download_participants_excel/<int:event_id>', methods=['POST'])
def download_participants_excel(event_id):
    selected_ids = request.form.getlist('selected_participants')
    
    if not selected_ids:
        return jsonify({"status": "error", "message": "No participants selected"}), 400

    conn = sqlite3.connect('events.db')
    cursor = conn.cursor()
    
    # Fetch participant data for the selected IDs
    query = f'''
        SELECT * FROM participants 
        WHERE id IN ({','.join('?' * len(selected_ids))})
    '''
    cursor.execute(query, selected_ids)
    rows = cursor.fetchall()
    
    # Get column names
    cursor.execute("PRAGMA table_info(participants)")
    column_names = [column[1] for column in cursor.fetchall()]
    
    conn.close()

    # Convert the data to a DataFrame
    df = pd.DataFrame(rows, columns=column_names)
    
    # Save the DataFrame to an in-memory buffer
    output = BytesIO()
    df.to_excel(output, index=False)
    output.seek(0)

    # Return the Excel file as a response
    return send_file(output, as_attachment=True, download_name='participants.xlsx', mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

if __name__ == '__main__':
    import sys
    if hasattr(sys, '_MEIPASS'):
        # Running as a bundled executable
        app.run()
    else:
        # Running in development mode
        app.run(debug=True)
