from dotenv import load_dotenv
import os
import pymysql

load_dotenv()  # load variables from .env

conn = pymysql.connect(
    host=os.environ['MYSQL_HOST'],
    user=os.environ['MYSQL_USER'],
    password=os.environ['MYSQL_PASSWORD'],
    database=os.environ['MYSQL_DB'],
    port=int(os.environ['MYSQL_PORT'])
)
print("Connected!")
conn.close()
