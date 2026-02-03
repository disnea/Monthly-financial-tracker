from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import TransactionDB
from schemas import Transaction

TransactionDB.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/transactions")
def add_transaction(t: Transaction, db: Session = Depends(get_db)):
    new = TransactionDB(**t.dict())
    db.add(new)
    db.commit()
    db.refresh(new)
    return new

@app.get("/transactions")
def get_transactions(db: Session = Depends(get_db)):
    return db.query(TransactionDB).all()
