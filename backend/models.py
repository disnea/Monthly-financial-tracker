from sqlalchemy import Column, Integer, String, Float 
from database import Base 

class TransactionDB(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(String, index=True)
    description = Column(String, index=True)
    type = Column(String, index=True)
    amount = Column(Float)
    category = Column(String, index=True)
    day = Column(String, index=True)
