from database.main import supabase
from fastapi import HTTPException
from logic.auth.authentication import employee_lookup, create_setup_token, create_new_hash_forpassword_or_token, token_hash_verifier, encryptor
from datetime import datetime, timezone

def activate_account(name: str, phone_number: str, activation_code: str):
    #generating employee lookup and comparing it with what is in the database
    account_lookup = employee_lookup(name, phone_number)
    account = (
        supabase.table("account_activation")
        .select("account_id, name, phone_number, role, activation_code_hash, activation_code_salt, code_expiry_time")
        .eq("account_lookup", account_lookup)
        .execute()
        .data
    )

    if not account:
        raise HTTPException(
            status_code=401,
            detail="unauthorized, no account has been found."
        )
    
    #com-paring verification codes
    activation_code_hash = account[0]["activation_code_hash"]
    activation_code_salt = account[0]["activation_code_salt"]
    raw_time = account[0]["code_expiry_time"]
    #1: checking if the 2 codes match
    try:
        if not token_hash_verifier(activation_code_hash, activation_code_salt, activation_code):
            raise HTTPException(
                status_code=401,
                detail="unauthorized"
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
            supabase.table("account_activation")
            .update({"status":"expired".upper()})
            .eq("account_lookup", employee_lookup(name, phone_number))
            .execute()
        )
        raise HTTPException(
            status_code=401,
            detail="code expired, access denied"
        )
    
    #3: revoking the access code while creating the setup token (strongeer design)
    setup_token, setup_token_expiry_time, setup_token_creation_time, hashed_setup_token, setup_token_salt = create_setup_token(30)
    (
        supabase.table("account_activation")
        .update({
            "activation_code_hash":None,
            "activation_code_salt":None,
            "setup_token_expiry_time":setup_token_expiry_time,
            "setup_token_creation_time":setup_token_creation_time,
            "hashed_setup_token":hashed_setup_token,
            "setup_token_salt":setup_token_salt,
            "status":"setting_up_credentials".upper()
        })
        .eq("account_lookup", employee_lookup(name, phone_number))
        .execute()
    )
    #creating setup token
    

    return {
        "verified": True,
        "setup_token": setup_token,
        "setup_token_expires_at": setup_token_expiry_time,
    }


def add_credentials(old_username: str, old_phone_number: str, setup_token: str, new_username: str, new_phone_number: str, new_password: str, password_confirmation: str):
    #checking any errors
    if " " in old_username or " " in new_username:
        raise HTTPException(
            status_code=400,
            detail="invalid input"
        )
    
    if not new_phone_number.isdigit() or not old_phone_number.isdigit() or not len(old_phone_number) == 11 or not len(new_phone_number) == 11 or not old_phone_number.startswith("01") or not new_phone_number.startswith("01"):
        raise HTTPException(
            status_code=400,
            detail="invalid input"
        )

    
    if not new_password:
        raise HTTPException(
            status_code=400,
            detail="invalid input, password is empty"
        )
    
    


    #generating employee lookup code
    account_lookup = employee_lookup(old_username, old_phone_number)

    #extracting token related stuff for token validation
    database_stuff = (
        supabase.table("account_activation")
        .select("setup_token_creation_time, setup_token_expiry_time, hashed_setup_token, setup_token_salt, account_id, role")
        .eq("account_lookup", account_lookup)
        .execute()
        .data
    )
    if not database_stuff:
        raise HTTPException(
            status_code=401,
            detail="unauthorized, no token in database"
        )
    raw_time = database_stuff[0]["setup_token_expiry_time"]
    hashed_setup_token  = database_stuff[0]["hashed_setup_token"]
    setup_token_salt = database_stuff[0]["setup_token_salt"]
    account_id = database_stuff[0]["account_id"]

    #checking if inputted name and phone number are duplicated in the 2 tables
    duplicate_employee_lookup =(
        supabase.table("employees")
        .select("*")
        .eq("employee_lookup", employee_lookup(new_username, new_phone_number))
        .execute()
        .data
    )
    duplicate_account_lookup = (
        supabase.table("account_activation")
        .select("*")
        .eq("account_lookup", employee_lookup(new_username, new_phone_number))
        .neq("account_id", account_id)
        .execute()
        .data
    )

    
    if duplicate_employee_lookup or duplicate_account_lookup:
        raise HTTPException(
            status_code=409,
            detail="account conflict, username and phone number are already taken"
        )
    
    #token validation, supabase can give the time in two ways: a string or a datetime class, you have to interpret both of cases
    #1: compare the 2 tokens
    try:
        if not token_hash_verifier(hashed_setup_token , setup_token_salt , setup_token):
            raise HTTPException(
                status_code=401,
                detail="unauthorized, invalid token"
            )
    except Exception:
        raise

    #2: validate token expiry time
    try:
        if isinstance(raw_time, datetime):
            token_expiry_time = raw_time
            if token_expiry_time.tzinfo is None:
                token_expiry_time = token_expiry_time.replace(tzinfo=timezone.utc)
        elif isinstance(raw_time, str):
            if raw_time.endswith("+00"):
                raw_time = raw_time[:-3] + "+00:00"
            if raw_time.endswith("Z"):
                raw_time = raw_time[:-1] + "+00:00"
            
            token_expiry_time = datetime.fromisoformat(raw_time)
                
            if token_expiry_time.tzinfo is None:
                token_expiry_time = token_expiry_time.replace(tzinfo=timezone.utc)
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
    
    if token_expiry_time <= datetime.now(timezone.utc):
        (
            supabase.table("account_activation")
            .update({"status":"expired".upper()})
            .eq("account_lookup", employee_lookup(old_username, old_phone_number))
            .execute()
        )
        raise HTTPException(
            status_code=401,
            detail="Token expired, access denied"
        )

    #updating the pending account to an active account
    if not new_password == password_confirmation:
        raise HTTPException(
            status_code=400,
            detail="invalid input, passwords do not match"
        )

    employee_id = database_stuff[0]["account_id"]
    new_role = database_stuff[0]["role"]
    new_hashed_password, new_password_salt = create_new_hash_forpassword_or_token(new_password)
    (
        supabase.table("employees")
        .insert({
            "username":encryptor(new_username),
            "phone_number":encryptor(new_phone_number),
            "password_hash":new_hashed_password,
            "salt":new_password_salt,
            "employee_id":employee_id,
            "employee_lookup":employee_lookup(new_username, new_phone_number),
            "role":new_role,
            "is_active":True
        })
        .execute()
    )

    #deleting the existing pending account in the account_activation table, because it was just activated
    (
        supabase.table("account_activation")
        .delete()
        .eq("account_lookup", account_lookup)
        .execute()
    )

    return {
        "activated": True
    }
