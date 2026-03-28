"""
Tests for the EMI service.

Unit tests:
- calculate_emi  – reducing balance method
- calculate_emi  – flat rate method

Endpoint tests:
- POST /emis               – create EMI
- GET  /emis               – list EMIs
- GET  /emis/{id}/schedule – payment schedule
"""

import pytest
from decimal import Decimal


# ── Unit tests: EMI calculation ──────────────────────────────────────────

def test_calculate_emi_reducing_balance():
    """
    Reducing-balance EMI for a ₹/$ 100 000 loan at 12 % p.a. for 12 months.

    Formula: EMI = P × r × (1+r)^n / ((1+r)^n – 1)
    with r = 12% / 12 = 1% = 0.01, n = 12
    Expected ≈ 8884.88
    """
    from services.emi.main import calculate_emi

    emi = calculate_emi(
        principal=Decimal("100000"),
        annual_rate=Decimal("12"),
        months=12,
        interest_type="reducing",
    )
    assert emi == Decimal("8884.88")


def test_calculate_emi_flat_rate():
    """
    Flat-rate EMI for a 100 000 loan at 12 % p.a. for 12 months.

    Total interest  = 100 000 × 0.12 × 1  = 12 000
    Total repayment = 112 000
    Monthly EMI     = 112 000 / 12 ≈ 9333.33
    """
    from services.emi.main import calculate_emi

    emi = calculate_emi(
        principal=Decimal("100000"),
        annual_rate=Decimal("12"),
        months=12,
        interest_type="flat",
    )
    assert emi == Decimal("9333.33")


def test_calculate_emi_zero_interest():
    """With 0 % interest the EMI is simply principal / months."""
    from services.emi.main import calculate_emi

    emi = calculate_emi(
        principal=Decimal("12000"),
        annual_rate=Decimal("0"),
        months=12,
        interest_type="reducing",
    )
    assert emi == Decimal("1000")


# ── Endpoint tests ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_emi(emi_client, auth_headers):
    """POST /emis with valid data should return the new EMI."""
    response = await emi_client.post(
        "/emis",
        json={
            "loan_type": "personal",
            "lender_name": "Test Bank",
            "principal_amount": 100000,
            "interest_rate": 12,
            "tenure_months": 12,
            "start_date": "2024-01-01",
        },
        headers=auth_headers,
    )
    assert response.status_code == 200

    data = response.json()
    assert data["loan_type"] == "personal"
    assert data["lender_name"] == "Test Bank"
    assert data["principal_amount"] == 100000
    assert data["tenure_months"] == 12
    assert data["monthly_emi"] > 0
    assert data["status"] == "active"
    assert data["total_amount"] > data["principal_amount"]


@pytest.mark.asyncio
async def test_list_emis(emi_client, auth_headers):
    """After creating an EMI, GET /emis should include it."""
    # Create
    create_resp = await emi_client.post(
        "/emis",
        json={
            "loan_type": "home",
            "lender_name": "Home Bank",
            "principal_amount": 500000,
            "interest_rate": 8.5,
            "tenure_months": 60,
            "start_date": "2024-06-01",
        },
        headers=auth_headers,
    )
    created_id = create_resp.json()["id"]

    # List
    response = await emi_client.get("/emis", headers=auth_headers)
    assert response.status_code == 200

    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1

    ids = [e["id"] for e in data]
    assert created_id in ids


@pytest.mark.asyncio
async def test_get_emi_schedule(emi_client, auth_headers):
    """
    GET /emis/{id}/schedule should return one entry per tenure month,
    ordered by installment number.
    """
    # Create a 12-month EMI
    create_resp = await emi_client.post(
        "/emis",
        json={
            "loan_type": "personal",
            "lender_name": "Schedule Bank",
            "principal_amount": 60000,
            "interest_rate": 10,
            "tenure_months": 12,
            "start_date": "2024-03-01",
        },
        headers=auth_headers,
    )
    emi_id = create_resp.json()["id"]

    # Fetch schedule
    response = await emi_client.get(
        f"/emis/{emi_id}/schedule",
        headers=auth_headers,
    )
    assert response.status_code == 200

    schedule = response.json()
    assert len(schedule) == 12
    assert schedule[0]["installment_number"] == 1
    assert schedule[-1]["installment_number"] == 12

    # Every entry should have positive amounts
    for entry in schedule:
        assert entry["amount"] > 0
        assert entry["principal_component"] > 0
        assert entry["interest_component"] >= 0
        assert entry["status"] == "pending"
