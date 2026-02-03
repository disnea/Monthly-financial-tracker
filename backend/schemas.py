from pydantic import BaseModel 

class Transaction(BaseModel):
    day : str 
    date : str 
    description : str 
    type : str 
    amount : float 
    category : str 
    