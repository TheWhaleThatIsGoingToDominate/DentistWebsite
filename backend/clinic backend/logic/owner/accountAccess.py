from logic.staff.accountActivation import activate_account
from logic.staff.accountReactivation import public_reactivate_employee
from logic.auth.authentication import employee_lookup
from database.main import supabase
from fastapi import HTTPException

def verify_account_location(username: str, phone_number: str, code: str):
    account_profile = (
        supabase.table("account_activation")
        .select("*")
        .eq("status", "PENDING_VERIFICATION")
        .eq("account_lookup", employee_lookup(username, phone_number))
        .execute().data
    ) 

    employee_profile = (
        supabase.table("account_reactivation")
        .select("*")
        .eq("status", "PENDING_VERIFICATION")
        .eq("employee_lookup", employee_lookup(username, phone_number))
        .execute().data
    )

    if not account_profile and not employee_profile:
        raise HTTPException(
            status_code=404,
            detail="account not found"
        )

    if account_profile and employee_profile:
        raise HTTPException(
            status_code=409,
            detail="conflict, account existing in both tables"
        )

    if employee_profile:
        result = public_reactivate_employee(username, phone_number, code)
        return {
            **result,
            "flow":"REACTIVATION"
        }
    elif account_profile:
        result = activate_account(username, phone_number, code)
        return {
            **result,
            "flow":"ACTIVATION"
        }