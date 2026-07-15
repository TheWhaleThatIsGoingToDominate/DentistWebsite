    #TODO: make a backend that takes the info of the booking of the customer and 
#saves it to google sheets, the backend must be able to detect double books from the 
#same schedule or the same name
from fastapi import HTTPException
from database.main import supabase
from logic.reception.slots import update_status
from logic.reception.patients import patient_lookup
from logic.auth.authentication import decryptor, encryptor
import secrets
import string

def save_booking(name: str, phone_number, service, date, appointment_time, notes=None): #public booking
    #confirming the name and the phone number to be legitimate
    for subname in name.split():
        if not 2 < len(subname) < 20:
            raise Exception("Invalid name. Enter your name correctly")
    if len(phone_number) != 10 and len(phone_number) != 11:
        raise Exception("Invalid phone number.")

    #update the slot from available to booked, then save the booking
    if update_status(date, appointment_time) == {"updated":True}:
        try:
            #generating random 8 digit code, that will be the booking_reference
            alphabetAndNumbers = string.ascii_letters + string.digits
            theCode = ""
            for _ in range(8):
                theCode += secrets.choice(alphabetAndNumbers)
            
            name_lookup, phone_number_lookup, patient__lookup = patient_lookup(name, phone_number, True)
            key = {
                "name":encryptor(name),
                "phone_number":encryptor(phone_number),
                "service":encryptor(service),
                "date":date,
                "appointment_time":appointment_time,
                "notes":encryptor(notes),
                "patient_lookup":patient__lookup,
                "name_lookup":name_lookup,
                "phone_number_lookup":phone_number_lookup,
                "booking_reference":theCode,
                "status":"scheduled"
            } 
            
            #save the booking, when this fails, the slot won't be reset, that is the only issue
            (
                supabase.table("bookingInfo")
                .insert(key)
                .execute()
            )
            return {"saved":True, "booking_reference":theCode}
        except Exception as e:
            (
                supabase.table("savingTheSlots")
                .update({"status":"available"})
                .eq("date", date)
                .eq("time", appointment_time)
                .execute()
            )
            raise HTTPException(
                status_code=500,
                detail=str(e)
            )

    else:
        return None


#tracking the booking (for clients)
def track_booking(booking_reference, phone_number):
    booking = (
        supabase.table("bookingInfo")
        .select("name, phone_number, service, notes, date, appointment_time, status, booking_reference")
        .eq("booking_reference", booking_reference)
        .eq("phone_number_lookup", patient_lookup(phone_number=phone_number))
        .execute()
        .data
        )

    if booking:
        booking[0]["name"] = decryptor(booking[0]["name"])
        booking[0]["phone_number"] = decryptor(booking[0]["phone_number"])
        booking[0]["notes"] = decryptor(booking[0]["notes"])
        booking[0]["service"] = decryptor(booking[0]["service"])
        return booking[0]
    else: 
        raise HTTPException(
            status_code=404,
            detail= "Booking not found"
        ) #raise an error


#cancel booking (for clients)
def cancel_booking(phone_number, booking_reference):
    key = (
        supabase.table("bookingInfo")
        .select("*")
        .eq("phone_number_lookup", patient_lookup(phone_number=phone_number))
        .eq("booking_reference", booking_reference)
        .execute()
        .data
    )
    if not key:
        raise HTTPException(
            status_code=404,
            detail="Booking not found"
            ) #just raise an error
    #update the status in the slots "savingTheSlots"
    #fetching date and time

    date = key[0]["date"]

    appointment_time = key[0]["appointment_time"]

    #updating the status of the slot
    try:
        (
            supabase.table("savingTheSlots")
            .update({"status":"available"})
            .eq("date", date)
            .eq("time", appointment_time)
            .execute()
        )
        
        #update the status to cancel in "bookingInfo"
        
        (
            supabase.table("bookingInfo")
            .update(
                {"status":"cancelled"}
            )
            .eq("booking_reference", booking_reference)
                    .eq("phone_number_lookup", patient_lookup(phone_number=phone_number))
            .execute()
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
)

    return {"message":"Booking cancelled."}



