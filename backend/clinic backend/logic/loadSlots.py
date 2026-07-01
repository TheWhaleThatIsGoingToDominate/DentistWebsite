from database.main import supabase

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