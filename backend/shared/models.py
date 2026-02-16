from sqlalchemy import Column, String, Integer, Float, Boolean, Date, TIMESTAMP, Text, DECIMAL, ARRAY, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from shared.database import Base
import uuid

class Tenant(Base):
    __tablename__ = "tenants"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    subscription_tier = Column(String(50), default='free')
    max_users = Column(Integer, default=5)
    is_active = Column(Boolean, default=True)
    settings = Column(JSONB, default={})
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False)
    email = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(20))
    role = Column(String(50), default='member')
    preferred_language = Column(String(10), default='en')
    preferred_currency = Column(String(3), default='USD')
    timezone = Column(String(50), default='UTC')
    profile_image_url = Column(Text)
    is_active = Column(Boolean, default=True)
    email_verified = Column(Boolean, default=False)
    last_login_at = Column(TIMESTAMP(timezone=True))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

class Category(Base):
    __tablename__ = "categories"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'))
    name = Column(String(100), nullable=False)
    type = Column(String(50), nullable=False)
    color = Column(String(7), default='#3B82F6')
    icon = Column(String(50), default='folder')
    is_system = Column(Boolean, default=False)
    parent_id = Column(UUID(as_uuid=True), ForeignKey('categories.id'))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    expenses = relationship("Expense", back_populates="category")

class Expense(Base):
    __tablename__ = "expenses"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    category_id = Column(UUID(as_uuid=True), ForeignKey('categories.id', ondelete='SET NULL'))
    amount = Column(DECIMAL(15, 2), nullable=False)
    currency = Column(String(3), nullable=False, default='USD')
    amount_in_base_currency = Column(DECIMAL(15, 2))
    exchange_rate = Column(DECIMAL(18, 6))
    description = Column(Text)
    transaction_date = Column(Date, nullable=False)
    payment_method = Column(String(50))
    receipt_url = Column(Text)
    tags = Column(ARRAY(Text))
    extra_data = Column(JSONB, default={})
    is_recurring = Column(Boolean, default=False)
    recurring_config = Column(JSONB)
    synced = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    category = relationship("Category", back_populates="expenses")

class EMI(Base):
    __tablename__ = "emis"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    loan_type = Column(String(100), nullable=False)
    lender_name = Column(String(255), nullable=False)
    account_number = Column(String(100))
    principal_amount = Column(DECIMAL(15, 2), nullable=False)
    currency = Column(String(3), nullable=False, default='USD')
    interest_rate = Column(DECIMAL(5, 2), nullable=False)
    interest_type = Column(String(50), default='reducing')
    tenure_months = Column(Integer, nullable=False)
    monthly_emi = Column(DECIMAL(15, 2), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    status = Column(String(50), default='active')
    prepayment_allowed = Column(Boolean, default=True)
    prepayment_charges = Column(DECIMAL(5, 2))
    documents = Column(JSONB, default=[])
    notes = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

class EMIPayment(Base):
    __tablename__ = "emi_payments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False)
    emi_id = Column(UUID(as_uuid=True), ForeignKey('emis.id', ondelete='CASCADE'), nullable=False)
    installment_number = Column(Integer, nullable=False)
    due_date = Column(Date, nullable=False)
    paid_date = Column(Date)
    amount = Column(DECIMAL(15, 2), nullable=False)
    principal_component = Column(DECIMAL(15, 2), nullable=False)
    interest_component = Column(DECIMAL(15, 2), nullable=False)
    outstanding_balance = Column(DECIMAL(15, 2), nullable=False)
    status = Column(String(50), default='pending')
    payment_method = Column(String(50))
    transaction_reference = Column(String(255))
    late_fee = Column(DECIMAL(10, 2), default=0)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

class Investment(Base):
    __tablename__ = "investments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    investment_type = Column(String(50), nullable=False)
    asset_name = Column(String(255), nullable=False)
    asset_symbol = Column(String(50))
    quantity = Column(DECIMAL(18, 8), nullable=False)
    purchase_price = Column(DECIMAL(15, 2), nullable=False)
    currency = Column(String(3), nullable=False, default='USD')
    purchase_date = Column(Date, nullable=False)
    current_price = Column(DECIMAL(15, 2))
    current_value = Column(DECIMAL(15, 2))
    unrealized_gain_loss = Column(DECIMAL(15, 2))
    realized_gain_loss = Column(DECIMAL(15, 2))
    notes = Column(Text)
    extra_data = Column(JSONB, default={})
    last_updated = Column(TIMESTAMP(timezone=True))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

class Budget(Base):
    __tablename__ = "budgets"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    category_id = Column(UUID(as_uuid=True), ForeignKey('categories.id', ondelete='CASCADE'))
    name = Column(String(255), nullable=False)
    amount = Column(DECIMAL(15, 2), nullable=False)
    currency = Column(String(3), nullable=False, default='USD')
    period = Column(String(50), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    alert_threshold = Column(DECIMAL(5, 2), default=80)
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

class Borrowing(Base):
    __tablename__ = "borrowings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    lender_name = Column(String(255), nullable=False)
    lender_contact = Column(String(255))
    principal_amount = Column(DECIMAL(15, 2), nullable=False)
    currency = Column(String(3), default='INR')
    interest_rate = Column(DECIMAL(5, 2), default=0)
    interest_type = Column(String(20), default='none')  # 'none', 'simple', 'compound'
    borrowed_date = Column(Date, nullable=False)
    due_date = Column(Date)
    purpose = Column(Text)
    tags = Column(ARRAY(Text))
    status = Column(String(20), default='open')  # 'open', 'partially_paid', 'closed'
    total_repaid = Column(DECIMAL(15, 2), default=0)
    remaining_amount = Column(DECIMAL(15, 2))
    notes = Column(Text)
    closed_at = Column(TIMESTAMP(timezone=True))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

    repayments = relationship("BorrowingRepayment", back_populates="borrowing", cascade="all, delete-orphan")

class BorrowingRepayment(Base):
    __tablename__ = "borrowing_repayments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False)
    borrowing_id = Column(UUID(as_uuid=True), ForeignKey('borrowings.id', ondelete='CASCADE'), nullable=False)
    amount = Column(DECIMAL(15, 2), nullable=False)
    repayment_date = Column(Date, nullable=False)
    payment_method = Column(String(50))
    reference_number = Column(String(255))
    note = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

    borrowing = relationship("Borrowing", back_populates="repayments")

class Income(Base):
    __tablename__ = "income"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    source = Column(String(50), nullable=False)  # salary, freelance, dividends, rental, gift, other
    amount = Column(DECIMAL(15, 2), nullable=False)
    currency = Column(String(3), default='INR')
    income_date = Column(Date, nullable=False)
    description = Column(Text)
    is_recurring = Column(Boolean, default=False)
    recurrence_period = Column(String(20))  # monthly, weekly, yearly
    notes = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

class Lending(Base):
    __tablename__ = "lendings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    borrower_name = Column(String(255), nullable=False)
    borrower_contact = Column(String(255))
    principal_amount = Column(DECIMAL(15, 2), nullable=False)
    currency = Column(String(3), default='INR')
    interest_rate = Column(DECIMAL(5, 2), default=0)
    interest_type = Column(String(20), default='none')  # 'none', 'simple', 'compound'
    lent_date = Column(Date, nullable=False)
    due_date = Column(Date)
    purpose = Column(Text)
    status = Column(String(20), default='open')  # 'open', 'partially_received', 'closed'
    total_received = Column(DECIMAL(15, 2), default=0)
    remaining_amount = Column(DECIMAL(15, 2))
    notes = Column(Text)
    closed_at = Column(TIMESTAMP(timezone=True))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

    collections = relationship("LendingCollection", back_populates="lending", cascade="all, delete-orphan")

class LendingCollection(Base):
    __tablename__ = "lending_collections"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False)
    lending_id = Column(UUID(as_uuid=True), ForeignKey('lendings.id', ondelete='CASCADE'), nullable=False)
    amount = Column(DECIMAL(15, 2), nullable=False)
    collection_date = Column(Date, nullable=False)
    payment_method = Column(String(50))
    reference_number = Column(String(255))
    note = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

    lending = relationship("Lending", back_populates="collections")

class Watchlist(Base):
    __tablename__ = "watchlist"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    symbol = Column(String(50), nullable=False)
    exchange = Column(String(50))
    asset_type = Column(String(50), default='stock')
    alert_price_high = Column(DECIMAL(15, 2))
    alert_price_low = Column(DECIMAL(15, 2))
    notes = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

class Currency(Base):
    __tablename__ = "currencies"
    
    code = Column(String(3), primary_key=True)
    name = Column(String(100), nullable=False)
    symbol = Column(String(10), nullable=False)
    decimal_places = Column(Integer, default=2)
    is_active = Column(Boolean, default=True)

class ExchangeRate(Base):
    __tablename__ = "exchange_rates"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    base_currency = Column(String(3), ForeignKey('currencies.code'), nullable=False)
    target_currency = Column(String(3), ForeignKey('currencies.code'), nullable=False)
    rate = Column(DECIMAL(18, 6), nullable=False)
    date = Column(Date, nullable=False, server_default=func.current_date())
    source = Column(String(50), default='api')
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
