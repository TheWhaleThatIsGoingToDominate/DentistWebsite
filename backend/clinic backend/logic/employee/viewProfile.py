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

    for key in profile:
        key["username"]=decryptor(key["username"])
        key["phone_number"]=decryptor(key["phone_number"])
        key["role"] = decrypt_employee_role(key["employee_id"],key["role"])
    return {"profile":profile[0]}