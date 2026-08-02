from database.main import supabase
from fastapi import HTTPException

def save_working_hours(working_hours: list, employee_id):
    if not working_hours or not employee_id:
        raise HTTPException(status_code=400,detail="invalid input")
    seenDays = set()
    elements = []
    for interval in working_hours:
        day = interval["day_of_week"] 
        start = interval["start_minute"] 
        end = interval["end_minute"]
        working_status = interval["working_status"]
        
        if day is None or end is None or start is None or working_status is None:
            raise HTTPException(status_code=400, detail="invalid input")
        
        if not type(day) == int or not type(start) == int or not type(end) == int or not type(working_status) == bool:
            raise HTTPException(status_code=400, detail="invalid input")
        
        if day not in range(7) or start not in range(1440) or end not in range(1,1441):
            raise HTTPException(status_code=400, detail="invalid input")
        
        if not start < end: 
            raise HTTPException(status_code=400,detail="invalid input")

        #* logic is here
        if not working_status:
            if day not in seenDays:
                elements.append(interval)
                seenDays.add(day)
            else:
                raise HTTPException(
                    status_code=409,
                    detail="conflict, repeated days in input"
                )
        else:
            if day not in seenDays:
                elements.append(interval)
            else:
                raise HTTPException(status_code=409, detail="conflict, repeated days in input")
            seenDays.add(day)

    #saving to database
    interval = None
    for interval in elements:
        interval.update({"employee_id":employee_id})
        (
            supabase.table("employee_working_hours")
            .insert(interval)
            .execute()
        )

    return { 
        "inserted":True,
        "working_hours":elements
    }