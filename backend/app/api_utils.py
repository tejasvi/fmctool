from concurrent.futures import wait
from secrets import token_urlsafe
from typing import Union

from fastapi import Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer

from app.fmc_session import FMCSession
from app.utils import recreate_p2p_topologies

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

sessions = {}


def get_session(token: str = Depends(oauth2_scheme)):
    if token not in sessions:
        raise HTTPException(status_code=401, detail="X-Token header invalid")
    return sessions[token]


def domain_dependency(domain_id: str = Query(...), fmc_session: FMCSession = Depends(get_session)):
    fmc_session.set_domain(domain_id)
    return fmc_session


def device_domain_dependency(device_id: str = Query(...), fmc_session: FMCSession = Depends(domain_dependency)) -> FMCSession:
    fmc_session.set_hub_device_id(device_id)
    return fmc_session


def get_login_response(creds) -> dict[str, Union[str, list]]:
    fmc_session = FMCSession(creds)
    recreate_p2p_topologies(fmc_session.fmc, fmc_session.api_pool, 5)
    token = token_urlsafe(32)
    sessions[token] = fmc_session
    return {"access_token": token, "token_type": "bearer", "domains": fmc_session.domains}


def yield_when_task_done(task: str, fmc_session: FMCSession) -> dict[str, str]:
    wait(fmc_session.pending_futures[task])
    fmc_session.pending_futures.pop(task)
    yield {"event": "ready", "data": ""}