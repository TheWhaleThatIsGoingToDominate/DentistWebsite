#TODO: make a backend that takes the info of the booking of the customer and 
#saves it to google sheets, the backend must be able to detect double books from the 
#same schedule or the same name

from database.main import supabase

def load_booking(date: str): #admin page
    return (
        supabase.table("bookingInfo")
        .select("name", "phone number", "service", date, "appointment time", "notes")
        .eq("date", date)
        .execute()
        .data
    )


def save_booking(key: dict): #public booking
    (supabase.table("bookingInfo")
    .insert(key)
    .execute()
    )