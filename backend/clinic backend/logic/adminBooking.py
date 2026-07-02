from database.main import supabase

def load_booking(date: str): #admin page
    return (
        supabase.table("bookingInfo")
        .select("name", "phone_number", "service", "date", "appointment_time", "notes")
        .eq("date", date)
        .execute()
        .data
    )
