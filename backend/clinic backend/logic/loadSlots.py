from slotDatabase.main import supabase

def load_slots(date):
    return (
        supabase.table("savingTheSlots")
        .select("*")
        .eq("date", date)
        .execute()
    )