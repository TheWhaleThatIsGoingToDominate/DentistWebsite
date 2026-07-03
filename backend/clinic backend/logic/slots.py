from database.main import supabase
from datetime import datetime, date
from zoneinfo import ZoneInfo

#loading slots, in the admin page and the public booking page
def load_slotsADMINPAGE(date):
    return (
        supabase.table("savingTheSlots")
        .select("time", "status")
        .eq("date", date)
        .execute()
        .data
    )

def load_booking_PBOOKINGPAGE(date: str):
    return (
        supabase.table("savingTheSlots")
        .select("time")
        .eq("date", date)
        .eq("status", "available")
        .execute()
        .data
    )


#slot generation in admin page
def generate_slots(startTime: str, endTime: str, slotLength: int):
    """
    logic:
    convert the starting time and end time to minutes, and then add the slot length
    to the the starting time while: startingTime < endTime
    """
    slots = []
    slotLength = int(slotLength)
    #counter to stop infinte loop
    counter = 0
    def timeToMinutes(timeTxt):
        """convert the start time to minutes here, the zero point is 12 AM"""
        period = timeTxt[-2:].strip().lower()
        hours, minutes = timeTxt[:-2].strip().split(":")
        hours, minutes = int(hours), int(minutes)
        if period == "pm":
            if hours == 12:
                result = 720 + minutes
            else:
                result = ((hours * 60) + 720) + minutes
        else:
            result = (hours * 60) + minutes
        return result


    def minutesToTime(theMinutes):
        """convert the minutes to time here, the zero point is 12 AM"""
        hours = theMinutes//60
        hours %= 12
        if hours == 0:
            hours += 12
        minutes = theMinutes%60
        if theMinutes >= 720:
            period = "pm".upper()
        else:
            period = "am".upper()
        return f"{hours:02.0f}:{minutes:02.0f} {period}"
    
    
    startMinutes = timeToMinutes(startTime)
    endMinutes = timeToMinutes(endTime)
    if startMinutes > endMinutes: 
        raise ValueError("the start time should be before the end times")
    
    while startMinutes < endMinutes:
        key = {
            "time":minutesToTime(startMinutes),
            "status":"available"
            }
        slots.append(key)
        startMinutes += int(slotLength)
    return slots 


#changing status of slot
def change_status(key: dict):
    #todo: #make a condition that relies on the backend of the bookers, to verify if the status is booked or not
    if key["status"] == "available":
        key["status"] = "blocked"
    elif key["status"] == "booked":
        return {"mesasge": "This slot is already booked and cannot be changed."}
        #notify the admin that they cannot change this slot cause it is booked
    else:
        key["status"] = "available"
    return key


#updating status of slot relative to booking
def update_status(date: str, appointment_time: str):
    slot = (
        supabase.table("savingTheSlots")
        .select("time", "status")
        .eq("date", date)
        .eq("time", appointment_time)
        .eq("status", "available")
        .execute()
        .data
    )
    if slot:
        (
            supabase.table("savingTheSlots")
            .update({ "status":"booked"})
            .eq("date", date)
            .eq("time", appointment_time)
            .execute()
        )
        return  {"updated":True}
    else:
        return {"updated":False}

#slot saving after generation in admin page
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


#cleaning old slots
def slots_cleanup():
    egypt_time = datetime.now(ZoneInfo("Africa/Cairo"))
    dateOfToday = egypt_time.date()

    slotsDataDates = (
        supabase.table("savingTheSlots")
        .select("date")
        .execute()
        .data
    )

    slotsDataDates = [datetime.strptime(theDate["date"], "%Y-%m-%d").date()  for theDate in slotsDataDates]

    #loop through the list and check if the date is in the past and delete the related element
    for theDate in slotsDataDates:
        if theDate < dateOfToday:
            (
                supabase.table("savingTheSlots")
                .delete()
                .eq("date", str(theDate))
                .execute()
            )

    return {"cleaned":True}
