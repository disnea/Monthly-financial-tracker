"""
Tests for the Finance service – Expense endpoints.

Endpoints tested:
- POST   /expenses           – create expense
- GET    /expenses           – list expenses
- PUT    /expenses/{id}      – update expense
- DELETE /expenses/{id}      – delete expense
- POST   /expenses           – missing required fields → 422
"""

import pytest


# ── POST /expenses ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_expense(finance_client, auth_headers):
    """Creating an expense with valid data should return 200 and the expense."""
    response = await finance_client.post(
        "/expenses",
        json={
            "amount": 42.50,
            "currency": "USD",
            "description": "Test lunch",
            "transaction_date": "2024-01-15",
            "payment_method": "credit_card",
        },
        headers=auth_headers,
    )
    assert response.status_code == 200

    data = response.json()
    assert data["amount"] == 42.50
    assert data["currency"] == "USD"
    assert data["description"] == "Test lunch"
    assert data["transaction_date"] == "2024-01-15"
    assert data["payment_method"] == "credit_card"
    assert "id" in data
    assert "created_at" in data


# ── GET /expenses ────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_expenses(finance_client, auth_headers):
    """Listing expenses should include previously created items."""
    # Create two expenses first
    await finance_client.post(
        "/expenses",
        json={
            "amount": 10.00,
            "currency": "USD",
            "description": "Coffee",
            "transaction_date": "2024-02-01",
        },
        headers=auth_headers,
    )
    await finance_client.post(
        "/expenses",
        json={
            "amount": 25.00,
            "currency": "USD",
            "description": "Books",
            "transaction_date": "2024-02-02",
        },
        headers=auth_headers,
    )

    response = await finance_client.get("/expenses", headers=auth_headers)
    assert response.status_code == 200

    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 2

    descriptions = [e["description"] for e in data]
    assert "Coffee" in descriptions
    assert "Books" in descriptions


# ── PUT /expenses/{id} ───────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_update_expense(finance_client, auth_headers):
    """Updating an expense should reflect the new values."""
    # Create
    create_resp = await finance_client.post(
        "/expenses",
        json={
            "amount": 30.00,
            "currency": "USD",
            "description": "Original item",
            "transaction_date": "2024-03-01",
        },
        headers=auth_headers,
    )
    expense_id = create_resp.json()["id"]

    # Update
    response = await finance_client.put(
        f"/expenses/{expense_id}",
        json={
            "amount": 45.00,
            "currency": "USD",
            "description": "Updated item",
            "transaction_date": "2024-03-02",
        },
        headers=auth_headers,
    )
    assert response.status_code == 200

    data = response.json()
    assert data["amount"] == 45.00
    assert data["description"] == "Updated item"
    assert data["transaction_date"] == "2024-03-02"


# ── DELETE /expenses/{id} ────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_delete_expense(finance_client, auth_headers):
    """Deleting an expense should return a success message."""
    # Create
    create_resp = await finance_client.post(
        "/expenses",
        json={
            "amount": 15.00,
            "currency": "USD",
            "description": "Disposable",
            "transaction_date": "2024-04-01",
        },
        headers=auth_headers,
    )
    expense_id = create_resp.json()["id"]

    # Delete
    response = await finance_client.delete(
        f"/expenses/{expense_id}",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Expense deleted successfully"

    # Verify it's gone from the list
    list_resp = await finance_client.get("/expenses", headers=auth_headers)
    remaining_ids = [e["id"] for e in list_resp.json()]
    assert expense_id not in remaining_ids


# ── Validation: missing required fields ──────────────────────────────────

@pytest.mark.asyncio
async def test_create_expense_missing_fields(finance_client, auth_headers):
    """Omitting required fields (amount, transaction_date) should return 422."""
    response = await finance_client.post(
        "/expenses",
        json={
            "description": "Missing amount and date",
        },
        headers=auth_headers,
    )
    assert response.status_code == 422
