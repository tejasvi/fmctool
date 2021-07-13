from fastapi import Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer

from app.api import sessions
from app.fmc_session import FMCSession

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


def get_session(token: str = Depends(oauth2_scheme)):
    if token not in sessions:
        raise HTTPException(status_code=401, detail="X-Token header invalid")
    return sessions[token]


def domain_param(domain_id: str = Query(...), fmc_session: FMCSession = Depends(get_session)):
    fmc_session.set_domain(domain_id)
    return fmc_session


def device_domain_param(device_id: str = Query(...), fmc_session: FMCSession = Depends(domain_param)) -> FMCSession:
    fmc_session.set_device_id(device_id)
    return fmc_session
