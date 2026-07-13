import os
from fastapi import HTTPException, Header, APIRouter
from logic.reception.slots import slots_cleanup

router = APIRouter()
#automatic slot cleanup, runs everyday and removes the past days' slots
@router.get("/slotsDailyCleanup") #< for this one vercel itself sends a get request, so we have to match
def cleanup(authorization: str  | None = Header(default=None)):
    try:
        cron_secret = os.environ["CRON_SECRET"]
        if authorization != f"Bearer {cron_secret}":
            raise HTTPException(status_code=403, detail="not allowed")
        else:
            return slots_cleanup()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        ) 