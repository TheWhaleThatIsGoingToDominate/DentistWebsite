from fastapi import HTTPException, Header, Depends, APIRouter
from logic.auth.authentication import verify_employee_token

def require_employee_auth(
    authorization: str | None = Header(default=None),
    x_employee_username: str | None = Header(default=None),
    x_employee_phone: str | None = Header(default=None),
):
    if not x_employee_username or not x_employee_phone:
        raise HTTPException(status_code=401, detail="Missing employee identity headers")

    def extract_bearer_token(string: str):
        if not string:
            raise HTTPException(
                status_code=401,
                detail="unauthorized, missing authorization header"
            )

        split = string.split(maxsplit=1)
        if len(split) != 2:
            raise HTTPException(status_code=401, detail="Invalid authorization header")
        scheme, token = "", ""
        scheme, token = split

        if scheme.lower() != "bearer" or not token:
            raise HTTPException(
                status_code=401,
                detail="unauthorized, missing employee identity headers"
            )
        return token

    token = extract_bearer_token(authorization)

    employee = verify_employee_token(
        username=x_employee_username,
        phone_number=x_employee_phone,
        token=token,
    )

    return employee


def require_role(*roles):
    roles = {str(i).upper() for i in roles}

    def role_auth(employee = Depends(require_employee_auth)):
        role = employee[0]["role"]
        if not role:
            raise HTTPException(
                status_code=401,
                detail="unauthorized, no role"
            )
        else:
            role = str(role).upper()
        
        if role not in roles:
            raise HTTPException(
                status_code=403,
                detail="forbidden"
            )
        
        return employee
    
    return role_auth

