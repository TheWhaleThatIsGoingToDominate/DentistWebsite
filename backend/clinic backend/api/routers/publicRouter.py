from fastapi import HTTPException, APIRouter
from pydantic import BaseModel
from logic.publicPageLogic.clientBooking import save_booking, track_booking, cancel_booking
from logic.reception.slots import load_slots_for_booking_PBOOKINGPAGE

router = APIRouter()

#public booking page
class bookingTracking(BaseModel):
    booking_reference: str
    phone_number: str
@router.post("/booking/track")
def trackTheBooking(data: bookingTracking):
    try:
        return track_booking(
            booking_reference=data.booking_reference,
            phone_number=data.phone_number
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


class bookingCancelling(BaseModel):
    booking_reference: str
    phone_number: str
@router.patch("/booking/cancel")
def cancelTheBooking(data: bookingCancelling):
    try:
        return cancel_booking(
            booking_reference=data.booking_reference,
            phone_number=data.phone_number
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail= str(e)
        )


class Booking(BaseModel):
    name: str
    phone_number: str
    service: str
    date: str
    appointment_time: str
    notes: str
@router.post("/booking/save")
def saveBooking(data: Booking):
    try:
        return save_booking(
        appointment_time=data.appointment_time, 
        date=data.date, 
        name=data.name,
        notes=data.notes,
        phone_number=data.phone_number,
        service=data.service
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


@router.get("/booking/slots")
def loadtheslots(date: str):
    return load_slots_for_booking_PBOOKINGPAGE(date) 
