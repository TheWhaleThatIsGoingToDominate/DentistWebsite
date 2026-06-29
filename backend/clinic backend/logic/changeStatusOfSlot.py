def change_status(key: dict):
    if key["status"] == "available":
        key["status"] = "blocked"
    else:
        key["status"] = "available"
    return key