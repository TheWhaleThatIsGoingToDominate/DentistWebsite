#imports
import os
from fastapi import FastAPI, HTTPException, status, Header
from logic.authentication import detail_verification, auth
from logic.slots import change_status, generate_slots, slots_cleanup, save_slots, load_booking_PBOOKINGPAGE, load_slotsADMINPAGE
from logic.clientBooking import save_booking, track_booking, cancel_booking
from logic.adminBooking import load_booking, delete_booking, change_status_of_booking
from database.main import supabase
#    ^^^^ new importing method, you can use {name of folder}.name of file to import a certain file
# that is outside of the folder, but is inside the parent folder
from pydantic import BaseModel
# BaseModel tells FastAPI how to convert incoming JSON into a Python object.
# for example it sees this: {"message":True}
# and if a python variable is already named message, using basemodel will turn it into:
# message = True

from fastapi.middleware.cors import CORSMiddleware
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://dentist-website-lac-two.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)










#authentication (right now it is just a simple code, we need to make a more secure system)
class Verification(BaseModel):
    username: str
    phone_number: str

#encryption (better version)
@app.post("/employee/verify-details")
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
@app.post("/employee/auth")
def authentication(data: Authentication):
    try:
        return auth(data.username, data.phone_number, data.password)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail= f"SERVER ERROR: {str(e)}"
        )
@app.get("/isRunning")
def running():
    return {
        "message":"the clinic backend is running"
    }








#automatic slot cleanup, runs everyday and removes the past days' slots
@app.get("/slotsDailyCleanup") #< for this one vercel itself sends a get request, so we have to match
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










#employe admin page, all related things
class GenerateSlotsType(BaseModel):
    startTime: str
    endTime: str
    slotLength: int
@app.post("/employee/generate")
def bookingTimes(data: GenerateSlotsType):
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
@app.patch("/employee/changeState")
def changeState(Slot: changeStatus):
    return change_status(Slot.model_dump())


class SaveTheSlots(BaseModel):
    slots: list
    date: str
@app.post("/employee/saveSlots")
def saveSlots(data: SaveTheSlots):
    try:
        return save_slots(data.date, data.slots)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


@app.get("/employee/loadBooking")
def load_bookingADMIN(date: str):
    try:
        return load_booking(date)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
    

@app.get("/employee/slots")
def load_slotsADMIN(date: str):
    return load_slotsADMINPAGE(date)

class changeBookingStatus(BaseModel):
    status: str
    booking_reference: str
@app.patch("/employee/booking/status")
def changingTheStatusOfABooking(data: changeBookingStatus):
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
@app.delete("/employee/booking/delete")
def deleteTheBooking(data: bookingDeleting):
    try:
        return delete_booking(data.booking_reference)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )









#public booking page
class bookingTracking(BaseModel):
    booking_reference: str
    phone_number: str
@app.post("/booking/track")
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
@app.patch("/booking/cancel")
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
@app.post("/booking/save")
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


@app.get("/booking/slots")
def loadtheslots(date: str):
    return load_booking_PBOOKINGPAGE(date) 


    









# yo, important thing here, if you want to make the thing run again,
# using vercel, you have to make the logic in a sperate folder, the 
# api in a sepereate folder called "api", while listing the requirements
# and the vercel.json code so that the domain that is in vercel can 
# execute the code
