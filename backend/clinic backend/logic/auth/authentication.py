def Authentication(access_key):
    key = "clinic-demo-key"
    return access_key == key
#   ^^^^^^^^^^^^^^^^^^^^^^^^ new logic
from database.main import supabase
from fastapi import HTTPException
from datetime import datetime, date
import os
from cryptography.fernet import Fernet

#encryption and decryption
def encryptor(txt:str):
    """
    should encrypt confidential info of the business in the database
    will encrypt phone numbers and usernames only
    the function will return the encrypted txt in the form of 
    the initial key will be in hexadecimal form alright?
    """
    if txt is None:
        return None

    key = bytes.fromhex(os.environ.get("SECRET_KEY"))
    cypher_suite = Fernet(key)

    #encryption
    
    encyrpted_txt = cypher_suite.encrypt(txt.encode())

    #what the function will return
    return encyrpted_txt.hex()

def decryptor(encrypted_txt: str): #the string provided is a hexadecimal
    """
    decrypt the txt to the original message
    takes: encrypted_txt: bytes -> txt: bytes -> original txt by decoding 
    """

    if encrypted_txt is None:
        return None

    #preparing the key and the encryptor
    key = bytes.fromhex(os.environ.get("SECRET_KEY"))
    cypher_suite = Fernet(key)

    #decrypting
    txt = cypher_suite.decrypt(bytes.fromhex(encrypted_txt))

    #returning orignal txt
    return txt.decode()










#password hashing, ans password verification relative to name of employee
import hashlib
from hmac import compare_digest

def create_new_hash_forpassword_or_token(thePassword: str): #will be used when creating a new account
    
    #hashing
    saved_salt = os.urandom(16)
    hashed_password = hashlib.pbkdf2_hmac(
        password=str(thePassword).encode(),
        salt=saved_salt,
        iterations=100000,
        hash_name="sha256")

    #saving the salt and the hashed password to the database
    
    return hashed_password.hex(), saved_salt.hex()

def password_verifier(thePassword: str, username: str, phone_number: str):
    saved_salt = (
        supabase.table("employees")
        .select("salt")
        .eq("employee_lookup", employee_lookup(username, phone_number))
        .execute()
        .data
    )
    if not saved_salt:
        raise HTTPException(
            status_code=500,
            detail= "saved_salt is empty"
        )
    saved_salt = bytes.fromhex(str(saved_salt[0]["salt"]))

    saved_hashed_password = (
        supabase.table("employees")
        .select("password_hash")
        .eq("employee_lookup", employee_lookup(username, phone_number))
        .execute()
        .data
    )
    if not saved_hashed_password:
        raise HTTPException(
            status_code=500,
            detail= "saved_hashed_password is empty"
        )
    saved_hashed_password = bytes.fromhex(str(saved_hashed_password[0]["password_hash"]))

    calculated_password: bytes = hashlib.pbkdf2_hmac("sha256", str(thePassword).encode(), saved_salt, 100000)
    return compare_digest(saved_hashed_password, calculated_password)


def activcation_code_verifier(thePassword: str, username: str, phone_number: str):
    saved_salt = (
        supabase.table("account_activation")
        .select("activation_code_salt")
        .eq("account_lookup", employee_lookup(username, phone_number))
        .execute()
        .data
    )
    if not saved_salt:
        raise HTTPException(
            status_code=500,
            detail= "saved_salt is empty"
        )
    saved_salt = bytes.fromhex(str(saved_salt[0]["activation_code_salt"]))

    saved_hashed_password = (
        supabase.table("account_activation")
        .select("activation_code_hash")
        .eq("account_lookup", employee_lookup(username, phone_number))
        .execute()
        .data
    )
    if not saved_hashed_password:
        raise HTTPException(
            status_code=500,
            detail= "saved_hashed_password is empty"
        )
    saved_hashed_password = bytes.fromhex(str(saved_hashed_password[0]["activation_code_hash"]))

    calculated_password: bytes = hashlib.pbkdf2_hmac("sha256", str(thePassword).encode(), saved_salt, 100000)
    return compare_digest(saved_hashed_password, calculated_password)










#token maker for each visit on the employee admin page
#token system
import uuid
from datetime import datetime, timedelta, timezone
def create_setup_token(valid_time: int): 
    token = str(uuid.uuid4()) #create token
    token_creation_time= datetime.now(timezone.utc) #gather the time where the token was created
    token_expiry_time = token_creation_time + timedelta(minutes=valid_time)
    hashed_token , token_salt = create_new_hash_forpassword_or_token(token) #hash token, obtain its salt

    return token, token_expiry_time.isoformat(), token_creation_time.isoformat(), hashed_token, token_salt

def create_token(username: str, phone_number: str, valid_time: int): #helper function for auth
    """
    create a token for each visitor on the admin page.
    delete it once they exit from the page or refresh it.
    steps: 
    1. create token,
    - make created_at time, calculate the expirey time
    2. send token to frontend,                           < 
    3. hash token, save it with its salt and valid time. < order of those steps doens't matter here
    4. when the expirey time has finished (or when the login page is entered), you delete the hashed token, its salt, and the valid_time of it
    """
    token = str(uuid.uuid4()) #create token
    token_creation_time= datetime.now(timezone.utc) #gather the time where the token was created
    token_expiry_time = token_creation_time + timedelta(minutes=valid_time)
    hashed_token , token_salt = create_new_hash_forpassword_or_token(token) #hash token, obtain its salt

    #save hashed token to the database, along with its salt
    (
        supabase.table("employees")
        .update({
            "hashed_token":hashed_token,
            "token_salt":token_salt,
            "valid_time": valid_time,
            "token_creation_time":token_creation_time.isoformat(), 
            "token_expiry_time":token_expiry_time.isoformat()
            })
        .eq("employee_lookup", employee_lookup(username, phone_number))
        .execute()
    )

    return token, token_expiry_time.isoformat()

def token_hash_verifier(hashed_token: str, token_salt: str, theToken: str): 
    #helper function, will be used in verification of employee token system and setup token system
    try:
        theToken = str(theToken).encode()
        hashed_token = bytes.fromhex(hashed_token)
        token_salt = bytes.fromhex(token_salt)
        calculated_hash = hashlib.pbkdf2_hmac("sha256", theToken, token_salt, 100000)
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="unauthorized"
        )
    
    return compare_digest(hashed_token, calculated_hash)


def verify_employee_token(username: str, phone_number: str, token: str): #finding the token for the website
    def clear_employee_token_fields(username: str, phone_number: str):
        supabase.table("employees").update({
            "hashed_token": None,
            "token_salt": None,
            "valid_time": None,
            "token_creation_time": None,
            "token_expiry_time": None,
        }).eq("employee_lookup", employee_lookup(username, phone_number)).execute() 
    
    TheEmployee = (
        supabase.table("employees")
        .select("*")
        .eq("employee_lookup", employee_lookup(username, phone_number))
        .execute()
        .data
    )
    if not TheEmployee:
        raise HTTPException(
            status_code=401,
            detail="access denied"
        )
    employee: dict =TheEmployee[0]
    hashed_token = employee.get("hashed_token")
    token_salt = employee.get("token_salt")

    if not hashed_token  or not token_salt:
        clear_employee_token_fields(username, phone_number)
        raise HTTPException(
            status_code=401,
            detail="access denied"
        )
    
    raw_time: str = employee.get("token_expiry_time")
    if not raw_time:
        clear_employee_token_fields(username, phone_number)
        raise HTTPException(status_code=401, detail="Token expired, access denied")

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
            clear_employee_token_fields(username, phone_number)
            raise HTTPException(
                status_code= 401, 
                detail="access denied"
            )
    except Exception:
        clear_employee_token_fields(username, phone_number)
        raise HTTPException(
            status_code= 401, 
            detail="access denied"
        )

    if token_expiry_time <= datetime.now(timezone.utc):
        clear_employee_token_fields(username, phone_number)
        raise HTTPException(
            status_code=401,
            detail="Token expired, access denied"
        )
    
    try:
        if not token_hash_verifier(hashed_token, token_salt, token):
            clear_employee_token_fields(username, phone_number)
            raise HTTPException(
                status_code=401,
                detail="Token expired, access denied"
            )
    except HTTPException:
        clear_employee_token_fields(username, phone_number)
        raise
    
    return TheEmployee

def delete_employee_token(username: str, phone_number: str, token: str):
    #comparing hashed tokens
    theToken = (
        supabase.table("employees")
        .select("hashed_token, token_salt")
        .eq("employee_lookup", employee_lookup(username, phone_number))
        .execute()
        .data
    )
    if not theToken: #this means that there is not token to clear cause it's not there
        return {"success":True}
    
    hashed_token = theToken[0]["hashed_token"]
    token_salt = theToken[0]["token_salt"]
    
    if not hashed_token or not token_salt:
        return {"success":True}
    try:
        if not token_hash_verifier(hashed_token, token_salt, token):
            raise HTTPException(
                status_code=401,
                detail="unauthorized, invalid token"
            )
    except HTTPException:
        raise
    #updating of all token-related vars: var --(updated)--> ""
    
    (
        supabase.table("employees")
        .update({
            "hashed_token":None,
            "token_salt":None,
            "valid_time":None,
            "token_creation_time":None, 
            "token_expiry_time":None
            })
        .eq("employee_lookup", employee_lookup(username, phone_number))
        .execute()
    )

    return {"success":True}







