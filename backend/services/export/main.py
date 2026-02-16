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
from shared.models import Expense, EMI, Investment, User, Income, Borrowing, BorrowingRepayment, Lending, LendingCollection
from shared.middleware.auth import get_current_user, auth_middleware
from shared.config import get_settings

app = FastAPI(title="Export Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.middleware("http")(auth_middleware)

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

###############################################################################
# GENERIC HELPERS
###############################################################################

PDF_TABLE_STYLE = TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, 0), 10),
    ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
    ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
    ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ('FONTSIZE', (0, 1), (-1, -1), 8),
])

def _build_csv(headers: list, rows: list, filename: str):
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)
    for row in rows:
        writer.writerow(row)
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

def _build_excel(headers: list, rows: list, sheet_name: str, filename: str):
    wb = Workbook()
    ws = wb.active
    ws.title = sheet_name
    ws.append(headers)
    for row in rows:
        ws.append(row)
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

def _build_pdf(title_text: str, headers: list, rows: list, filename: str):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    elements = []
    styles = getSampleStyleSheet()
    elements.append(Paragraph(title_text, styles['Title']))
    elements.append(Spacer(1, 0.25 * inch))
    data = [headers] + rows
    table = Table(data)
    table.setStyle(PDF_TABLE_STYLE)
    elements.append(table)
    doc.build(elements)
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

def _dispatch_format(fmt: str, title: str, headers: list, rows: list, base_name: str):
    if fmt == "csv":
        return _build_csv(headers, rows, f"{base_name}.csv")
    elif fmt == "excel":
        return _build_excel(headers, rows, title, f"{base_name}.xlsx")
    else:
        return _build_pdf(f"{title} Report", headers, rows, f"{base_name}.pdf")

###############################################################################
# EMI EXPORT (CSV + Excel + PDF)
###############################################################################

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
    headers = ['Loan Type', 'Lender', 'Principal', 'Interest Rate', 'Monthly EMI', 'Start Date', 'End Date', 'Status']
    rows = [[
        emi.loan_type, emi.lender_name, f"{float(emi.principal_amount):.2f}",
        f"{float(emi.interest_rate):.2f}%", f"{float(emi.monthly_emi):.2f}",
        str(emi.start_date), str(emi.end_date), emi.status
    ] for emi in emis]
    return _dispatch_format(export_req.format, "EMI", headers, rows, "emis")

###############################################################################
# INVESTMENT EXPORT (CSV + Excel + PDF)
###############################################################################

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
    headers = ['Asset Name', 'Symbol', 'Type', 'Quantity', 'Purchase Price', 'Current Price', 'Currency', 'Purchase Date']
    rows = [[
        inv.asset_name, inv.asset_symbol or '', inv.investment_type,
        f"{float(inv.quantity):.4f}", f"{float(inv.purchase_price):.2f}",
        f"{float(inv.current_price):.2f}" if inv.current_price else '',
        inv.currency, str(inv.purchase_date)
    ] for inv in investments]
    return _dispatch_format(export_req.format, "Investment", headers, rows, "investments")

###############################################################################
# INCOME EXPORT (CSV + Excel + PDF)
###############################################################################

@app.post("/export/income")
async def export_income(
    export_req: ExportRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    user = get_current_user(request)
    await set_tenant_context(db, user["tenant_id"])
    query = select(Income).where(Income.user_id == uuid.UUID(user["user_id"]))
    if export_req.start_date:
        query = query.where(Income.income_date >= export_req.start_date)
    if export_req.end_date:
        query = query.where(Income.income_date <= export_req.end_date)
    result = await db.execute(query.order_by(Income.income_date.desc()))
    incomes = result.scalars().all()
    headers = ['Date', 'Source', 'Amount', 'Currency', 'Description', 'Recurring', 'Period']
    rows = [[
        str(inc.income_date), inc.source, f"{float(inc.amount):.2f}",
        inc.currency, (inc.description or '')[:30],
        'Yes' if inc.is_recurring else 'No', inc.recurrence_period or ''
    ] for inc in incomes]
    return _dispatch_format(export_req.format, "Income", headers, rows, "income")

###############################################################################
# BORROWINGS EXPORT (CSV + Excel + PDF)
###############################################################################

@app.post("/export/borrowings")
async def export_borrowings(
    export_req: ExportRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    user = get_current_user(request)
    await set_tenant_context(db, user["tenant_id"])
    result = await db.execute(
        select(Borrowing).where(Borrowing.user_id == uuid.UUID(user["user_id"])).order_by(Borrowing.created_at.desc())
    )
    borrowings = result.scalars().all()
    headers = ['Lender', 'Principal', 'Currency', 'Interest Rate', 'Type', 'Borrowed Date', 'Due Date', 'Repaid', 'Remaining', 'Status']
    rows = [[
        b.lender_name, f"{float(b.principal_amount):.2f}", b.currency,
        f"{float(b.interest_rate):.2f}%", b.interest_type,
        str(b.borrowed_date), str(b.due_date) if b.due_date else '',
        f"{float(b.total_repaid or 0):.2f}", f"{float(b.remaining_amount or 0):.2f}",
        b.status
    ] for b in borrowings]
    return _dispatch_format(export_req.format, "Borrowings", headers, rows, "borrowings")

###############################################################################
# LENDINGS EXPORT (CSV + Excel + PDF)
###############################################################################

@app.post("/export/lendings")
async def export_lendings(
    export_req: ExportRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    user = get_current_user(request)
    await set_tenant_context(db, user["tenant_id"])
    result = await db.execute(
        select(Lending).where(Lending.user_id == uuid.UUID(user["user_id"])).order_by(Lending.created_at.desc())
    )
    lendings = result.scalars().all()
    headers = ['Borrower', 'Principal', 'Currency', 'Interest Rate', 'Type', 'Lent Date', 'Due Date', 'Received', 'Remaining', 'Status']
    rows = [[
        l.borrower_name, f"{float(l.principal_amount):.2f}", l.currency,
        f"{float(l.interest_rate):.2f}%", l.interest_type,
        str(l.lent_date), str(l.due_date) if l.due_date else '',
        f"{float(l.total_received or 0):.2f}", f"{float(l.remaining_amount or 0):.2f}",
        l.status
    ] for l in lendings]
    return _dispatch_format(export_req.format, "Lendings", headers, rows, "lendings")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8006)
