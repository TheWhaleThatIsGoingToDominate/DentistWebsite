def Authentication(access_key):
    key = "clinic-demo-key"
    return access_key == key
#   ^^^^^^^^^^^^^^^^^^^^^^^^ new logic

import os
from cryptography.fernet import Fernet
from database.main import supabase
from fastapi import HTTPException

#encryption and decryption
def encryptor(txt:str):
    """
    should encrypt confidential info of the business in the database
    will encrypt phone numbers and usernames only
    the function will return the encrypted txt in the form of 
    the initial key will be in hexadecimal form alright?
    """
    # key =  "59596b6c44423069323146736f4c6e7a5631564630377751594e5379325355704e645377556b39636758513d"
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

    #preparing the key and the encryptor
    # key =  "59596b6c44423069323146736f4c6e7a5631564630377751594e5379325355704e645377556b39636758513d"
    key = bytes.fromhex(os.environ.get("SECRET_KEY"))
    cypher_suite = Fernet(key)

    #decrypting
    txt = cypher_suite.decrypt(bytes.fromhex(encrypted_txt))

    #returning orignal txt
    return txt.decode()










#password hashing, ans password verification relative to name of employee
import hashlib

def create_new_hashed_password(thePassword: str): #will be used when creating a new account
    
    #hashing
    # saved_salt = os.urandom(16)
    
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
        .eq("username", username)
        .eq("phone_number", phone_number)
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
        .eq("username", username)
        .eq("phone_number", phone_number)
        .execute()
        .data
    )
    if not saved_hashed_password:
        raise HTTPException(
            status_code=500,
            detail= "saved_hashed_password is empty"
        )
    saved_hashed_password = bytes.fromhex(str(saved_hashed_password[0]["password_hash"]))

    calculated_password = hashlib.pbkdf2_hmac("sha256", str(thePassword).encode(), saved_salt, 100000)
    return calculated_password == saved_hashed_password
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










#token maker for each visit on the employee admin page
import uuid
def token_maker():
    """
    create a token for each visitor on the admin page.
    delete it once they exit from the page or refresh it.
    """

    return str(uuid.uuid4())










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
    .eq("username", username)
    .eq("phone_number", phone_number)
    .execute()
    .data
)

    return bool(employee)

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
        username_format_valid = True

    if phone_number.startswith("01") and len(phone_number) == 11 and phone_number.isdigit():
        phone_number_format_valid = True
    else:
        return response


    employee = (
    supabase.table("employees")
    .select("username, phone_number")
    .eq("username", username)
    .eq("phone_number", phone_number)
    .execute()
    .data
)

    if employee:
        matched_employee = True
    
    return response






#the full function that takes all of that in one thing
def auth(username, phone_number, password):
    if not username_and_phonenumber_verifier(username, phone_number):
        raise HTTPException(
            status_code=404,
            detail="access denied, username and phone number are not found."
        )
    else:
        if password_verifier(password, username, phone_number):
            return {"allowed":True, "token":token_maker()}
        else:
            raise HTTPException(
                status_code=401,
                detail="unauthorized, wrong password"
            )
        #this executes when the username and number are legit, we hash the password with the old salt, and then compare

