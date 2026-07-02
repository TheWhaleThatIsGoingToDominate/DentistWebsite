#TODO: make a backend that takes the info of the booking of the customer and 
#saves it to google sheets, the backend must be able to detect double books from the 
#same schedule or the same name

from database.main import supabase


def save_booking(name, phone_number, service, date, appointment_time, notes): #public booking
    key = {
        "name":name,
        "phone_number":phone_number,
        "service":service,
        "date":date,
        "appointment_time":appointment_time,
        "notes":notes
    } 
    (supabase.table("bookingInfo")
    .insert(key)
    .execute()
    )

    return {"saved":True}