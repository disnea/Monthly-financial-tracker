# Goals & Savings Module - Complete Design Specification

**Last Updated:** February 4, 2026  
**Status:** Design Complete - Ready for Implementation  
**Priority:** HIGH ⭐⭐⭐⭐⭐

---

## Overview

A comprehensive goal tracking and savings management system to help users plan, save, and achieve financial objectives. This module completes the financial management cycle: **track → analyze → plan → save**.

### Why This Feature?

1. **User Engagement**: Progress tracking is highly engaging and addictive
2. **Differentiation**: Sets us apart from basic expense trackers
3. **Value Proposition**: Helps users achieve actual financial outcomes
4. **Data Insights**: Provides valuable forecasting and recommendations
5. **Retention**: Users with active goals have 3x higher retention

---

## Database Schema

### 1. Financial Goals

```python
# backend/services/finance/models.py

class FinancialGoal(Base):
    """Track financial goals and savings targets"""
    __tablename__ = "financial_goals"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Goal details
    name = Column(String(200), nullable=False)
    description = Column(Text)
    goal_type = Column(String(50), nullable=False)
    # Types: "emergency", "purchase", "vacation", "education", 
    #        "retirement", "wedding", "house", "vehicle", "other"
    
    # Financial targets
    target_amount = Column(Numeric(15, 2), nullable=False)
    current_amount = Column(Numeric(15, 2), default=0)
    currency = Column(String(3), default="USD")
    
    # Timeline
    start_date = Column(Date, nullable=False)
    target_date = Column(Date, nullable=False)
    completed_date = Column(Date)
    
    # Status
    status = Column(String(20), default="active")
    # Statuses: "active", "completed", "paused", "abandoned"
    priority = Column(String(20), default="medium")
    # Priorities: "low", "medium", "high", "critical"
    
    # Auto-save configuration
    auto_contribute = Column(Boolean, default=False)
    monthly_contribution = Column(Numeric(15, 2))
    contribution_source = Column(String(50))  # "salary", "bonus", "manual"
    
    # Visual customization
    icon = Column(String(50))  # Icon name (lucide-react icons)
    color = Column(String(20))  # Hex color code
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    contributions = relationship("GoalContribution", back_populates="goal", cascade="all, delete-orphan")
    linked_savings = relationship("SavingsAccount", back_populates="linked_goal")
    milestones = relationship("GoalMilestone", back_populates="goal", cascade="all, delete-orphan")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_goal_tenant_user', 'tenant_id', 'user_id'),
        Index('idx_goal_status', 'status'),
        Index('idx_goal_target_date', 'target_date'),
    )
```

### 2. Goal Contributions

```python
class GoalContribution(Base):
    """Track individual contributions to goals"""
    __tablename__ = "goal_contributions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    goal_id = Column(UUID(as_uuid=True), ForeignKey("financial_goals.id", ondelete="CASCADE"), nullable=False)
    
    amount = Column(Numeric(15, 2), nullable=False)
    contribution_date = Column(Date, nullable=False)
    
    source = Column(String(50), nullable=False)
    # Sources: "manual", "auto", "investment_profit", "salary_bonus", 
    #          "gift", "refund", "cashback", "other"
    
    notes = Column(Text)
    
    # Link to related transactions
    expense_id = Column(UUID(as_uuid=True), ForeignKey("expenses.id"))
    investment_id = Column(UUID(as_uuid=True), ForeignKey("investments.id"))
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    goal = relationship("FinancialGoal", back_populates="contributions")
    
    # Indexes
    __table_args__ = (
        Index('idx_contribution_goal', 'goal_id'),
        Index('idx_contribution_date', 'contribution_date'),
    )
```

### 3. Savings Accounts

