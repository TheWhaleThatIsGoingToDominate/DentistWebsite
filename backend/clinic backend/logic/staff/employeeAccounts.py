from database.main import supabase
from logic.auth.authentication import name_lookup, employee_lookup, phone_number_lookup, decryptor
from fastapi import HTTPException

def load_created_accounts(name: str | None = None, phone_number: str | None = None):
    #normalization of input
    name = name.lower().strip() if name else None
    phone_number = phone_number.strip() if phone_number else None

    #the real function
    if not name and not phone_number:
        response =(
            supabase.table("employees")
            .select("employee_id, username, phone_number, role, is_active")
            .execute().data
        )
    elif name and not phone_number:
        response =(
            supabase.table("employees")
            .select("employee_id, username, phone_number, role, is_active")
            .eq("name_lookup", name_lookup(name))
            .execute().data
            )
    elif phone_number and not name:
        response =(
            supabase.table("employees")
            .select("employee_id, username, phone_number, role, is_active")
            .eq("phone_number_lookup", phone_number_lookup(phone_number))
            .execute().data
        )
    else:
        response =(
            supabase.table("employees")
            .select("employee_id, username, phone_number, role, is_active")
            .eq("employee_lookup", employee_lookup(name, phone_number))
            .execute().data
        )

    for key in response:
        key["username"] = decryptor(key["username"])
        key["phone_number"] = decryptor(key["phone_number"])

    return response
def load_pending_accounts(name: str | None = None, phone_number: str | None = None):
    #normalization of input
    name = name.lower().strip() if name else None
    phone_number = phone_number.strip() if phone_number else None

    #the real function
    if not name and not phone_number:
        response =(
            supabase.table("account_activation")
            .select("account_id, username, phone_number, role, status, code_expiry_time")
            .execute().data
        )
    elif name and not phone_number:
        response =(
            supabase.table("account_activation")
            .select("account_id, username, phone_number, role, status, code_expiry_time")
            .eq("name_lookup", name_lookup(name))
            .execute().data
            )
    elif phone_number and not name:
        response =(
            supabase.table("account_activation")
            .select("account_id, username, phone_number, role, status, code_expiry_time")
            .eq("phone_number_lookup", phone_number_lookup(phone_number))
            .execute().data
        )
    else:
        response =(
            supabase.table("account_activation")
            .select("account_id, username, phone_number, role, status, code_expiry_time")
            .eq("account_lookup", employee_lookup(name, phone_number))
            .execute().data
        )

    for key in response:
        key["username"] = decryptor(key["username"])
        key["phone_number"] = decryptor(key["phone_number"])

    return response

def load_created_profile(account_id: str):
    if not account_id:
        raise HTTPException(
            status_code=400,
            detail="invalid input, account_id is empty"
        )

    profile = (
        supabase.table("employees")
        .select("username, phone_number, role, employee_id, is_active")
        .eq("employee_id", account_id)
        .execute().data
    )

    if not profile:
        raise HTTPException(
            status_code=404,
            detail="employee not found"
        )

    for key in profile:
        key["username"] = decryptor(key["username"])
        key["phone_number"] = decryptor(key["phone_number"])

    return {"account":profile[0]}

def load_pending_profile(account_id: str):
    if not account_id:
        raise HTTPException(
            status_code=400,
            detail="invalid input, account_id is empty"
        )

    profile = (
        supabase.table("account_activation")
        .select("username, phone_number, role, account_id, status, code_expiry_time, setup_token_expiry_time")
        .eq("account_id", account_id)
        .execute().data
    )

    if not profile:
        raise HTTPException(
            status_code=404,
            detail="account not found"
        )

    for key in profile:
        key["username"] = decryptor(key["username"])
        key["phone_number"] = decryptor(key["phone_number"])

    return {"account":profile[0]}