from database.main import supabase
from fastapi import HTTPException
from logic.reception.patients import patient_lookup
from logic.auth.authentication import decryptor, encryptor

def load_patient_history(name: str | None = None, phone_number: str | None = None): #admin page

    def load(name_lookup=None, phone_number_lookup=None): #helper
        if not name_lookup and not phone_number_lookup:
            raise HTTPException(
                status_code=400,
                detail="no valid args, at least one arg"
            )
        elif name_lookup and phone_number_lookup:
            bookings = (
            supabase.table("bookingInfo")
            .select("name, phone_number, service, notes, date, appointment_time, status, booking_reference")
            .eq("patient_lookup", patient_lookup(name_lookup, phone_number_lookup))
            .execute()
            .data)
        elif not name_lookup and phone_number_lookup:
            bookings = (
            supabase.table("bookingInfo")
            .select("name, phone_number, service, notes, date, appointment_time, status, booking_reference")
            .eq("phone_number_lookup", patient_lookup(phone_number=phone_number_lookup))
            .execute()
            .data)
        elif not phone_number_lookup and name_lookup:
            bookings = (
            supabase.table("bookingInfo")
            .select("name, phone_number, service, notes, date, appointment_time, status, booking_reference")
            .eq("name_lookup", patient_lookup(name=name_lookup))
            .execute()
            .data)
        for i in bookings:
            i["phone_number"] = decryptor(i["phone_number"])
            i["name"] = decryptor(i["name"])
            i["notes"] = decryptor(i["notes"])
            i["service"] = decryptor(i["service"])

        return bookings
    return load(name, phone_number)



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