```python
class SavingsAccount(Base):
    """Track savings accounts, FDs, RDs, and other savings instruments"""
    __tablename__ = "savings_accounts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Account details
    account_name = Column(String(200), nullable=False)
    bank_name = Column(String(200))
    account_number = Column(String(100))  # Should be encrypted in production
    ifsc_code = Column(String(20))
    
    # Account type
    account_type = Column(String(50), nullable=False)
    # Types: "savings", "fd", "rd", "ppf", "mutual_fund", "nps", "other"
    
    # Balances
    current_balance = Column(Numeric(15, 2), default=0)
    opening_balance = Column(Numeric(15, 2), default=0)
    currency = Column(String(3), default="USD")
    
    # Interest calculation
    interest_rate = Column(Numeric(5, 2))  # Annual interest rate
    interest_frequency = Column(String(20))  # "monthly", "quarterly", "annual"
    interest_earned = Column(Numeric(15, 2), default=0)
    
    # For FD/RD specific fields
    deposit_amount = Column(Numeric(15, 2))  # For RD monthly deposit
    tenure_months = Column(Integer)
    maturity_date = Column(Date)
    maturity_amount = Column(Numeric(15, 2))
    auto_renew = Column(Boolean, default=False)
    
    # Goal linkage
    linked_goal_id = Column(UUID(as_uuid=True), ForeignKey("financial_goals.id"))
    
    # Status
    status = Column(String(20), default="active")
    # Statuses: "active", "matured", "closed", "broken"
    
    # Timestamps
    opening_date = Column(Date, nullable=False)
    closing_date = Column(Date)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    linked_goal = relationship("FinancialGoal", back_populates="linked_savings")
    transactions = relationship("SavingsTransaction", back_populates="account", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index('idx_savings_tenant_user', 'tenant_id', 'user_id'),
        Index('idx_savings_status', 'status'),
        Index('idx_savings_maturity', 'maturity_date'),
    )
```

### 4. Savings Transactions

```python
class SavingsTransaction(Base):
    """Track deposits and withdrawals in savings accounts"""
    __tablename__ = "savings_transactions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    savings_account_id = Column(UUID(as_uuid=True), ForeignKey("savings_accounts.id", ondelete="CASCADE"), nullable=False)
    
    transaction_type = Column(String(20), nullable=False)
    # Types: "deposit", "withdrawal", "interest", "fee", "transfer"
    
    amount = Column(Numeric(15, 2), nullable=False)
    transaction_date = Column(Date, nullable=False)
    balance_after = Column(Numeric(15, 2), nullable=False)
    
    description = Column(Text)
    reference_number = Column(String(100))
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    account = relationship("SavingsAccount", back_populates="transactions")
    
    # Indexes
    __table_args__ = (
        Index('idx_savings_txn_account', 'savings_account_id'),
        Index('idx_savings_txn_date', 'transaction_date'),
    )
```

### 5. Goal Milestones

```python
class GoalMilestone(Base):
    """Track milestones for goals (25%, 50%, 75%, 100%)"""
    __tablename__ = "goal_milestones"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    goal_id = Column(UUID(as_uuid=True), ForeignKey("financial_goals.id", ondelete="CASCADE"), nullable=False)
    
    milestone_name = Column(String(100), nullable=False)
    milestone_percentage = Column(Integer, nullable=False)  # 25, 50, 75, 100
    milestone_amount = Column(Numeric(15, 2), nullable=False)
    
    achieved = Column(Boolean, default=False)
    achieved_date = Column(Date)
    notified = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    goal = relationship("FinancialGoal", back_populates="milestones")
```

---

## API Endpoints

### Financial Goals API

```python
# backend/services/finance/main.py

@app.post("/goals", response_model=FinancialGoalResponse, status_code=201)
async def create_goal(
    goal: FinancialGoalCreate,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new financial goal
    
    Automatically creates milestones at 25%, 50%, 75%, 100%
    """
    user = get_current_user(request)
    
    new_goal = FinancialGoal(
        tenant_id=user.tenant_id,
        user_id=user.id,
        **goal.dict()
    )
    
    db.add(new_goal)
    await db.flush()
    
    # Create default milestones
    for percentage in [25, 50, 75, 100]:
        milestone = GoalMilestone(
            goal_id=new_goal.id,
            milestone_name=f"{percentage}% Complete",
            milestone_percentage=percentage,
            milestone_amount=new_goal.target_amount * (percentage / 100)
        )
        db.add(milestone)
    
    await db.commit()
    return new_goal


@app.get("/goals", response_model=List[FinancialGoalResponse])
async def get_goals(
    request: Request,
    status: Optional[str] = None,
    goal_type: Optional[str] = None,
    priority: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """List all financial goals with optional filters"""
    user = get_current_user(request)
    
    query = select(FinancialGoal).where(
        FinancialGoal.tenant_id == user.tenant_id,
        FinancialGoal.user_id == user.id
    )
    
    if status:
        query = query.where(FinancialGoal.status == status)
    if goal_type:
        query = query.where(FinancialGoal.goal_type == goal_type)
    if priority:
        query = query.where(FinancialGoal.priority == priority)
    
    result = await db.execute(query.order_by(FinancialGoal.created_at.desc()))
    goals = result.scalars().all()
    
    return [calculate_goal_with_progress(goal) for goal in goals]


@app.get("/goals/{goal_id}", response_model=FinancialGoalDetailResponse)
async def get_goal(
    goal_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Get detailed information about a specific goal"""
    user = get_current_user(request)
    
    result = await db.execute(
        select(FinancialGoal)
        .options(joinedload(FinancialGoal.contributions))
        .options(joinedload(FinancialGoal.milestones))
        .where(
            FinancialGoal.id == goal_id,
            FinancialGoal.tenant_id == user.tenant_id
        )
    )
    goal = result.scalar_one_or_none()
    
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    return calculate_goal_with_progress(goal)


@app.post("/goals/{goal_id}/contribute", response_model=GoalContributionResponse)
async def add_contribution(
    goal_id: str,
    contribution: GoalContributionCreate,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Add a contribution to a goal"""
    user = get_current_user(request)
    
    # Verify goal exists
    goal = await get_goal_or_404(goal_id, user.tenant_id, db)
    
    # Create contribution
    new_contribution = GoalContribution(
        goal_id=goal.id,
        **contribution.dict()
    )
    db.add(new_contribution)
    
    # Update goal current amount
    goal.current_amount += contribution.amount
    
    # Check milestones
    await check_and_notify_milestones(goal, db)
    
    # Check if goal is completed
    if goal.current_amount >= goal.target_amount:
        goal.status = "completed"
        goal.completed_date = date.today()
    
    await db.commit()
    return new_contribution


@app.get("/goals/{goal_id}/forecast", response_model=GoalForecast)
async def forecast_goal(
    goal_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Project goal completion based on current savings rate
    
    Returns:
    - Projected completion date
    - Required monthly contribution to meet deadline
    - Surplus/deficit analysis
    - Recommendations
    """
    user = get_current_user(request)
    goal = await get_goal_or_404(goal_id, user.tenant_id, db)
    
    forecast = calculate_goal_forecast(goal)
    return forecast
```

### Savings Accounts API

```python
@app.post("/savings", response_model=SavingsAccountResponse)
async def create_savings_account(
    account: SavingsAccountCreate,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Create a new savings account"""
    user = get_current_user(request)
    
    new_account = SavingsAccount(
        tenant_id=user.tenant_id,
        user_id=user.id,
        **account.dict()
    )
    
    # Calculate maturity for FD
    if account.account_type == "fd" and account.interest_rate and account.tenure_months:
        maturity_data = calculate_fd_maturity(
            account.opening_balance,
            account.interest_rate,
            account.tenure_months
        )
        new_account.maturity_amount = maturity_data['maturity_amount']
        new_account.maturity_date = account.opening_date + relativedelta(months=account.tenure_months)
    
    db.add(new_account)
    await db.commit()
    
    return new_account


@app.post("/savings/{account_id}/transaction", response_model=SavingsTransactionResponse)
async def record_savings_transaction(
    account_id: str,
    transaction: SavingsTransactionCreate,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Record a deposit or withdrawal"""
    user = get_current_user(request)
    account = await get_savings_account_or_404(account_id, user.tenant_id, db)
    
    # Calculate new balance
    if transaction.transaction_type == "deposit" or transaction.transaction_type == "interest":
        new_balance = account.current_balance + transaction.amount
    else:  # withdrawal or fee
        new_balance = account.current_balance - transaction.amount
        
        if new_balance < 0:
            raise HTTPException(status_code=400, detail="Insufficient balance")
    
    # Create transaction record
    new_transaction = SavingsTransaction(
        savings_account_id=account.id,
        balance_after=new_balance,
        **transaction.dict()
    )
    db.add(new_transaction)
    
    # Update account balance
    account.current_balance = new_balance
    
    # If linked to goal, update goal progress
    if account.linked_goal_id:
        await update_goal_from_savings(account.linked_goal_id, transaction.amount, db)
    
    await db.commit()
    return new_transaction
```

---

## Calculation Utilities

```python
# backend/services/finance/utils/goal_calculator.py

from datetime import date
from dateutil.relativedelta import relativedelta
from decimal import Decimal

def calculate_required_monthly_contribution(
    target_amount: Decimal,
    current_amount: Decimal,
    target_date: date,
    start_date: date = None
) -> Decimal:
    """Calculate monthly contribution needed to reach goal"""
    if start_date is None:
        start_date = date.today()
    
    months_remaining = (target_date.year - start_date.year) * 12 + \
                      (target_date.month - start_date.month)
    
    if months_remaining <= 0:
        return Decimal(0)
    
    remaining_amount = target_amount - current_amount
    monthly_contribution = remaining_amount / months_remaining
    
    return monthly_contribution.quantize(Decimal("0.01"))


def project_completion_date(
    target_amount: Decimal,
    current_amount: Decimal,
    monthly_contribution: Decimal,
    start_date: date = None
) -> Optional[date]:
    """Project when goal will be completed at current savings rate"""
    if start_date is None:
        start_date = date.today()
    
    if monthly_contribution <= 0:
        return None  # Will never complete
    
    remaining_amount = target_amount - current_amount
    months_needed = int((remaining_amount / monthly_contribution))
    
    completion_date = start_date + relativedelta(months=months_needed)
    return completion_date


def calculate_goal_progress(goal: FinancialGoal) -> dict:
    """Calculate detailed progress metrics for a goal"""
    progress_percentage = (goal.current_amount / goal.target_amount) * 100
    remaining_amount = goal.target_amount - goal.current_amount
    
    today = date.today()
    days_remaining = (goal.target_date - today).days
    months_remaining = max(0, days_remaining // 30)
    
    required_monthly = calculate_required_monthly_contribution(
        goal.target_amount,
        goal.current_amount,
        goal.target_date
    )
    
    # Determine if on track
    if goal.monthly_contribution and goal.monthly_contribution > 0:
        projected_completion = project_completion_date(
            goal.target_amount,
            goal.current_amount,
            goal.monthly_contribution
        )
        on_track = projected_completion <= goal.target_date if projected_completion else False
    else:
        on_track = False
    
    # Calculate velocity (actual savings rate)
    days_elapsed = (today - goal.start_date).days
    if days_elapsed > 0:
        daily_savings_rate = goal.current_amount / days_elapsed
        monthly_velocity = daily_savings_rate * 30
    else:
        monthly_velocity = Decimal(0)
    
    return {
        "progress_percentage": float(progress_percentage),
        "remaining_amount": float(remaining_amount),
        "days_remaining": days_remaining,
        "months_remaining": months_remaining,
        "required_monthly": float(required_monthly),
        "current_monthly": float(goal.monthly_contribution or 0),
        "on_track": on_track,
        "monthly_velocity": float(monthly_velocity),
        "surplus_deficit": float((goal.monthly_contribution or 0) - required_monthly)
    }


def calculate_fd_maturity(
    principal: Decimal,
    interest_rate: Decimal,
    tenure_months: int,
    compound_frequency: str = "quarterly"
) -> dict:
    """Calculate Fixed Deposit maturity amount"""
    # Convert annual rate to period rate
    frequency_map = {
        "monthly": 12,
        "quarterly": 4,
        "half-yearly": 2,
        "annually": 1
    }
    periods_per_year = frequency_map.get(compound_frequency, 4)
    
    period_rate = interest_rate / (100 * periods_per_year)
    total_periods = (tenure_months / 12) * periods_per_year
    
    # Compound interest formula: A = P(1 + r/n)^(nt)
    maturity_amount = principal * pow((1 + period_rate), total_periods)
    
    interest_earned = maturity_amount - principal
    effective_rate = ((maturity_amount / principal) - 1) * (12 / tenure_months) * 100
    
    return {
        "maturity_amount": float(maturity_amount.quantize(Decimal("0.01"))),
        "interest_earned": float(interest_earned.quantize(Decimal("0.01"))),
        "effective_rate": float(effective_rate)
    }
```

---

## Frontend Components

### Implementation Sections

See separate documentation files:
- [Frontend Components Reference](./GOALS_FRONTEND_COMPONENTS.md)
- [Goals Dashboard Implementation](./GOALS_DASHBOARD.md)
- [Savings Account UI](./SAVINGS_UI.md)

---

## Background Jobs (Celery Tasks)

```python
# backend/services/finance/tasks.py

from celery import shared_task

@shared_task
def process_goal_auto_contributions():
    """
    Process automatic goal contributions
    Runs daily at 2 AM
    """
    goals = FinancialGoal.query.filter(
        FinancialGoal.auto_contribute == True,
        FinancialGoal.status == 'active'
    ).all()
    
    today = date.today()
    
    for goal in goals:
        # Check if contribution is due
        if should_process_contribution(goal, today):
            contribution_amount = goal.monthly_contribution
            
            # Create contribution record
            create_contribution(
                goal_id=goal.id,
                amount=contribution_amount,
                source="auto",
                contribution_date=today
            )
            
            # Send notification
            send_contribution_notification(goal, contribution_amount)


@shared_task
def check_goal_milestones():
    """
    Check if any goals have reached milestones
    Runs every 6 hours
    """
    active_goals = FinancialGoal.query.filter(
        FinancialGoal.status == 'active'
    ).all()
    
    for goal in active_goals:
        progress = (goal.current_amount / goal.target_amount) * 100
        
        # Check each milestone
        milestones = GoalMilestone.query.filter(
            GoalMilestone.goal_id == goal.id,
            GoalMilestone.achieved == False,
            GoalMilestone.milestone_percentage <= progress
        ).all()
        
        for milestone in milestones:
            milestone.achieved = True
            milestone.achieved_date = date.today()
            
            if not milestone.notified:
                send_milestone_celebration(goal, milestone)
                milestone.notified = True


@shared_task
def calculate_savings_interest():
    """
    Calculate and credit interest for savings accounts
    Runs monthly on 1st day at 3 AM
    """
    accounts = SavingsAccount.query.filter(
        SavingsAccount.status == 'active',
        SavingsAccount.interest_rate > 0
    ).all()
    
    for account in accounts:
        # Calculate monthly interest
        monthly_rate = account.interest_rate / 12 / 100
        interest = account.current_balance * Decimal(str(monthly_rate))
        
        if interest > 0:
            # Create interest transaction
            create_savings_transaction(
                account_id=account.id,
                transaction_type="interest",
                amount=interest,
                description=f"Interest credited @ {account.interest_rate}% p.a."
            )
            
            account.current_balance += interest
            account.interest_earned += interest


@shared_task
def send_goal_reminders():
    """
    Send reminders for goals approaching target date
    Runs daily at 9 AM
    """
    today = date.today()
    reminder_threshold = today + timedelta(days=30)
    
    goals = FinancialGoal.query.filter(
        FinancialGoal.status == 'active',
        FinancialGoal.target_date <= reminder_threshold,
        FinancialGoal.target_date >= today
    ).all()
    
    for goal in goals:
        progress = calculate_goal_progress(goal)
        
        if not progress['on_track']:
            send_behind_schedule_alert(goal, progress)
        
        # Monthly progress update
        if today.day == 1:
            send_monthly_progress_report(goal, progress)


@shared_task
def check_fd_maturity():
    """
    Check for FDs maturing within 7 days
    Runs daily at 8 AM
    """
    today = date.today()
    maturity_alert_date = today + timedelta(days=7)
    
    accounts = SavingsAccount.query.filter(
        SavingsAccount.account_type == 'fd',
        SavingsAccount.status == 'active',
        SavingsAccount.maturity_date <= maturity_alert_date,
        SavingsAccount.maturity_date >= today
    ).all()
    
    for account in accounts:
        send_maturity_alert(account)
```

