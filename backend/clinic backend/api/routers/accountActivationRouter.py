from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from logic.staff.accountActivation import add_credentials, activate_account

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
        return activate_account(data.name, data.phone_number, data.activation_code)
    except HTTPException:
        raise 
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )