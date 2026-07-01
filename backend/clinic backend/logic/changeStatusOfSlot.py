def change_status(key: dict):
    #todo: #make a condition that relies on the backend of the bookers, to verify if the status is booked or not
    if key["status"] == "available":
        key["status"] = "blocked"
    else:
        key["status"] = "available"
    return key