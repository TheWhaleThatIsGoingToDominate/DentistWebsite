from fastapi import HTTPException, Depends, Cookie
from logic.auth.authentication import verify_employee_token

def require_employee_auth(
    session_cookie: str | None = Cookie(default=None, alias="__Host-aurora_session")
):
    if not session_cookie:
        raise HTTPException(status_code=401, detail="Missing employee token/cookie")

    def extract_bearer_token_and_id(string: str):
        if not string:
            raise HTTPException(
                status_code=401,
                detail="unauthorized, missing authorization header"
            )

        split = string.split(".", maxsplit=1)
        if len(split) != 2:
            raise HTTPException(status_code=401, detail="Invalid cookie")
        employee_id, token = split

        if not employee_id or not token:
            raise HTTPException(
                status_code=401,
                detail="unauthorized, missing employee id or token"
            )
        return employee_id ,token

    employee_id, token = extract_bearer_token_and_id(session_cookie)

    employee = verify_employee_token(
        employee_id=employee_id,
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

