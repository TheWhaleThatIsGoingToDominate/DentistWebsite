#TODO: make a backend that takes the info of the booking of the customer and 
#saves it to google sheets, the backend must be able to detect double books from the 
#same schedule or the same name

from database.main import supabase
from logic.slots import update_status


def save_booking(name, phone_number, service, date, appointment_time, notes=None): #public booking
    #confirming the name and the phone number to be legitimate
    if not 3 < len(name) < 20:
        raise Exception("Invalid name. Enter your name correctly")
    else:
        if len(phone_number) != 10 and len(phone_number) != 11:
            raise Exception("Invalid phone number.")

    #update the slot from available to booked, then save the booking
    if update_status(date, appointment_time) == {"updated":True}:
        key = {
            "name":name,
            "phone_number":phone_number,
            "service":service,
            "date":date,
            "appointment_time":appointment_time,
            "notes":notes
        } 

        (
            supabase.table("bookingInfo")
            .insert(key)
            .execute()
        )
        return {"saved":True}
    else:
        return None