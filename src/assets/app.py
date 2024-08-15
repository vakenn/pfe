import os
import re
import pandas as pd
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from sqlalchemy import  MetaData, Table, text, inspect , create_engine , Sequence
import oracledb
import json
from uuid import uuid4
from sqlalchemy.orm import sessionmaker 

# Initialize Oracle client
oracledb.init_oracle_client(lib_dir=r"C:\oracle\instantclient_21_14")
app = Flask(__name__)
DATABASE_URL = "oracle+oracledb://system:system@localhost:1521/XE"
# Configure SQLAlchemy with Oracle database
app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
# Create engine and session
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
# Initialize the database
db = SQLAlchemy(app)
# Enable CORS for all routes
CORS(app)
# Define User model
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, Sequence('user_id_seq'), primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(80), nullable=False)

    def __repr__(self):
        return f'<User {self.email}>'

# Ensure the table exists
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
@app.route('/api/users', methods=['POST'])
def add_user():
    data = request.get_json()

    if not data:
        return jsonify({'error': 'No input data provided'}), 400

    if 'user' not in data:
        return jsonify({'error': 'Invalid data format'}), 400
    
    user_data = data['user']
    email = user_data.get('email')
    password = user_data.get('password')

    if not email or not password:
        return jsonify({'error': 'Email and password are required fields'}), 400

    # Create the table if it does not exist
    create_table_if_not_exists('users')

    # Create and add the new user
    new_user = User(email=email, password=password)
    db.session.add(new_user)
    
    try:
        db.session.commit()
        return jsonify({'message': f'Added user {email}'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to add user: {str(e)}'}), 500

@app.route('/api/delete_user', methods=['POST'])
def delete_user():
    data = request.get_json()
    user_id = data.get('user_id')

    if not user_id:
        return jsonify({"error": "Missing user_id in the request"}), 400

    # Delete the user from the database
    sql = "DELETE FROM users WHERE id = :user_id"

    # Execute the SQL query and handle the transaction
    with engine.connect() as connection:
        transaction = connection.begin()  # Start a transaction
        try:
            result = connection.execute(text(sql), {'user_id': user_id})
            if result.rowcount == 0:
                transaction.rollback()  # Rollback if no rows were deleted
                return jsonify({"error": "User not found"}), 404
            transaction.commit()  # Commit the transaction
            return jsonify({"message": f"User with ID {user_id} deleted successfully"}), 200
        except Exception as e:
            transaction.rollback()  # Rollback in case of an error
            return jsonify({"error": f"Failed to delete user: {str(e)}"}), 500

@app.route('/api/update_user', methods=['POST'])
def update_user():
    data = request.get_json()
    user_id = data.get('id')
    updates = data.get('updates')

    if not user_id or not updates:
        return jsonify({"error": "Missing id or updates in the request"}), 400

    # Build the dynamic SQL query
    set_clause = ", ".join([f"{key} = :{key}" for key in updates.keys()])
    sql = f"UPDATE users SET {set_clause} WHERE id = :user_id"

    params = {**updates, 'user_id': user_id}

    # Execute the SQL query and handle the transaction
    with engine.connect() as connection:
        transaction = connection.begin()  # Start a transaction
        try:
            result = connection.execute(text(sql), params)
            if result.rowcount == 0:
                transaction.rollback()  # Rollback if no records were updated
                return jsonify({"error": "No record found with the provided id"}), 404
            transaction.commit()  # Commit the transaction
            return jsonify({"message": "User updated successfully"}), 200
        except Exception as e:
            transaction.rollback()  # Rollback in case of an error
            return jsonify({"error": f"Failed to update user: {str(e)}"}), 500


def sanitize_column_name(name: str) -> str:
    # Convert name to uppercase for Oracle compatibility and sanitize
    return re.sub(r'\W|^(?=\d)', '_', name).upper()


# Function to create a table from a dataframe
def create_table_from_dataframe(df: pd.DataFrame, table_name: str):
    inspector = inspect(db.engine)
    if inspector.has_table(table_name):
        app.logger.info(f'Table {table_name} already exists.')
        return  # Skip table creation if it exists

    # Add the UUID column and define the other columns
    columns = 'UUID VARCHAR2(36), ' + ', '.join([f"{sanitize_column_name(col)} VARCHAR2(255)" for col in df.columns])
    create_table_query = f"CREATE TABLE {table_name} ({columns})"
    
    try:
        db.session.execute(text(create_table_query))
        db.session.commit()
        app.logger.info(f'Table {table_name} created successfully.')
    except Exception as e:
        app.logger.error(f'Error creating table {table_name}: {str(e)}')
        raise


# Function to insert data from a dataframe into a table
def insert_dataframe_into_table(df: pd.DataFrame, table_name: str):
    for index, row in df.iterrows():
        # Generate UUID for each row
        row_uuid = str(uuid4())
        
        # Prepare the row data with the UUID
        values = f"'{row_uuid}', " + ', '.join([f"'{str(value).replace('\'', '\'\'')}'" for value in row])
        
        # Insert the row into the table
        insert_query = f"INSERT INTO {table_name} VALUES ({values})"
        db.session.execute(text(insert_query))
    
    db.session.commit()

@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        app.logger.error('No file part in the request')
        return jsonify({'error': 'No file part in the request'}), 400

    file = request.files['file']
    if file.filename == '':
        app.logger.error('No selected file')
        return jsonify({'error': 'No selected file'}), 400

    allowed_extensions = ['csv', 'xml', 'json', 'xlsx', 'xls', 'txt']
    file_extension = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
    if file_extension not in allowed_extensions:
        app.logger.error('Unsupported file extension')
        return jsonify({'error': 'Unsupported file extension'}), 400

    upload_dir = 'uploads'
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir)

    file_path = os.path.join(upload_dir, file.filename)
    file.save(file_path)
    app.logger.info(f'File saved to {file_path}')

    try:
        extracted_data = extract_data(file_path, file_extension)
        if not extracted_data:
            app.logger.error('No data extracted from the file')
            return jsonify({'error': 'No data extracted from the file'}), 400

        table_name = sanitize_column_name(file.filename.rsplit('.', 1)[0])
        create_table_from_dataframe(pd.DataFrame(extracted_data), table_name)
        insert_dataframe_into_table(pd.DataFrame(extracted_data), table_name)
        insert_uploadedfile_record(file.filename, table_name)

        return jsonify({'message': 'File uploaded and data inserted successfully'}), 201
    except Exception as e:
        app.logger.error(f'Error processing file: {str(e)}')
        return jsonify({'error': f'Error processing file: {str(e)}'}), 500

# Function to insert a record into the uploadedfiles table
def insert_uploadedfile_record(filename: str, associated_table: str):
    insert_query = f"INSERT INTO uploadedfiles (filename, associated_table) VALUES (:filename, :associated_table)"
    db.session.execute(text(insert_query), {'filename': filename, 'associated_table': associated_table})
    db.session.commit()

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
    headers = lines[0].strip().split()
    data = [dict(zip(headers, line.strip().split())) for line in lines[1:]]
    return data

def insert_data_into_table(table_name, data):
    metadata = MetaData(bind=db.engine)
    table = Table(table_name, metadata, autoload_with=db.engine)
    with db.engine.connect() as connection:
        connection.execute(table.insert(), data)

@app.route('/api/get_table_names', methods=['GET'])
def get_table_names():
    inspector = inspect(db.engine)
    tables = inspector.get_table_names()
    return jsonify({'tables': tables})

@app.route('/api/get_column_data', methods=['GET'])
def get_column_data():
    column_name = request.args.get('column_name')
    table_name = request.args.get('table_name')

    if not column_name or not table_name:
        return jsonify({'error': 'Both column_name and table_name parameters are required'}), 400

    # Sanitize inputs
    column_name = sanitize_column_name(column_name)
    table_name = sanitize_column_name(table_name)

    # Fetch the column data
    query = text(f"SELECT {column_name} FROM {table_name}")
    print(query)
    with db.engine.connect() as conn:
        try:
            result = conn.execute(query)
            data = [row[0] for row in result.fetchall()]
            return jsonify(data)
        except Exception as e:
            return jsonify({'error': f'Failed to fetch data for column {column_name} in table {table_name}: {str(e)}'}), 500

@app.route('/api/get_column_names', methods=['GET'])
def get_column_names():
    table_name = request.args.get('table_name')
    
    if not table_name:
        return jsonify({'error': 'Table name parameter is required'}), 400

    table_name = sanitize_column_name(table_name)
    
    try:
        inspector = inspect(db.engine)
        columns = [column['name'] for column in inspector.get_columns(table_name)]
        return jsonify({'columns': columns})
    except Exception as e:
        return jsonify({'error': f'Failed to fetch column names for table {table_name}: {str(e)}'}), 500

@app.route('/api/files', methods=['GET'])
def get_files():
    try:
        query = "SELECT FILENAME, ASSOCIATED_TABLE FROM uploadedfiles"
        with db.engine.connect() as conn:
            result = conn.execute(text(query))
            files = [{"filename": row[0]} for row in result]
            return jsonify({'files': files})
    except Exception as e:
        return jsonify({'error': f'Failed to fetch files: {str(e)}'}), 500

@app.route('/api/get_table_data', methods=['GET'])
def get_table_data():
    table_name = request.args.get('table_name')

    if not table_name:
        return jsonify({'error': 'table_name parameter is required'}), 400

    # Sanitize the table name
    table_name = sanitize_column_name(table_name)

    # Fetch the table's columns
    inspector = inspect(engine)
    columns = inspector.get_columns(table_name)

    column_names = [column['name'] for column in columns]

    # Fetch the table data
    query = text(f"SELECT * FROM {table_name}")
    try:
        with engine.connect() as conn:
            result = conn.execute(query)
            # Process the result into a list of dictionaries
            data = [dict(zip(column_names, row)) for row in result.fetchall()]
            return jsonify(data)
    except Exception as e:
        return jsonify({'error': f'Failed to fetch data from table {table_name}: {str(e)}'}), 500

@app.route('/api/update_table', methods=['POST'])
def update_table():
    data = request.get_json()
    table_name = data.get('table_name')
    uuid_value = data.get('UUID')
    updates = data.get('updates')

    if not table_name or not uuid_value or not updates:
        return jsonify({"error": "Missing table_name, UUID, or updates in the request"}), 400

    # Build the dynamic SQL query
    set_clause = ", ".join([f"{key} = :{key}" for key in updates.keys()])
    sql = f"UPDATE {table_name} SET {set_clause} WHERE UUID = :uuid_value"

    params = {**updates, 'uuid_value': uuid_value}

    # Execute the SQL query and handle the transaction
    with engine.connect() as connection:
        transaction = connection.begin()  # Start a transaction
        try:
            result = connection.execute(text(sql), params)
            if result.rowcount == 0:
                transaction.rollback()  # Rollback if no records were updated
                return jsonify({"error": "No record found with the provided UUID"}), 404
            transaction.commit()  # Commit the transaction
            return jsonify({"message": "Record updated successfully"}), 200
        except Exception as e:
            transaction.rollback()  # Rollback in case of an error
            return jsonify({"error": f"Failed to update record: {str(e)}"}), 500

@app.route('/api/delete_column', methods=['POST'])
def delete_column():
    data = request.get_json()
    table_name = data.get('table_name')
    column_name = data.get('column_name')

    if not table_name or not column_name:
        return jsonify({"error": "Missing table_name or column_name in the request"}), 400

    # Sanitize the table and column names
    table_name = sanitize_column_name(table_name)
    column_name = sanitize_column_name(column_name)

    # Ensure proper quoting for Oracle if needed
    quoted_column_name = f'"{column_name}"'

    # Build the dynamic SQL query to drop the column
    sql = f"ALTER TABLE {table_name} DROP COLUMN {quoted_column_name}"

    # Execute the SQL query and handle the transaction
    with engine.connect() as connection:
        transaction = connection.begin()  # Start a transaction
        try:
            connection.execute(text(sql))
            transaction.commit()  # Commit the transaction
            return jsonify({"message": f"Column {quoted_column_name} deleted successfully from table {table_name}"}), 200
        except Exception as e:
            transaction.rollback()  # Rollback in case of an error
            return jsonify({"error": f"Failed to delete column: {str(e)}"}), 500

@app.route('/api/delete_row', methods=['POST'])
def delete_row():
    data = request.get_json()
    table_name = data.get('table_name')
    uuid_value = data.get('UUID')

    if not table_name or not uuid_value:
        return jsonify({"error": "Missing table_name or UUID in the request"}), 400

    # Sanitize the table name
    table_name = sanitize_column_name(table_name)

    # Build the dynamic SQL query to delete the row
    sql = f"DELETE FROM {table_name} WHERE UUID = :uuid_value"

    # Execute the SQL query and handle the transaction
    with engine.connect() as connection:
        transaction = connection.begin()  # Start a transaction
        try:
            result = connection.execute(text(sql), {'uuid_value': uuid_value})
            if result.rowcount == 0:
                transaction.rollback()  # Rollback if no rows were deleted
                return jsonify({"error": "No record found with the provided UUID"}), 404
            transaction.commit()  # Commit the transaction
            return jsonify({"message": "Row deleted successfully"}), 200
        except Exception as e:
            transaction.rollback()  # Rollback in case of an error
            return jsonify({"error": f"Failed to delete row: {str(e)}"}), 500

@app.route('/api/add_row', methods=['POST'])
def add_row():
    data = request.get_json()
    table_name = data.get('table_name')
    row_data = data.get('row_data')

    if not table_name or not row_data:
        return jsonify({"error": "Missing table_name or row_data in the request"}), 400

    # Sanitize the table name
    table_name = sanitize_column_name(table_name)

    # Build the dynamic SQL query
    columns = ', '.join(row_data.keys())
    values = ', '.join([f":{key}" for key in row_data.keys()])
    sql = f"INSERT INTO {table_name} ({columns}) VALUES ({values})"

    # Execute the SQL query and handle the transaction
    with engine.connect() as connection:
        transaction = connection.begin()  # Start a transaction
        try:
            connection.execute(text(sql), row_data)
            transaction.commit()  # Commit the transaction
            return jsonify({"message": "Row added successfully"}), 200
        except Exception as e:
            transaction.rollback()  # Rollback in case of an error
            return jsonify({"error": f"Failed to add row: {str(e)}"}), 500

@app.route('/api/add_column', methods=['POST'])
def add_column():
    data = request.get_json()
    table_name = data.get('table_name')
    column_name = data.get('column_name')
    column_type = data.get('column_type')  # e.g., VARCHAR2(255), NUMBER, etc.

    if not table_name or not column_name or not column_type:
        return jsonify({"error": "Missing table_name, column_name, or column_type in the request"}), 400

    # Sanitize the table and column names
    table_name = sanitize_column_name(table_name)
    column_name = sanitize_column_name(column_name)

    # Build the dynamic SQL query to add the column
    sql = f"ALTER TABLE {table_name} ADD ({column_name} {column_type})"

    # Execute the SQL query and handle the transaction
    with engine.connect() as connection:
        transaction = connection.begin()  # Start a transaction
        try:
            connection.execute(text(sql))
            transaction.commit()  # Commit the transaction
            return jsonify({"message": f"Column {column_name} added successfully to table {table_name}"}), 200
        except Exception as e:
            transaction.rollback()  # Rollback in case of an error
            return jsonify({"error": f"Failed to add column: {str(e)}"}), 500

@app.route('/api/rename_column', methods=['POST'])
def rename_column():
    data = request.get_json()
    table_name = data.get('table_name')
    old_column_name = data.get('old_column_name')
    new_column_name = data.get('new_column_name')

    if not table_name or not old_column_name or not new_column_name:
        return jsonify({"error": "Missing table_name, old_column_name, or new_column_name in the request"}), 400

    table_name = sanitize_column_name(table_name)
    old_column_name = sanitize_column_name(old_column_name)
    new_column_name = sanitize_column_name(new_column_name)

    sql = f"ALTER TABLE {table_name} RENAME COLUMN {old_column_name} TO {new_column_name}"

    try:
        with engine.connect() as connection:
            transaction = connection.begin()
            connection.execute(text(sql))
            transaction.commit()
        return jsonify({"message": f"Column {old_column_name} renamed to {new_column_name} successfully in table {table_name}"}), 200
    except Exception as e:
        return jsonify({"error": f"Failed to rename column: {str(e)}"}), 500


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(host='0.0.0.0', port=5000, debug=True)
