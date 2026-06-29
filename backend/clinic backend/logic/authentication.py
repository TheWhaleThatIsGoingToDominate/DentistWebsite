def Authentication(access_key):
    key = "clinic-demo-key"
    return access_key == key
#   ^^^^^^^^^^^^^^^^^^^^^^^^ new logic

#old logic: 
# key = "clinic-demo-key"
#     if access_key == key:
#         return True
#     return False