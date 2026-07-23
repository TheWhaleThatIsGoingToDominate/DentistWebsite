from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from api.dependencyFunctions import require_employee_auth, require_role
from logic.staff.creatingEmployeeAccounts import create_account, create_activation_code
from logic.staff.employeeAccounts import load_created_accounts, load_pending_accounts, load_created_profile, load_pending_profile

router = APIRouter(
    dependencies=[Depends(require_employee_auth)]
)

class createAccount(BaseModel):
    name: str
    phone_number: str
    role: str #put the vars here
@router.post("/owner/createAccount", status_code=201)
def accountCreation(data: createAccount, _=Depends(require_role("owner"))):
    try: 
        return create_account(data.name, data.phone_number, data.role)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

class newActivationCode(BaseModel):
    account_id: str
@router.post("/owner/account/generateNewCode")
def generateNewCode(data: newActivationCode, _=Depends(require_role("owner"))):
    try:
        return create_activation_code(data.account_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )



@router.get("/owner/accounts/created")
def loadCreatedAccounts(username: str | None = None, phone_number: str | None = None, _=Depends(require_role("owner"))):
    try:
        return load_created_accounts(username, phone_number)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@router.get("/owner/accounts/pending")
def LoadPendingAccounts(username: str | None = None, phone_number: str | None = None, _=Depends(require_role("owner"))):
    try:
        return load_pending_accounts(username, phone_number)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@router.get("/owner/accounts/created/{account_id}")
def loadCreatedProfile(account_id: str, _=Depends(require_role("owner"))):
    try:
        return load_created_profile(account_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@router.get("/owner/accounts/pending/{account_id}")
def loadPendingProfile(account_id: str, _=Depends(require_role("owner"))):
    try:
        return load_pending_profile(account_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )