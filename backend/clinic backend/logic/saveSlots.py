#TODO: make a backend that saves the slots generated from generateSlots.py to a database
from dotenv import load_dotenv
load_dotenv()

#initializing supabase
import os
from supabase import create_client

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
supabase = create_client(url, key)
def load_data():
    response = (
        supabase.table("savingTheSlots")
        .select("*")
        .execute()
    )
    data = response.data
    return data

def emptyDatabaseCheck(): #helper function for the database
    #loading the database information
    data = load_data()
    if not data:
        return False #signal to the database to INSERT
    else:
        return True #signal to the database to UPDATE ONLY

# the only error I am concerned of (it also applies in other files):
# from database.main import data
# #    ^^^^^^^^ SyntaxError: no module named "database"