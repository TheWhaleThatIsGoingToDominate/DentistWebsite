from slotDatabase.main import supabase

def load_slots(date):
    return (
        supabase.table("savingTheSlots")
        .select("time", "status")
        .eq("date", date)
        .execute()
        .data
    )