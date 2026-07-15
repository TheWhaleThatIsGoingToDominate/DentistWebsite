from fastapi import HTTPException, status, Header, Depends, APIRouter
from logic.reception.slots import change_status, generate_slots, save_slots, load_slotsADMINPAGE
from logic.reception.adminBooking import load_patient_history, delete_booking, change_status_of_booking
from api.dependencyFunctions import require_employee_auth, require_role
from pydantic import BaseModel
#employe admin page, all related things
#function that will be used in the router to require a token in each admin action

router = APIRouter(
    prefix="/employee/admin",
    dependencies=[Depends(require_employee_auth)]
)

class GenerateSlotsType(BaseModel):
    startTime: str
    endTime: str
    slotLength: int
@router.post("/generate")
def bookingTimes(data: GenerateSlotsType, authroization: str | None = Header(default=None), role=Depends(require_role("owner", "receptionist"))):
    #you know that   ^ this hinting doesn't work in normal python, but fastapi uses those hints and actually converts them to values
    #using pydantic
    try:
        
        output = generate_slots(
            data.startTime,
            data.endTime,
            data.slotLength
        )

        return output

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


class changeStatus(BaseModel):
    time: str
    status: str
#    VVVVV patch is used when we want to change a part of the frontend, but put changes everything, not a specific part
@router.patch("/changeState")
def changeState(Slot: changeStatus, role=Depends(require_role("owner", "receptionist"))):
    return change_status(Slot.model_dump())


class SaveTheSlots(BaseModel):
    slots: list
    date: str
@router.post("/saveSlots")
def saveSlots(data: SaveTheSlots, role=Depends(require_role("owner", "receptionist"))):
    try:
        
        return save_slots(data.date, data.slots)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


@router.get("/loadBooking")
def load_bookingADMIN(name: str | None = None , phone_number: str | None = None , role=Depends(require_role("owner", "receptionist"))):
    try:
        
        return load_patient_history(name, phone_number)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
    

@router.get("/slots")
def load_slotsADMIN(date: str, role=Depends(require_role("owner" ,"receptionist"))):
    
    return load_slotsADMINPAGE(date)

class changeBookingStatus(BaseModel):
    status: str
    booking_reference: str
@router.patch("/booking/status")
def changingTheStatusOfABooking(data: changeBookingStatus, role=Depends(require_role("owner", "receptionist"))):
    try:
        
        return change_status_of_booking(
            status= data.status,
            booking_reference= data.booking_reference
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code= 500,
            detail= str(e)
        )


class bookingDeleting(BaseModel):
    booking_reference: str
@router.delete("/booking/delete")
def deleteTheBooking(data: bookingDeleting, role=Depends(require_role("owner", "receptionist"))):
    try:
        return delete_booking(data.booking_reference)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )