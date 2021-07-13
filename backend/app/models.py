from typing import Optional

from fastapi import Form
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel


class Creds(OAuth2PasswordRequestForm):
    host: str

    def __init__(
            self,
            grant_type: str = Form(None, regex="password"),
            username: str = Form(...),
            password: str = Form(...),
            scope: str = Form(..., description="FMC host address"),
            client_id: Optional[str] = Form(None),
            client_secret: Optional[str] = Form(None),
    ):
        self.host = scope
        super().__init__(
            grant_type=grant_type,
            username=username,
            password=password,
            scope=scope,
            client_id=client_id,
            client_secret=client_secret,
        )


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    domains: dict[str, str]
