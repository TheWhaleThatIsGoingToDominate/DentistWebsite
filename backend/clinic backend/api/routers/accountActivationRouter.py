from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from logic.owner.accountActivation import add_credentials
from logic.owner.accountAccess import verify_account_location
from logic.owner.accountReactivation import renew_password

router = APIRouter()

class AddCredentials(BaseModel):
    old_username: str
    old_phone_number: str
    new_username: str
    new_phone_number: str
    new_password: str
    password_confirmation: str
    setup_token: str
@router.post("/employee/account/credentials")
def addCredentials(data: AddCredentials):
    try:
        return add_credentials(
            data.old_username, 
            data.old_phone_number,
            data.setup_token,
            data.new_username,
            data.new_phone_number,
            data.new_password,
            data.password_confirmation
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


class activateAccount(BaseModel):
    name: str
    phone_number: str
    activation_code: str
@router.post("/employee/account/activate")
def activatetheaccount(data: activateAccount):
    try:
        return verify_account_location(data.name, data.phone_number, data.activation_code)
    except HTTPException:
        raise 
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


class renewPassword(BaseModel):
    setup_token: str
    new_password: str
    password_confirmation: str
    reactivation_id: str
@router.post("/employee/account/reactivation/credentials")
def renewThePassoword(data: renewPassword):
    try: 
        return renew_password(data.reactivation_id, data.setup_token, data.new_password, data.password_confirmation)
    except HTTPException:
        raise
    except Exception as e: 
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )