from database.main import supabase
from fastapi import HTTPException
def load_booking(date: str): #admin page
    return (
        supabase.table("bookingInfo")
        .select("name", "phone_number", "service", "date", "appointment_time", "notes", "booking_reference", "status")
        .eq("date", date)
        .execute()
        .data
    )


#changing the status of a booking in the admin page
def change_status_of_booking(status: str ,booking_reference):
    #gathering the date and time, to change the status of the time 
    
    key = ( #supposing that the list always has one element, cannot be empty
        supabase.table("bookingInfo")
        .select("*")
        .eq("booking_reference", booking_reference)
        .execute()
        .data
    )

    if not key:
        raise HTTPException(
            status_code=404, detail="Booking not found"
            )

    time = key[0]["appointment_time"]

    date = key[0]["date"]



    #changing the status of the booking
    (
        supabase.table("bookingInfo")
        .update({"status":str(status)})
        .eq("booking_reference", booking_reference)
        .execute()
    )


    #changing the status of the time slot
    if status == "scheduled":
        (
            supabase.table("savingTheSlots")
            .update({"status":"booked"})
            .eq("time", time)
            .eq("date", date)
            .execute()
        )
    elif status == "cancelled":
        (
            supabase.table("savingTheSlots")
            .update({"status":"available"})
            .eq("time", time)
            .eq("date", date)
            .execute()
        )
    else: pass

    return {"message":"Booking status updated."}


#delete the booking in the admin page
def delete_booking(booking_reference):
    #extracting time and date before deleting, to find the time slot and make it available
    key = ( #supposing that the list always has one element, cannot be empty
        supabase.table("bookingInfo")
        .select("*")
        .eq("booking_reference", booking_reference)
        .execute()
        .data
    )
    if not key:
        raise HTTPException(
            status_code=404,
            detail="Booking not found"
        )
    time = key[0]["appointment_time"]

    date = key[0]["date"]

    #deleting the booking
    (
        supabase.table("bookingInfo")
        .delete()
        .eq("booking_reference", booking_reference)
        .execute()
    )

    #changing the slot to become available
    (
        supabase.table("savingTheSlots")
        .update({"status":"available"})
        .eq("time", time)
        .eq("date", date)
        .execute()
    )
    return {"message":"Booking deleted."}
