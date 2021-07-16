from concurrent.futures import wait
from secrets import token_urlsafe
from typing import Union

from fastapi import Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer

from app.fmc_session import FMCSession
from recreate import recreate_test_topologies

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

sessions = {}


def get_session(token: str = Depends(oauth2_scheme)):
    """
    Used to ensure the token validity. Gets the FMC session associated by the token.

    :param token: OAuth2 token
    :return: FMC session
    """
    if token not in sessions:
        raise HTTPException(status_code=401, detail="X-Token header invalid")
    return sessions[token]


def domain_dependency(domain_id: str = Query(...), fmc_session: FMCSession = Depends(get_session)):
    """
    Used to ensure domain ID is provided and depends on auth dependency.

    :param domain_id: FMC domain ID
    :param fmc_session:
    :return: FMC session
    """
    fmc_session.set_domain(domain_id)
    return fmc_session


def device_domain_dependency(device_id: str = Query(...), fmc_session: FMCSession = Depends(domain_dependency)) -> FMCSession:
    """
    Used to ensure device ID is provided. Depends on domain ID and auth dependency.

    :param device_id: FMC device ID
    :param fmc_session:
    :return: FMC session
    """
    fmc_session.set_hub_device_id(device_id)
    return fmc_session


def get_login_response(creds) -> dict[str, Union[str, list]]:
    """
    Returns the OAuth2 access token

    :param creds:
    :return: OAuth2 token in `access_token` field
    """
    fmc_session = FMCSession(creds)
    # recreate_test_p2p_topologies(fmc_session.fmc, fmc_session.api_pool, 5)
    token = token_urlsafe(32)
    sessions[token] = fmc_session
    return {"access_token": token, "token_type": "bearer", "domains": fmc_session.domains}


def yield_when_task_done(task: str, fmc_session: FMCSession) -> dict[str, str]:
    """
    Generator function which yields a "ready" [Server sent event](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events) when the specified task (e.g. "topologies") finish.

    :param task: Task name
    :param fmc_session:
    :return: Object used for SSE on client side
    """
    wait(fmc_session.pending_futures[task])
    fmc_session.pending_futures.pop(task)
    yield {"event": "ready", "data": ""}
