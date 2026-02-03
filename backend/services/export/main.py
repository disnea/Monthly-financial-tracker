from fastapi import FastAPI, Depends, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel
from typing import Optional
from datetime import date
from decimal import Decimal
import uuid
import io
import csv
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from openpyxl import Workbook

import sys
sys.path.append('/app')

from shared.database import get_db, set_tenant_context
from shared.models import Expense, EMI, Investment, User
from shared.middleware.auth import get_current_user
from shared.config import get_settings

app = FastAPI(title="Export Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

settings = get_settings()

class ExportRequest(BaseModel):
    export_type: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    format: str = "pdf"

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "export"}

@app.post("/export/expenses")
async def export_expenses(
    export_req: ExportRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    user = get_current_user(request)
    await set_tenant_context(db, user["tenant_id"])
    
    query = select(Expense).where(Expense.user_id == uuid.UUID(user["user_id"]))
    
    if export_req.start_date:
        query = query.where(Expense.transaction_date >= export_req.start_date)
    if export_req.end_date:
        query = query.where(Expense.transaction_date <= export_req.end_date)
    
    result = await db.execute(query.order_by(Expense.transaction_date.desc()))
    expenses = result.scalars().all()
    
    if export_req.format == "csv":
        return export_expenses_csv(expenses)
    elif export_req.format == "excel":
        return export_expenses_excel(expenses)
    else:
        return export_expenses_pdf(expenses, user)

def export_expenses_csv(expenses):
    """Export expenses to CSV"""
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow(['Date', 'Description', 'Amount', 'Currency', 'Category', 'Payment Method'])
    
    for expense in expenses:
        writer.writerow([
            expense.transaction_date,
            expense.description or '',
            float(expense.amount),
            expense.currency,
            str(expense.category_id) if expense.category_id else '',
            expense.payment_method or ''
        ])
    
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=expenses.csv"}
    )

def export_expenses_excel(expenses):
    """Export expenses to Excel"""
    wb = Workbook()
    ws = wb.active
    ws.title = "Expenses"
    
    headers = ['Date', 'Description', 'Amount', 'Currency', 'Payment Method']
    ws.append(headers)
    
    for expense in expenses:
        ws.append([
            expense.transaction_date.isoformat(),
            expense.description or '',
            float(expense.amount),
            expense.currency,
            expense.payment_method or ''
        ])
    
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=expenses.xlsx"}
    )

def export_expenses_pdf(expenses, user_info):
    """Export expenses to PDF"""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    elements = []
    styles = getSampleStyleSheet()
    
    title = Paragraph(f"Expense Report", styles['Title'])
    elements.append(title)
    elements.append(Spacer(1, 0.25 * inch))
    
    data = [['Date', 'Description', 'Amount', 'Currency', 'Method']]
    
    for expense in expenses:
        data.append([
            str(expense.transaction_date),
            (expense.description or '')[:30],
            f"{float(expense.amount):.2f}",
            expense.currency,
            (expense.payment_method or '')[:15]
        ])
    
    table = Table(data)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    
    elements.append(table)
    doc.build(elements)
    
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=expenses.pdf"}
    )

@app.post("/export/emis")
async def export_emis(
    export_req: ExportRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    user = get_current_user(request)
    await set_tenant_context(db, user["tenant_id"])
    
    result = await db.execute(
        select(EMI).where(EMI.user_id == uuid.UUID(user["user_id"]))
    )
    emis = result.scalars().all()
    
    if export_req.format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        
        writer.writerow(['Loan Type', 'Lender', 'Principal', 'Interest Rate', 'Monthly EMI', 'Start Date', 'End Date', 'Status'])
        
        for emi in emis:
            writer.writerow([
                emi.loan_type,
                emi.lender_name,
                float(emi.principal_amount),
                float(emi.interest_rate),
                float(emi.monthly_emi),
                emi.start_date,
                emi.end_date,
                emi.status
            ])
        
        output.seek(0)
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode()),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=emis.csv"}
        )
    
    raise HTTPException(status_code=400, detail="Only CSV format supported for EMIs")

@app.post("/export/investments")
async def export_investments(
    export_req: ExportRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    user = get_current_user(request)
    await set_tenant_context(db, user["tenant_id"])
    
    result = await db.execute(
        select(Investment).where(Investment.user_id == uuid.UUID(user["user_id"]))
    )
    investments = result.scalars().all()
    
    if export_req.format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        
        writer.writerow(['Asset Name', 'Symbol', 'Type', 'Quantity', 'Purchase Price', 'Current Price', 'Currency', 'Purchase Date'])
        
        for inv in investments:
            writer.writerow([
                inv.asset_name,
                inv.asset_symbol or '',
                inv.investment_type,
                float(inv.quantity),
                float(inv.purchase_price),
                float(inv.current_price) if inv.current_price else '',
                inv.currency,
                inv.purchase_date
            ])
        
        output.seek(0)
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode()),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=investments.csv"}
        )
    
    raise HTTPException(status_code=400, detail="Only CSV format supported for investments")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8006)
