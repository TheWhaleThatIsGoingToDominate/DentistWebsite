#TODO: update function logic to be stronger, using the idea of chatgpt.

def generate_slots(startTime: str, endTime: str, slotLength: int):
    """
    logic:
    convert the starting time and end time to minutes, and then add the slot length
    to the the starting time while: startingTime < endTime
    """
    slots = []
    slotLength = int(slotLength)
    #counter to stop infinte loop
    counter = 0
    def timeToMinutes(timeTxt):
        """convert the start time to minutes here, the zero point is 12 AM"""
        period = timeTxt[-2:].strip().lower()
        hours, minutes = timeTxt[:-2].strip().split(":")
        hours, minutes = int(hours), int(minutes)
        if period == "pm":
            if hours == 12:
                result = 720 + minutes
            else:
                result = ((hours * 60) + 720) + minutes
        else:
            result = (hours * 60) + minutes
        return result


    def minutesToTime(theMinutes):
        """convert the minutes to time here, the zero point is 12 AM"""
        hours = theMinutes//60
        hours %= 12
        if hours == 0:
            hours += 12
        minutes = theMinutes%60
        if theMinutes >= 720:
            period = "pm".upper()
        else:
            period = "am".upper()
        return f"{hours:02.0f}:{minutes:02.0f} {period}"
    
    
    startMinutes = timeToMinutes(startTime)
    endMinutes = timeToMinutes(endTime)
    if startMinutes > endMinutes: 
        raise ValueError("the start time should be before the end times")
    
    while startMinutes < endMinutes:
        key = {
            "time":minutesToTime(startMinutes),
            "status":"available"
            }
        slots.append(key)
        startMinutes += int(slotLength)
    return slots 










#the old function (the one that I made)
# def generate_slots(startTime, endTime, slotLength):
#     """
#     logic:
#     get the starting time, the ending time and the slot length, in a list, append the slot of the starting time, 
#     and add the slotlength (which is a number) to the minutes of the starting time, making sure of am and pm, 
#     and using modules to indicate the passing of 60mins to add an hour to the starting time, and when the starting 
#     is 12, you switch the am to pm, and while the starting time does not equal the end time, you keep doing this,
#     when they are equal you stop immediatly.
#     """
#     #the variables that are needed
#     slots = [] #will save the slots here and output them to the frontend
#     startPeriod = "" #the am or pm in the ending time
#     startHour = 0 #the starting hour , since the start time is in the form of: XX:XX AM/PM
#     startMinutes = 0 #the starting minute , since the start time is in the form of: XX:XX AM/PM
#     endPeriod = "" #the am or pm in the starting time
#     endHour = 0 #the ending hour , since the end time is in the form of: XX:XX AM/PM
#     endMinutes = 0 #the ending minute , since the end time is in the form of: XX:XX AM/PM
#     flagToSkipPeriodDeclaration = False #this will be a flag that is going to be raised when 

#     #defining Starting times and period
#     startPeriod = startTime[:-3:-1][-1] #takes the am or pm in the start
#     old_instanceOfStartTime = startTime
#     startTime = startTime[:-2].strip()
#     startHour, startMinutes = startTime.split(":")
#     startHour, startMinutes = int(startHour), int(startMinutes)
#     startTime = old_instanceOfStartTime

#     #defining ending times and period
#     endPeriod = endTime[:-3:-1][-1] #takes the am or pm in the start
#     endHour, endMinutes = endTime.split(":")
#     #infinte loop detector
#     counter = 0

#     while startTime != endTime: #infinite loop, have to update startTime
#         if flagToSkipPeriodDeclaration:
#             pass
#         else:
#             startPeriod = "AM"

#         startMinutes += slotLength
#         startMinutes = startMinutes%60
#         if startMinutes == 0:
#             startHour += 1
#         startHour = startHour%13
#         if startHour == 0:
#             startHour += 1
#             if startPeriod == "AM":
#                 startPeriod = "PM"
#                 flagToSkipPeriodDeclaration = True
#             else:
#                 startPeriod = "AM"
#                 flagToSkipPeriodDeclaration = True

#         startTime = f"{startHour:02.0f}:{startMinutes:02.0f} {startPeriod}"
#         slots.append(startTime)

#     return slots
