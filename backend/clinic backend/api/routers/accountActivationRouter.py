from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, model_validator, Field
from logic.owner.accountActivation import add_credentials
from logic.owner.accountAccess import verify_account_location
from logic.owner.accountReactivation import renew_password

router = APIRouter()

class WorkingHoursInterval(BaseModel):
    day_of_week: int = Field(ge=0,le=6, strict=True)
    start_minute: int = Field(ge=0,le=1439, strict=True)
    end_minute: int = Field(ge=1, le=1440, strict=True)
    working_status: bool = Field(strict=True)

    @model_validator(mode="after")
    def validate_minute_order(self):
        if self.start_minute >= self.end_minute:
            raise ValueError("start minute is greater than end minute (the shift ends before it starts)")
        return self

class AddCredentials(BaseModel):
    old_username: str
    old_phone_number: str
    new_username: str
    new_phone_number: str
    new_password: str
    password_confirmation: str
    setup_token: str
    working_hours: list[WorkingHoursInterval] = Field(min_length=1, max_length=7)

    @model_validator(mode="after")
    def validate_duplicates(self):
        days = [interval.day_of_week for interval in self.working_hours]
        if len(days) != (len(set(days))):
            raise ValueError("repeated days present")
        return self

@router.post("/employee/account/credentials")
def addCredentials(data: AddCredentials):
    try:
        working_hours = [interval.model_dump() for interval in data.working_hours]
        return add_credentials(
            data.old_username, 
            data.old_phone_number,
            data.setup_token,
            data.new_username,
            data.new_phone_number,
            data.new_password,
            data.password_confirmation, 
            working_hours
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


class workingHours(BaseModel):
    pass