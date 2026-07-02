#imports
from fastapi import FastAPI, HTTPException, status
from logic.authentication import Authentication
from logic.slots import change_status, generate_slots, save_slots, load_booking_PBOOKINGPAGE, load_slotsADMINPAGE
from logic.clientBooking import save_booking
from logic.adminBooking import load_booking
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

class Verification(BaseModel):
    access_key: str

class GenerateSlotsType(BaseModel):
    startTime: str
    endTime: str
    slotLength: int

class changeStatus(BaseModel):
    time: str
    status: str

class SaveTheSlots(BaseModel):
    slots: list
    date: str


@app.post("/employee/auth")
def auth(verification: Verification):
    response = Authentication(verification.access_key)
    if response == True:
        return {
            "allowed":response
        } #send message in json confirming it is true
    return {
        "allowed":response
    }
        #send message in json confirming it is false

@app.get("/runningCheck")
def running():
    return {
        "message":"the clinic backend is running"
    }

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

#    VVVVV patch is used when we want to change a part of the frontend, but put changes everything, not a specific part
@app.patch("/employee/changeState")
def changeState(Slot: changeStatus):
    return change_status(Slot.model_dump())


@app.post("/employee/saveSlots")
def saveSlots(data: SaveTheSlots):
    try:
        return save_slots(data.date, data.slots)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@app.get("/employee/slots")
def loadADMIN(date: str):
    return load_slotsADMINPAGE(date)




@app.get("/employee/loadBooking")
def loadPUBLIC(date: str):
    try:
        return load_booking(date)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
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
