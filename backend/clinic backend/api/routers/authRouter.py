from fastapi import HTTPException, Header, Depends, APIRouter
from pydantic import BaseModel
from logic.auth.authentication import detail_verification, auth, delete_employee_token

router = APIRouter()

#authentication and token system
class Verification(BaseModel):
    username: str
    phone_number: str

#encryption (better version)
@router.post("/employee/verify-details")
def verify(data: Verification):
    try:
        return detail_verification(data.username, data.phone_number)
    except HTTPException: 
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"SERVER ERROR: {str(e)}"
        )

class Authentication(BaseModel):
    username: str
    phone_number: str
    password: str
    valid_time: int = 30
@router.post("/employee/auth")
def authentication(data: Authentication):
    try:
        return auth(data.username, data.phone_number, data.password, data.valid_time)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail= f"SERVER ERROR: {str(e)}"
        )

@router.get("/isRunning")
def running():
    return {
        "message":"the clinic backend is running"
    }

class Logout(BaseModel):
    username: str
    phone_number: str
    token: str
@router.post("/employee/auth/logout")
def logout(data: Logout): #will use the function that clears the token, salt, and all related things to the token
    return delete_employee_token(data.username, data.phone_number, data.token)
