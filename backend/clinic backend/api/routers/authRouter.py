from fastapi import HTTPException, Header, Depends, APIRouter, Response, Cookie
from pydantic import BaseModel
from logic.auth.authentication import detail_verification, auth, delete_employee_token
from api.dependencyFunctions import require_employee_auth

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
def authentication(data: Authentication, response: Response):
    try:
        result = auth(data.username, data.phone_number, data.password, data.valid_time)
        employee_id = result.pop("employee_id")
        token = result.pop("token")

        cookie_value = f"{employee_id}.{token}"
        response.set_cookie(
            key="__Host-aurora_session",
            value= cookie_value, 
            httponly= True,
            secure= True,
            samesite="none",
            path= "/",
            max_age= data.valid_time * 60
        )

        return result
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


@router.post("/employee/auth/logout")
def logout(response: Response,
            employee=Depends(require_employee_auth), 
            session_cookie: str | None = Cookie(default=None, alias="__Host-aurora_session")
    ): #will use the function that clears the token, salt, and all related things to the token
    try:
        employee_id = employee[0]["employee_id"]
        token_employee_id, token = session_cookie.split(".", maxsplit=1)
        if not employee_id == token_employee_id:
            raise HTTPException(
                status_code=401,
                detail="token cookie doesn't match stored employee token"
            )
        
        output = delete_employee_token(employee_id, token)

        response.delete_cookie(
            key="__Host-aurora_session",
            path="/",
            secure=True,
            httponly=True,
            samesite="none",
        )

        return output
    except HTTPException:
        raise 
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
