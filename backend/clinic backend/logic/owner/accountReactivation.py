from database.main import supabase
from fastapi import HTTPException
import secrets, string
from datetime import datetime, timezone, timedelta
from logic.auth.authentication import create_new_hash_forpassword_or_token, create_setup_token, employee_lookup, token_hash_verifier


def deactivate_employee(employee_id: str):
    if not employee_id:
        raise HTTPException(
            status_code=400,
            detail="invalid input, id is empty"
        )

    #* employee identification
    profile = (
        supabase.table("employees")
        .select("employee_id, username, phone_number, employee_lookup, role, is_active")
        .eq("employee_id", employee_id)
        .neq("role", "OWNER")
        .execute().data
    )

    if not profile:
        raise HTTPException(
            status_code=404,
            detail="employee not found"
        )

    if not profile[0]["is_active"]:
        raise HTTPException(
            status_code=409,
            detail="employee already inactive"
        )

    #* set is_active = False
    try:
        (
            supabase.table("employees")
            .update({
                "is_active":False,
                "token_creation_time":None,
                "token_expiry_time":None,
                "hashed_token":None,
                "token_salt":None,
                "valid_time":None
            })
            .eq("employee_id", employee_id)
            .execute()
        )
    except Exception:
        raise HTTPException(
            status_code=404,
            detail="could not update is_active as employee_id is not found in the datavbase"
        )

    return {
        "deactivated": True,
        "employee_id": employee_id,
        "employee_status": "INACTIVE"
    }


def reactivate_employee(employee_id: str):
    profile = (
        supabase.table("employees")
        .select("employee_id, username, phone_number, employee_lookup, role, is_active")
        .eq("employee_id", employee_id)
        .neq("role", "OWNER")
        .execute().data
    )
    
    if not profile:
        raise HTTPException(
            status_code=404,
            detail="employee not found"
        )

    if profile[0]["is_active"]:
        raise HTTPException(
            status_code=409,
            detail="employee is already active"
        )

    if not profile:
        raise HTTPException(status_code=404, detail="employee not found")

    #* checking to see if a double request has been made
    request = (
        supabase.table("account_reactivation")
        .select("*")
        .eq("employee_id", employee_id)
        .in_("status", ["PENDING_VERIFICATION", "SETTING_UP_CREDENTIALS"])
        .execute().data
    )
    if request:
        raise HTTPException(status_code=409, detail="a request has already been made")

    #* generate unique reactivation_id, hashed otp with expiry and salt
    #reactivation_id
    char = string.ascii_letters + string.digits + "!@#$&?%"
    code = ""
    for _ in range(10):
        code += secrets.choice(char)
    reactivation_id = "RID-" + code

    #hashed otp with salt, expiry
    reactivation_code = "".join([secrets.choice(char) for _ in range(8)])
    reactivation_code_hash, reactivation_code_salt  = create_new_hash_forpassword_or_token(reactivation_code)
    code_expiry_time = datetime.now(timezone.utc) + timedelta(minutes=5)


    #* insert a new row into "account_reactivation" using the generated fields: reactivation_id, hashed_otp and all its relations, employee_lookup, and status
    try:
        (
            supabase.table("account_reactivation")
            .insert({
                "reactivation_id":reactivation_id,
                "employee_id":employee_id,
                "employee_lookup":profile[0]["employee_lookup"],
                "status":"PENDING_VERIFICATION",
                "reactivation_code_hash":reactivation_code_hash,
                "reactivation_code_salt":reactivation_code_salt,
                "code_expiry_time":code_expiry_time.isoformat()
            })
            .execute()
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="could not insert into 'account_reactivation" + "\n" + str(e)
        )


    #* return statement
    return {
        "reactivation_created": True,
        "employee_id": employee_id,
        "reactivation_id": reactivation_id,
        "reactivation_code": reactivation_code,
        "reactivation_status": "PENDING_VERIFICATION",
        "code_expires_at": code_expiry_time.isoformat()
    }


def public_reactivate_employee(username: str, phone_number: str, activation_code: str): #! public endpoint
    #generating employee lookup and comparing it with what is in the database
    employee__lookup = employee_lookup(username, phone_number)
    account = (
        supabase.table("account_reactivation")
        .select("reactivation_id, employee_id, status, reactivation_code_hash, reactivation_code_salt, code_expiry_time, failed_attempts")
        .eq("employee_lookup", employee__lookup)
        .eq("status", "PENDING_VERIFICATION")
        .execute()
        .data
    )

    if not account:
        raise HTTPException(
            status_code=401,
            detail="unauthorized, no account has been found."
        )
    
    #comparing verification codes
    reactivation_code_hash = account[0]["reactivation_code_hash"]
    reactivation_code_salt = account[0]["reactivation_code_salt"]
    raw_time = account[0]["code_expiry_time"]
    failed_attempts = account[0]["failed_attempts"]
    reactivation_id = account[0]["reactivation_id"]
    #1: checking if the 2 codes match
    try:
        if not token_hash_verifier(reactivation_code_hash, reactivation_code_salt, activation_code):
            failed_attempts += 1
            if failed_attempts >= 5:
                (
                    supabase.table("account_reactivation")
                    .update({
                        "reactivation_code_hash":None,
                        "reactivation_code_salt":None,
                        "code_expiry_time":None,
                        "failed_attempts":failed_attempts, 
                        "status":"REVOKED"
                    })
                    .eq("reactivation_id", reactivation_id)
                    .execute()
                )
                raise HTTPException(
                    status_code=429,
                    detail="Too many incorrect attempts. Request a new reactivation code."
                )
            else:
                (
                    supabase.table("account_reactivation")
                    .update({"failed_attempts":failed_attempts})
                    .eq("reactivation_id", reactivation_id)
                    .execute()
                )
                raise HTTPException(
                    status_code=401,
                    detail="unauthorized, invalid reactivation code"
                )
    except Exception:
        raise
    #2: checking if the code expired
    try:
        if isinstance(raw_time, datetime):
            code_expiry_time = raw_time
            if code_expiry_time.tzinfo is None:
                code_expiry_time = code_expiry_time.replace(tzinfo=timezone.utc)
        elif isinstance(raw_time, str):
            if raw_time.endswith("+00"):
                raw_time = raw_time[:-3] + "+00:00"
            if raw_time.endswith("Z"):
                raw_time = raw_time[:-1] + "+00:00"
            
            code_expiry_time = datetime.fromisoformat(raw_time)
                
            if code_expiry_time.tzinfo is None:
                code_expiry_time = code_expiry_time.replace(tzinfo=timezone.utc)
        else:
            raise HTTPException(
                status_code=401,
                detail="unauthorized, expired token"
            )
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="unauthorized, expired token"
        )
    if code_expiry_time <= datetime.now(timezone.utc):
        (
            supabase.table("account_reactivation")
            .update({"status":"expired".upper()})
            .eq("reactivation_id", reactivation_id)
            .execute()
        )
        raise HTTPException(
            status_code=401,
            detail="code expired, access denied"
        )
    
    #3: revoking the access code while creating the setup token (stronger design)
    setup_token, setup_token_expiry_time, setup_token_creation_time, hashed_setup_token, setup_token_salt = create_setup_token(30)
    (
        supabase.table("account_reactivation")
        .update({
            "reactivation_code_hash":None,
            "reactivation_code_salt":None,
            "setup_token_expiry_time":setup_token_expiry_time,
            "hashed_setup_token":hashed_setup_token,
            "setup_token_salt":setup_token_salt,
            "reactivation_id":reactivation_id,
            "status":"setting_up_credentials".upper()
        })
        .eq("reactivation_id", reactivation_id)
        .execute()
    )
    #creating setup token
    

    return {
        "verified": True,
        "reactivation_id":reactivation_id,
        "setup_token": setup_token,
        "setup_token_expires_at": setup_token_expiry_time,
    }


def renew_password(reactivation_id: str, setup_token: str, new_password: str, password_confirmation: str):
    if not new_password or not password_confirmation or not reactivation_id or not setup_token:
        raise HTTPException(
            status_code=400,
            detail="invalid input"
        )

    #* identify the employee
    profile = (
        supabase.table("account_reactivation")
        .select("*")
        .eq("reactivation_id", reactivation_id)
        .eq("status", "SETTING_UP_CREDENTIALS")
        .execute().data
    )

    if not profile:
        raise HTTPException(
            status_code=404,
            detail="employee not found"
        )

    #* comparing tokens
    hashed_setup_token = profile[0]["hashed_setup_token"]
    setup_token_salt = profile[0]["setup_token_salt"]
    #1: comparing the new tokens
    if not token_hash_verifier(hashed_setup_token, setup_token_salt, setup_token):
        raise HTTPException(
            status_code=401,
            detail="unauthorized"
        )
    #2: cheking if the token expired
    try:
        setup_token_expiry_time = profile[0]["setup_token_expiry_time"]
        if isinstance(setup_token_expiry_time, str):
            if setup_token_expiry_time.endswith("+00"):
                setup_token_expiry_time = setup_token_expiry_time[:-3] + "+00:00"
            if setup_token_expiry_time.endswith("Z"):
                setup_token_expiry_time = setup_token_expiry_time[:-1] + "+00:00"
            setup_token_expiry_time = datetime.fromisoformat(setup_token_expiry_time)
            if setup_token_expiry_time.tzinfo is None:
                setup_token_expiry_time = setup_token_expiry_time.replace(tzinfo=timezone.utc)
        elif isinstance(setup_token_expiry_time, datetime):
            if setup_token_expiry_time.tzinfo is None:
                setup_token_expiry_time = setup_token_expiry_time.replace(tzinfo=timezone.utc)
        else:
            raise HTTPException(
                status_code=400,
                detail="invalid token expiry time datatype"
            )
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="unauthorized, expired token"
        )
    if setup_token_expiry_time <= datetime.now(timezone.utc):
        (
            supabase.table("account_reactivation")
            .update({"status":"EXPIRED"})
            .eq("reactivation_id", reactivation_id)
            .execute()
        )
        raise HTTPException(
            status_code=401,
            detail="unauthorized"
        )
    #* comparing passwords, hasihng new password to insert it into the correct row
    if new_password != password_confirmation:
        raise HTTPException(
            status_code=400,
            detail="invalid input, passwords do not match"
        )
    hashed_new_password, new_password_salt = create_new_hash_forpassword_or_token(new_password)
    
    #* extract employee_id to update is_active using the correct row
    employee_id = profile[0]["employee_id"]

    #* inserting new password and is_active = True
    (
        supabase.table("employees")
        .update({
            "is_active":True,
            "password_hash":hashed_new_password,
            "salt":new_password_salt
        })
        .eq("employee_id", employee_id)
        .execute()
    )
    (
        supabase.table("account_reactivation")
        .update({
            "hashed_setup_token":None,
            "setup_token_salt":None,
            "setup_token_expiry_time":None,
            "status":"COMPLETED"
        })
        .eq("reactivation_id", reactivation_id)
        .execute()
    )

    #* return statement
    return {
        "reactivated":True,
        "employee_id":employee_id, 
        "employee_status":"ACTIVE",
        "reactivation_status":"COMPLETED"
    }