import os
import pandas as pd 
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from sqlalchemy import  Float, inspect, Sequence, Table, Column, Integer, String, MetaData,exc
from sqlalchemy.engine import Engine
import oracledb
import json

# Switch to thick mode
oracledb.init_oracle_client(lib_dir=r"C:\oracle\instantclient_21_14")

app = Flask(__name__)

# Configure the SQLALCHEMY_DATABASE_URI with your Oracle database URL
app.config['SQLALCHEMY_DATABASE_URI'] = 'oracle+oracledb://HR:HR@localhost:1521/XE'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize the database
db = SQLAlchemy(app)

# Enable CORS for all routes
CORS(app)

from sqlalchemy import Sequence

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, Sequence('user_id_seq'), primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(80), nullable=False)

    def __repr__(self):
        return f'<User {self.email}>'

def create_table_if_not_exists(table_name):
    inspector = inspect(db.engine)
    if not inspector.has_table(table_name):
        db.create_all()
        print(f'Table {table_name} created.')

# Create a route to retrieve all users
@app.route('/api/users', methods=['GET'])
def get_users():
    users = User.query.all()
    user_list = [{'id': user.id, 'email': user.email, 'password': user.password} for user in users]
    return jsonify({'users': user_list})

# Create a route to add a new user
@app.route('/api/users', methods=['POST', 'PUT'])
def add_user():
    # Check if request data exists
    if not request.data:
        return jsonify({'error': 'No input data provided'}), 400
    
    print(request.data)
    # Parse JSON data from request
    data = request.get_json()

    print("data : " , data['users'][-1])
    data = data['users'][-1]
    # Extract email and password from data
    email = data['email']
    password = data['password']

    print(email)
    print(password)

    if not email or not password:
        return jsonify({'error': 'Email and password are required fields'}), 400

    # Ensure the table exists
    create_table_if_not_exists('users')

    # Create new user instance and add to database
    new_user = User(id = None,email=email, password=password)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({'message': f'Added user {email}'}), 201



@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part in the request'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    allowed_extensions = ['csv', 'xml', 'json', 'xlsx', 'xls', 'txt']
    file_extension = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''

    if file_extension not in allowed_extensions:
        return jsonify({'error': 'Unsupported file extension'}), 400

    # Save the file to a temporary location
    upload_dir = 'uploads'
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir)

    file_path = os.path.join(upload_dir, file.filename)
    file.save(file_path)

    # Extract data from the file based on its extension
    extracted_data = extract_data(file_path, file_extension)

    if not extracted_data:
        return jsonify({'error': 'No data extracted from the file'}), 400

    # Dynamically create a table based on the structure of the extracted data
    table_name = 'dynamic_table'
    create_dynamic_table(table_name, extracted_data[0])

    # Insert extracted data into the new table
    insert_data_into_table(db.engine,table_name, extracted_data)

    return jsonify({'message': 'File uploaded and data inserted successfully'}), 201

def extract_data(file_path, file_type):
    if file_type == 'csv':
        return extract_csv_data(file_path)
    elif file_type == 'xml':
        return extract_xml_data(file_path)
    elif file_type == 'json':
        return extract_json_data(file_path)
    elif file_type in ['xlsx', 'xls']:
        return extract_excel_data(file_path)
    elif file_type == 'txt':
        return extract_txt_data(file_path)
    else:
        raise ValueError('Unsupported file type')

def extract_csv_data(file_path):
    df = pd.read_csv(file_path)
    return df.to_dict(orient='records')

def extract_xml_data(file_path):
    tree = ET.parse(file_path)
    root = tree.getroot()
    data = []
    for child in root:
        data.append({elem.tag: elem.text for elem in child})
    return data

def extract_json_data(file_path):
    with open(file_path, 'r') as file:
        data = json.load(file)
    return data

def extract_excel_data(file_path):
    df = pd.read_excel(file_path)
    return df.to_dict(orient='records')

def extract_txt_data(file_path):
    with open(file_path, 'r') as file:
        lines = file.readlines()
    headers = lines[0].strip().split()  # Assuming the first line contains headers
    data = [dict(zip(headers, line.strip().split())) for line in lines[1:]]
    return data

def create_dynamic_table(table_name, sample_data):
    metadata = MetaData()
    columns = [Column('id', Integer, primary_key=True)]
    
    for key, value in sample_data.items():
        if isinstance(value, str):
            column_type = String(255)  # Default to 255 characters, adjust as needed
        elif isinstance(value, int):
            column_type = Integer
        elif isinstance(value, float):
            column_type = Float
        else:
            column_type = String(255)  # Default for unknown types
        
        columns.append(Column(key, column_type))
    
    dynamic_table = Table(table_name, metadata, *columns)
    metadata.create_all(db.engine)


def insert_data_into_table(engine, table_name, data):
    print(data)
    print('\n\n\n\n\n\n\n')
    metadata = MetaData()
    try:
        table = Table(table_name, metadata, autoload_with=engine)
    except exc.InvalidRequestError:
        raise ValueError(f"Invalid table name {table_name} or connection issue")

    with engine.connect() as conn:
        try:
            conn.execute(table.insert(), data)
        except Exception as e:
            raise ValueError(f"Failed to insert data into table {table_name}: {str(e)}")


if __name__ == '__main__':
    # Run db.create_all() within the application context
    with app.app_context():
        db.create_all()
    app.run(debug=True)
