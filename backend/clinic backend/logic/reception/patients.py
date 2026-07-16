import hashlib, hmac, os
#this is where we are going to make the logic for patient records and such


def patient_lookup(name: str | None = None, phone_number: str | None = None, flag: bool =False):#helper function
    if name:
        name = name.lower().strip()
    if phone_number:
        phone_number = phone_number.strip()
    if name and phone_number and not flag:
        patient_lookup = str(name + "|" + phone_number).encode("utf-8")
        patient_lookup = hmac.new(bytes.fromhex(os.environ.get("SECRET_KEY")), patient_lookup, hashlib.sha256)
        return patient_lookup.hexdigest()
    elif name and phone_number and flag:
        patient_lookup = str(name + "|" + phone_number).encode("utf-8")
        patient_lookup = hmac.new(bytes.fromhex(os.environ.get("SECRET_KEY")), patient_lookup, hashlib.sha256)
        name_lookup = str(name).encode("utf-8")
        name_lookup = hmac.new(bytes.fromhex(os.environ.get("SECRET_KEY")), name_lookup, hashlib.sha256)
        phone_number_lookup = str(phone_number).encode("utf-8")
        phone_number_lookup = hmac.new(bytes.fromhex(os.environ.get("SECRET_KEY")), phone_number_lookup, hashlib.sha256)
        return name_lookup.hexdigest(), phone_number_lookup.hexdigest(), patient_lookup.hexdigest() 
    elif not phone_number and name:
        name_lookup = str(name).encode("utf-8")
        name_lookup = hmac.new(bytes.fromhex(os.environ.get("SECRET_KEY")), name_lookup, hashlib.sha256)
        return name_lookup.hexdigest()
    elif not name and phone_number:
        phone_number_lookup = str(phone_number).encode("utf-8")
        phone_number_lookup = hmac.new(bytes.fromhex(os.environ.get("SECRET_KEY")), phone_number_lookup, hashlib.sha256)
        return phone_number_lookup.hexdigest()
    else:
        return None
    
