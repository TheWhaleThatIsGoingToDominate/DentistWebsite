from database.main import supabase
from fastapi import HTTPException
from logic.auth.authentication import (
    decryptor, 
    decrypt_employee_role
    )

def view_profile(employee_id:str):
    if not employee_id:
        raise HTTPException(
            status_code=400,
            detail="invalid input"
        )

    profile = (
        supabase.table("employees")
        .select("employee_id, username, phone_number, role, is_active")
        .eq("employee_id", employee_id)
        .eq("is_active", True)
        .execute()
        .data
    )

    if not profile:
        raise HTTPException(
            status_code=404,
            detail="employee not found"
        )

    working_hours = (
        supabase.table("employee_working_hours")
        .select("employee_id, day_of_week, start_minute, end_minute, working_status")
        .eq("employee_id", employee_id)
        .execute().data
    )

    if not working_hours:
        raise HTTPException(
            status_code=404,
            detail="working hours of current user not found"
        )
    
    for key in profile:
        key["username"]=decryptor(key["username"])
        key["phone_number"]=decryptor(key["phone_number"])
        key["role"] = decrypt_employee_role(key["employee_id"],key["role"])

    for hour in working_hours:
        hour["day_of_week"] = decryptor(hour["day_of_week"] )
        hour["start_minute"] = decryptor(hour["start_minute"])
        hour["end_minute"] = decryptor(hour["end_minute"])
        hour["working_status"] = decryptor(hour["working_status"])

    return {
        "profile":profile[0], 
        "working_hours":working_hours[0]
    }