---

## Implementation Timeline

### Week 1-2: Backend Foundation
- [ ] Database migrations
- [ ] Model creation
- [ ] Basic CRUD endpoints
- [ ] Unit tests for calculations

### Week 3-4: Core Features
- [ ] Goal contribution logic
- [ ] Progress calculations
- [ ] Milestone tracking
- [ ] Savings account management

### Week 5-6: Frontend UI
- [ ] Goals dashboard
- [ ] Goal creation form
- [ ] Goal detail view with charts
- [ ] Savings account cards

### Week 7-8: Integration & Polish
- [ ] Background jobs setup
- [ ] Notification integration
- [ ] Analytics dashboard
- [ ] Testing & bug fixes

**Total Estimated Effort:** 6-8 weeks

---

## Testing Strategy

### Unit Tests
```python
def test_calculate_required_monthly_contribution():
    target = Decimal("50000")
    current = Decimal("10000")
    target_date = date.today() + relativedelta(months=12)
    
    required = calculate_required_monthly_contribution(target, current, target_date)
    
    assert required == Decimal("3333.33")


def test_fd_maturity_calculation():
    principal = Decimal("100000")
    rate = Decimal("7.5")
    tenure = 12
    
    result = calculate_fd_maturity(principal, rate, tenure, "quarterly")
    
    assert result['maturity_amount'] == Decimal("107763.36")
    assert result['interest_earned'] == Decimal("7763.36")
```

### Integration Tests
```python
async def test_create_goal_with_milestones(client, auth_headers):
    response = await client.post("/api/finance/goals", json={
        "name": "Emergency Fund",
        "goal_type": "emergency",
        "target_amount": 50000,
        "target_date": "2027-12-31",
        "start_date": "2026-01-01"
    }, headers=auth_headers)
    
    assert response.status_code == 201
    goal = response.json()
    assert goal['name'] == "Emergency Fund"
    
    # Check milestones created
    milestones = await client.get(f"/api/finance/goals/{goal['id']}/milestones")
    assert len(milestones.json()) == 4  # 25%, 50%, 75%, 100%
```

---

## Success Metrics

### User Engagement
- % of users who create at least 1 goal
- Average contributions per goal per month
- Goal completion rate
- Time to first contribution

### Feature Adoption
- Number of active goals per user
- Savings accounts linked to goals
- Auto-contribution adoption rate

### Business Impact
- User retention (users with goals vs without)
- Session duration increase
- Daily active users increase

**Target:** 40% of users create at least one goal within first month

---

## Future Enhancements

### Phase 2 Features
- Goal sharing (family/friends)
- Goal templates ("6-month emergency fund")
- Goal recommendations based on spending
- Gamification (badges, streaks)
- Social features (share progress)

### Advanced Features
- Goal dependencies ("Save for house, then furniture")
- What-if scenarios ("What if I save $500 more per month?")
- Investment linking (automatically allocate gains to goals)
- Tax-advantaged goals (401k, IRA)

---

**Status:** Ready for Development  
**Next Steps:** Create database migrations and start backend implementation
