#TODO: make a backend that saves the slots generated from generateSlots.py to a database
from database.main import supabase

def save_slots(date: str, slots: list):
    for key in slots:
        existing = (supabase.table("savingTheSlots")
        .select("*")
        .eq("date", date)
        .eq("time", key["time"])
        .execute()
        .data
        )
        if existing:
            (
                supabase.table("savingTheSlots")
                .update({"time":key["time"]})
                .eq("date", date)
                .eq("time", key["time"])
                .execute()
            )
        else:
            (
                supabase.table("savingTheSlots")
                .insert({
                "time":key["time"],
                "status":key["status"],
                "date":date
            })
                .execute()
            )
    
    return {"saved":True, "count":len(slots)}



#.update method in dicts returns None
# the only error I am concerned of (it also applies in other files):
# from database.main import data
# #    ^^^^^^^^ SyntaxError: no module named "database"

#--------------------------THE LOGIC THAT I USED (those are helper functions to my logic)--------------------

# def load_data():
#     response = (
#         supabase.table("savingTheSlots")
#         .select("*")
#         .execute()
#     )
#     data = response.data
#     return data

# def emptyDatabaseCheck(): #helper function for the database
#     #loading the database information
#     data = load_data()
#     if not data:
#         return False #signal to the database to INSERT
#     else:
#         return True #signal to the database to UPDATE ONLY