from database.main import supabase
from fastapi import HTTPException
from logic.auth.authentication import encryptor, employee_lookup, name_lookup, phone_number_lookup,  create_new_hash_forpassword_or_token
import secrets, string, uuid
from datetime import datetime, timedelta, timezone

def create_account(name: str, phone_number: str, role:str):
    #step 1: raising exceptions when number or name are missing, and verifying the validity of the name and phone number
    name = name.lower().strip()
    phone_number = phone_number.strip()
    if not name or not phone_number:
        raise HTTPException( 
            status_code=400,
            detail="invalid input"
        )
    
    if not phone_number.startswith("01") or not len(phone_number) == 11 or not phone_number.isdigit():
        raise HTTPException(
            status_code=400,
            detail="invalid input"
        )
    
    if " " in name:
        raise HTTPException(
            status_code=400,
            detail="invalid input, name must not contain spaces"
        )
    
    if role.lower().strip() not in ("receptionist", "manager", "doctor"):
        raise HTTPException(
            status_code=400,
            detail="role is not permitted"
        )
    role = role.lower().strip()

    #creating temporary 8 char code, hashing it and obtaining its salt. making an expiry and creation time
    char = string.ascii_letters + string.digits
    activation_code = ""
    for _ in range(8):
        activation_code += secrets.choice(char)
    hashed_code, code_salt = create_new_hash_forpassword_or_token(activation_code)
    code_creation_time = datetime.now(timezone.utc)
    code_expiry_time = code_creation_time + timedelta(minutes=30)

    #creating an ID for the employee
    id = "ID-" + str(uuid.uuid4())

    #creating employee_lookup
    account_lookup = employee_lookup(name, phone_number)
    #checking if the employee already has an account, either active or inactive "his account is not duplicated" 
    pending_duplicate = (
        supabase.table("account_activation")
        .select("*")
        .eq("account_lookup", account_lookup)
        .execute()
        .data
    )
    
    active_duplicate = (
        supabase.table("employees")
        .select("*")
        .eq("employee_lookup", account_lookup)
        .execute()
        .data
    )

    if pending_duplicate or active_duplicate:
        raise HTTPException(
            status_code=409,
            detail="user already in database"
        )

    #inserting into the database: account_lookup, phone_number, name, role, id
    try:
        (
            supabase.table("account_activation")
            .insert({
                "activation_code_hash":hashed_code,
                "activation_code_salt":code_salt,
                "account_lookup":employee_lookup(name, phone_number),
                "name_lookup":name_lookup(name),
                "phone_number_lookup":phone_number_lookup(phone_number),
                "username":encryptor(name),
                "phone_number":encryptor(phone_number),
                "role":role.upper(),
                "status":"pending_activation".upper(),
                "account_id":id, 
                "code_creation_time":code_creation_time.isoformat(),
                "code_expiry_time":code_expiry_time.isoformat()
            })
            .execute()
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


    return {
        "created": True,
        "employee": {
            "account_id": id,
            "username": name,
            "phone_number": phone_number,
            "role": role.upper(),
            "status": "PENDING_ACTIVATION"
        },
        "activation_code": activation_code,
        "activation_expires_at": code_expiry_time.isoformat()
    }


def create_activation_code(account_id: str):
    if not account_id:
        raise HTTPException(
            status_code=400,
            detail="invalid input"
        )

    #identifying old hash
    query = (
        supabase.table("account_activation")
        .select("activation_code_hash")
        .eq("account_id", account_id)
        .execute().data
    )
    if not query:
        raise HTTPException(
            status_code=404,
            detail="account not found, old token not in the database"
        )
    
    #creating temporary 8 char code, hashing it and obtaining its salt. making an expiry and creation time
    char = string.ascii_letters + string.digits
    activation_code = ""
    for _ in range(8):
        activation_code += secrets.choice(char)
    hashed_code, code_salt = create_new_hash_forpassword_or_token(activation_code)
    code_creation_time = datetime.now(timezone.utc)
    code_expiry_time = code_creation_time + timedelta(minutes=30)

    #updating the database
    (
        supabase.table("account_activation")
        .update({
            "hashed_setup_token": None,
            "setup_token_salt": None,
            "setup_token_creation_time": None,
            "setup_token_expiry_time": None,
            "status": "PENDING_ACTIVATION",
            "activation_code_hash":hashed_code,
            "activation_code_salt":code_salt,
            "code_creation_time":code_creation_time.isoformat(),
            "code_expiry_time":code_expiry_time.isoformat()
        })
        .eq("account_id", account_id)
        .execute()
    )

    #returning the raw activation code and expiry time to the frontend to show it to the owner
    return {
        "regenerated": True,
        "account_id": account_id,
        "activation_code": activation_code,
        "activation_expires_at": code_expiry_time.isoformat()
    }

