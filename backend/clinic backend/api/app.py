#imports
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import importlib, pkgutil
from api import routers as routers_package


app = FastAPI()


for _ ,module_name, _ in pkgutil.iter_modules(routers_package.__path__):
    full_module_name = f"{routers_package.__name__}.{module_name}"
    module = importlib.import_module(full_module_name)
    if hasattr(module, "router"):
        app.include_router(module.router)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://dentist-website-lac-two.vercel.app",
        "http://127.0.0.1:5174",
        "http://localhost:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)




# yo, important thing here, if you want to make the thing run again,
# using vercel, you have to make the logic in a sperate folder, the 
# api in a sepereate folder called "api", while listing the requirements
# and the vercel.json code so that the domain that is in vercel can 
# execute the code

# from database.main import supabase
#      ^^^^^^^^ new importing method, you can use {name of folder}.{name of file} to import a certain file
# that is outside of the folder, but is inside the parent folder

# BaseModel tells FastAPI how to convert incoming JSON into a Python object.
# for example it sees this: {"message":True}
# and if a python variable is already named message, using basemodel will turn it into:
# message = True