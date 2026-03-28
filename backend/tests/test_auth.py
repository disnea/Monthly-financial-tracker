"""
Tests for the Auth service.

Endpoints tested:
- POST /register  – successful registration
- POST /login     – successful login
- POST /login     – wrong password → 401
- GET  /me        – returns current user
- GET  /me        – missing token → 401
"""

import pytest


# ── POST /register ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_register_success(auth_client):
    """Registering a new user should return a token and user details."""
    response = await auth_client.post(
        "/register",
        json={
            "email": "newuser@test.com",
            "password": "strongPassword123!",
            "full_name": "Test User",
            "tenant_name": "Test Company",
        },
    )
    assert response.status_code == 200

    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "newuser@test.com"
    assert data["user"]["full_name"] == "Test User"
    assert "id" in data["user"]
    assert "tenant_id" in data["user"]


# ── POST /login ──────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_login_success(auth_client):
    """After registration, logging in with the same credentials should succeed."""
    # 1. Register first
    await auth_client.post(
        "/register",
        json={
            "email": "loginuser@test.com",
            "password": "myPassword456!",
            "full_name": "Login User",
            "tenant_name": "Login Tenant",
        },
    )

    # 2. Login
    response = await auth_client.post(
        "/login",
        json={
            "email": "loginuser@test.com",
            "password": "myPassword456!",
        },
    )
    assert response.status_code == 200

    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "loginuser@test.com"


@pytest.mark.asyncio
async def test_login_wrong_password(auth_client):
    """Providing an incorrect password should return 401."""
    # 1. Register
    await auth_client.post(
        "/register",
        json={
            "email": "wrongpass@test.com",
            "password": "correctPassword",
            "full_name": "Wrong Pass User",
            "tenant_name": "WP Tenant",
        },
    )

    # 2. Login with wrong password
    response = await auth_client.post(
        "/login",
        json={
            "email": "wrongpass@test.com",
            "password": "totallyWrong",
        },
    )
    assert response.status_code == 401
    assert "incorrect" in response.json()["detail"].lower()


# ── GET /me ──────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_me_authenticated(auth_client):
    """GET /me with a valid token should return the current user."""
    # Register to get a real token backed by a DB user
    reg = await auth_client.post(
        "/register",
        json={
            "email": "meuser@test.com",
            "password": "securePass789!",
            "full_name": "Me User",
            "tenant_name": "Me Tenant",
        },
    )
    token = reg.json()["access_token"]

    response = await auth_client.get(
        "/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200

    data = response.json()
    assert data["email"] == "meuser@test.com"
    assert data["full_name"] == "Me User"
    assert data["role"] in ("admin", "member")


@pytest.mark.asyncio
async def test_get_me_unauthenticated(auth_client):
    """GET /me without an Authorization header should return 401."""
    response = await auth_client.get("/me")
    assert response.status_code == 401