import hmac, hashlib
def employee_lookup(username: str, phone_number: str):
    employee_lookup = str(username.lower().strip() + "|" + phone_number.strip()).encode("utf-8")
    employee_lookup = hmac.new(bytes.fromhex(os.environ.get("SECRET_KEY")), employee_lookup, hashlib.sha256) #is in bytes, need to convert it to hex
    return employee_lookup.hexdigest()

#checkers that check if the entered phone number and username are available on a specific person
def username_and_phonenumber_verifier(username: str, phone_number: str): #helper function, not indenpendent
    username = username.strip()
    if " " in username.strip():
        raise HTTPException(
            status_code=400,
            detail="BAD REQUEST: username has spaces"
        )
        
    
    if not phone_number.startswith("01") or not len(phone_number) == 11 or not phone_number.isdigit():
        raise HTTPException(
            status_code=400,
            detail="BAD REQUEST: invalid phone number"
        )
    

    employee = (
    supabase.table("employees")
    .select("username, phone_number")
    .eq("employee_lookup", employee_lookup(username, phone_number))
    .execute()
    .data
)
    if not employee:
        raise HTTPException(
            status_code=401,
            detail="unauthorized"
        )
    
    return employee[0]

def detail_verification(username: str, phone_number:str): #independent
    username = username.strip()
    username_format_valid = False
    phone_number_format_valid = False
    matched_employee = False

    response = {
        "username_format_valid": username_format_valid,
        "phone_number_format_valid": phone_number_format_valid,
        "matched_employee": matched_employee
    }

    if not " " in username.strip():
        response["username_format_valid"] = True

    if phone_number.startswith("01") and len(phone_number) == 11 and phone_number.isdigit():
        response["phone_number_format_valid"] = True
    else:
        return response



    employee = (
    supabase.table("employees")
    .select("username, phone_number")
    .eq("employee_lookup", employee_lookup(username, phone_number))
    .execute()
    .data
)
    
    if employee:
        if employee[0]:
            response["matched_employee"] = True
    
    return response






#the full function that takes all of that in one thing
def auth(username, phone_number, password, valid_time: int):
    if not username_and_phonenumber_verifier(username, phone_number):
        raise HTTPException(
            status_code=404,
            detail="access denied, username and phone number are not found."
        )
    else:
        if password_verifier(password, username, phone_number):
            #role extraction
            theRole = (
                supabase.table("employees")
                .select("role")
                .eq("employee_lookup", employee_lookup(username, phone_number))
                .execute().data
            )
            if not theRole:
                raise HTTPException(status_code=500, detail="Employee role is missing")
            if not theRole[0].get("role"):
                raise HTTPException(status_code=500, detail="Employee role is missing")
            role = str(theRole[0]["role"]).upper()

            #valid time authentication
            if valid_time not in {1, 30, 60, 120, 180}:
                raise HTTPException(
                    status_code=401,
                    detail="unauthoized, time not in options"
                )

            #token creation with expiry time
            token, token_expiry_time= create_token(username, phone_number, valid_time)

            return {"allowed":True, "token":token, "expires_at":token_expiry_time, "role":role}
        else:
            raise HTTPException(
                status_code=401,
                detail="unauthorized, wrong password"
            )
        
        #this executes when the username and number are legit, we hash the password with the old salt, and then compare


#TODO: make role authentication, make the fontend not use query arguments for redirecting to pages
#todo: make sue that thee is another functtion in the dependencies that vefies the rule, and depends on equie_employee_auth and takes the employee dict fom it, 
#todo: tkaes *args and verifies if the ole is in *ags.

#older instance of comparing the saved hashed password and the entered password that was hashed
# if calculated_password == saved_hashed_password:
    #     # (
    #     # supabase.table("employees")
    #     # .update({"password_hash":saved_hashed_password.hex()})
    #     # .update({"salt":salt.hex()})
    #     # )
    #     return {"message":"access allowed"}
    # else:
    #     raise HTTPException(
    #         status_code=404,
    #         detail="access denied"
    #     )