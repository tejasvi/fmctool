from secrets import token_urlsafe
from typing import Any, Optional, List, Union, Dict

from fastapi import FastAPI, Body, HTTPException, Query
from fastapi.param_functions import Depends
from fmcapi.fmc import AuthenticationError
from requests.exceptions import ConnectionError
from sse_starlette.sse import EventSourceResponse

from app.dependencies import get_session, domain_param, device_domain_param
from app.fmc_session import FMCSession
from app.models import Creds, LoginResponse
from app.utils import enable_cors, get_login_response, yield_when_task_done

app = FastAPI()
sessions = {}

enable_cors(app)


@app.post("/token", response_model=LoginResponse)
def login(creds: Creds = Depends()) -> dict[str, Union[str, dict[str, str]]]:
    try:
        return get_login_response(creds)
    except ConnectionError:
        raise HTTPException(status_code=404, detail="Could not establish connection to FMC")
    except AuthenticationError:
        raise HTTPException(status_code=403, detail="Invalid credentials")


@app.get("/domains", response_model=Dict[str, str])
def get_domains(fmc_session: FMCSession = Depends(get_session)) -> dict[str, str]:
    return fmc_session.domains


@app.get("/devices")
def get_devices(fmc_session: FMCSession = Depends(domain_param)) -> Any:
    return fmc_session.get_registered_devices()


@app.get("/topologies", response_model=List[dict[str, Any]])
def get_topologies(device_id: str = Query(...), fmc_session: FMCSession = Depends(device_domain_param)) -> list[dict]:
    return fmc_session.p2p_topologies[device_id]


@app.post("/conflicts")
def get_conflicts(fmc_session: FMCSession = Depends(device_domain_param),
                  topology_ids: list[str] = Body(..., embed=True)) -> dict[str, Any]:
    return fmc_session.get_topology_conflicts(topology_ids)


@app.post("/hns-topologies", response_model=List[dict])
def create_hns_topologies(fmc_session: FMCSession = Depends(device_domain_param),
                          override: Optional[dict[str, Any]] = Body(None),
                          p2p_topology_ids: list[str] = Body(..., embed=True)) -> list[dict]:
    return [fmc_session.create_hns_topology("HNS-" + token_urlsafe(2), p2p_topology_ids, override or {})]


@app.post("/deploy")
def deploy(fmc_session: FMCSession = Depends(domain_param)):
    fmc_session.deploy()


@app.get("/status")
async def respond_when_ready(task: str = Query(...), token: str = Query(...)) -> EventSourceResponse:
    try:
        fmc_session = sessions[token]
    except KeyError:
        raise HTTPException(status_code=401, detail="Token SHA-256 hash invalid")
    ready_event_generator = yield_when_task_done(task, fmc_session)
    return EventSourceResponse(ready_event_generator)

# app.mount("/static", StaticFiles(directory="../build", html=True), name="home")
