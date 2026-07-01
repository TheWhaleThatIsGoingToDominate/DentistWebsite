#loading key and url from .env file
from dotenv import load_dotenv
load_dotenv()

#initializing supabase
import os
from supabase import create_client

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
supabase = create_client(url, key)




# import ast #the module to convert such a string "['1', '2', '3']" to a functioning list
# data, count = response.split()
# data = data[data.find("["):] #<<<< this the actual data of the database, represented in a list
# data = ast.literal_eval(data)
# print(data, "type:", type(data))
# #      ^^^^^^^^^^^^^^^^ the function used for conversion






#---------------------------------------THE LOGIC THAT I USED BEFORE-------------------------------------------


# #the saving code
# from logic.saveSlots import emptyDatabaseCheck, load_data#< "data" is the variable holding the data of the database
# #    ^^^^^ SyntaxError: no module named "logic"
# #TODO: Fix the errors in here, you have 5 major issues chatgpt pointed out.
# def save_slots(slots: list): 
#     notAddedTimes = []
#     theCheck = emptyDatabaseCheck()
#     data = load_data()
#     if not theCheck: #user could generate more slots and try to save them, and it may not be empty at first hand
#         if len(slots) == len(data):
#             for key in slots:
#                 response = ( #update the data (this is the framework, not completed yet)
#                 supabase.table("savingTheSlots")
#                 .update({"time":key["time"]},{"status":key["status"]})
#                 .eq("time", key["time"])
#                 .execute()
#                 )
#         else:
#             for index, key in enumerate(slots):
#                 if key["time"] not in data[index]["time"]:
#                     notAddedTimes.append(key)
#                 else:
#                     response = ( #update the data (this is the framework, not completed yet)
#                     supabase.table("savingTheSlots")
#                     .update({"time":key["time"]},{"status":key["status"]})
#                     .eq("time", key["time"])
#                     .execute()
#                     )
#     else: 
#         for key in slots: #insert a key per iteration to the database
#             response = ( #insert the data (this is the framework, not completed yet)
#             supabase.table("savingTheSlots")
#             .insert({"id": 1, "name": "Pluto"})
#             .execute()
#             )
#     if not notAddedTimes:
#         for key in notAddedTimes:
#             response = (
#                 supabase.table("savingTheSlots")
#                 .insert({"time":notAddedTimes["time"]},{"status":notAddedTimes["status"]})
#                 .execute()
#             )
#     return True
