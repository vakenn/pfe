import os
import pandas as pd
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS, cross_origin
import json

# Switch to thick mode
import oracledb
from sqlalchemy import Column, Float, Integer, MetaData, String, Table  # Ensure correct import of oracledb
oracledb.init_oracle_client(lib_dir=r"C:\oracle\instantclient_21_14")

app = Flask(__name__)

# Configure the SQLALCHEMY_DATABASE_URI with your Oracle database URL
app.config['SQLALCHEMY_DATABASE_URI'] = 'oracle+oracledb://system:system@localhost:1521/XE'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize the database
db = SQLAlchemy(app)

# Enable CORS for all routes
CORS(app)
CORS(app, origins='http://localhost:4200')


# Define User model
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(80), nullable=False)

    def __repr__(self):
        return f'<User {self.email}>'

# Create a route to retrieve all users
@app.route('/api/users', methods=['GET'])
def get_users():
    users = User.query.all()
    user_list = [{'id': user.id, 'email': user.email, 'password': user.password} for user in users]
    return jsonify({'users': user_list})

# Create a route to add a new user
@app.route('/api/users', methods=['POST'])
def add_user():
    data = request.get_json()

    if not data or 'email' not in data or 'password' not in data:
        return jsonify({'error': 'Invalid input data. Email and password are required.'}), 400

    email = data['email']
    password = data['password']

    if not email or not password:
        return jsonify({'error': 'Email and password are required fields'}), 400

    new_user = User(email=email, password=password)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({'message': f'Added user {email}'}), 201

# Create a route to handle file uploads
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

    upload_dir = 'uploads'
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir)

    file_path = os.path.join(upload_dir, file.filename)
    file.save(file_path)

    extracted_data = extract_data(file_path, file_extension)

    if not extracted_data:
        return jsonify({'error': 'No data extracted from the file'}), 400

    table_name = 'dynamic_table'  # Replace with your actual table name
    create_dynamic_table(table_name, extracted_data[5])
    print('hey : ',extracted_data[5])
    insert_data_into_table(db.engine, table_name, extracted_data)

    return jsonify({'message': 'File uploaded and data inserted successfully'}), 201

# Function to extract data based on file type
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

# Function to extract data from TXT files
def extract_txt_data(file_path):
    with open(file_path, 'r') as file:
        data = file.read().splitlines()
    return data

# Function to extract data from CSV files
def extract_csv_data(file_path):
    df = pd.read_csv(file_path)
    return df.to_dict(orient='records')

# Function to extract data from XML files
def extract_xml_data(file_path):
    tree = ET.parse(file_path)
    root = tree.getroot()
    data = []
    for child in root:
        data.append({elem.tag: elem.text for elem in child})
    return data

# Function to extract data from JSON files
def extract_json_data(file_path):
    with open(file_path, 'r') as file:
        data = json.load(file)
    return data

# Function to extract data from Excel files
def extract_excel_data(file_path):
    df = pd.read_excel(file_path)
    return df.to_dict(orient='records')

# Function to create dynamic table based on data structure
def create_dynamic_table(table_name, sample_data):
    metadata = MetaData()

    # Define columns
    columns = []
    for key, value in sample_data.items():
        if isinstance(value, str):
            column_type = String(255)  # Adjust size as needed
        elif isinstance(value, int):
            column_type = Integer()
        elif isinstance(value, float):
            column_type = Float()
        else:
            column_type = String(255)  # Default to string for unknown types
        columns.append(Column(key, column_type, nullable=True))

    # Create the table
    dynamic_table = Table(table_name, metadata, *columns)

    # Create the table in the database
    try:
        metadata.create_all(db.engine)
        print(f"Table '{table_name}' created successfully.")
    except Exception as e:
        raise ValueError(f"Failed to create table '{table_name}': {str(e)}")

def formatdata(data):
    header=data[0]
    data=data[1:]
    for i in range(len(data)):
        data[i]=dict(zip(header,data[i]))
    return data

# Function to insert data into dynamically created table
def insert_data_into_table(engine, table_name, data):
    
    metadata = MetaData()
    try:
        table = Table(table_name, metadata, autoload_with=engine)
        columns_in_table = table.columns.keys()
        data[0]=columns_in_table
        data = formatdata(data)
    except exec.InvalidRequestError:
        raise ValueError(f"Invalid table name {table_name} or connection issue")

    with engine.connect() as conn:
        try:
            conn.execute(table.insert(),data)
            conn.commit()
        except Exception as e:
            raise ValueError(f"Failed to insert data into table {table_name}: {str(e)}")


@app.route('/api/insert_dynamic', methods=['POST'])
@cross_origin(origin='http://localhost:4200')
def insert_into_dynamic_table():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    if request.content_type != 'application/json':
        return jsonify({'error': 'Content-Type must be application/json'}), 415

    data = request.get_json()
    data = data[0]
    if not data:
        return jsonify({'error': 'No JSON data provided'}), 415

    try:
        table_name = 'dynamic_table' # Replace 'dynamic_table' with your actual table name if needed
        dataCreation=formatdata(data)
        create_dynamic_table(table_name, dataCreation[5])
        insert_data_into_table(db.engine, table_name, data)
        return jsonify({'message': f'Data inserted successfully into {table_name}'}), 201
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 500

if __name__ == '__main__':
    app.run(debug=True)  # Use a production-ready WSGI server in production
