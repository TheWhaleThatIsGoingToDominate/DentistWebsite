#TODO: make a backend that saves the slots generated from generateSlots.py to a database
from database.main import supabase

def save_slots(date: str, slots: list): #<copied
    for slot in slots:
        existing = (
            supabase.table("savingTheSlots")
            .select("*")
            .eq("date", date)
            .eq("time", slot["time"])
            .execute()
            .data
        )

        if existing:
            (
                supabase.table("savingTheSlots")
                .update({"status": slot["status"]})
                .eq("date", date)
                .eq("time", slot["time"])
                .execute()
            )
        else:
            (
                supabase.table("savingTheSlots")
                .insert({
                    "date": date,
                    "time": slot["time"],
                    "status": slot["status"]
                })
                .execute()
            )

    #use the idea: if the time is not in the newly generated list, delete it.

    theData = (
        supabase.table("savingTheSlots")
        .select("time")
        .eq("date", date)
        .execute()
        .data
    )

    new_slots = [slot["time"] for slot in slots]

    for oldSlot in theData:
        if oldSlot["time"] not in new_slots:
            (
            supabase.table("savingTheSlots")
            .delete()
            .eq("date", date)
            .eq("time", oldSlot["time"])
            .execute()
        )
    return {"saved": True, "count": len(slots)}



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