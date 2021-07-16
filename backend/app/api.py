from secrets import token_urlsafe
from typing import Any, Optional, List, Union, Dict

from fastapi import FastAPI, Body, HTTPException, Query
from fastapi.param_functions import Depends
from fastapi.security import OAuth2PasswordRequestForm
from fmcapi.fmc import AuthenticationError
from requests.exceptions import ConnectionError
from sse_starlette.sse import EventSourceResponse

from app.api_utils import get_session, domain_dependency, device_domain_dependency, sessions, get_login_response, \
    yield_when_task_done
from app.fmc_session import FMCSession
from app.models import LoginResponse
from app.utils import enable_cors

app = FastAPI(title="FMC topology merge tool", description="Merge point-to-point topologies into a new or existing hub-and-spoke topology")

enable_cors(app)


@app.post("/token", response_model=LoginResponse)
def login(creds: OAuth2PasswordRequestForm = Depends()) -> dict[str, Union[str, dict[str, str]]]:
    """
    Login to FMC and get OAuth2 token for subsequent communication.

    :param creds: Username is _$FMC_HOST$SINGLE_SPACE$FMC_USERNAME_. E.g. `10.10.8.2 admin`. Password is FMC password.
    :return: OAuth2 token
    """
    try:
        return get_login_response(creds)
    except ConnectionError:
        raise HTTPException(status_code=404, detail="Could not establish connection to FMC")
    except AuthenticationError:
        raise HTTPException(status_code=403, detail="Invalid credentials")


@app.get("/domains", response_model=Dict[str, str])
def get_domains(fmc_session: FMCSession = Depends(get_session)) -> dict[str, str]:
    """
    Get list of domain ID, name pairs.

    :param fmc_session:
    :return:
    """
    return fmc_session.domains


@app.get("/devices")
def get_devices(fmc_session: FMCSession = Depends(domain_dependency)) -> Any:
    """
    Get list of devices registered on FMC.

    :param fmc_session:
    :return: List of device objects
    """
    return fmc_session.get_registered_devices()


@app.get("/hns-topologies", response_model=List[dict[str, Any]])
def get_topologies(fmc_session: FMCSession = Depends(domain_dependency)) -> list[
    dict]:
    """
    Get list of all Hub and Spoke topologies.

    :param fmc_session:
    :return: List of HNS topology objects
    """
    fmc_session.fetch_topologies()
    return fmc_session.hns_topologies


@app.get("/hns-p2p-topologies", response_model=List[dict[str, Any]])
def get_topologies(hns_topology_id: str, fmc_session: FMCSession = Depends(domain_dependency)) -> \
list[dict]:
    """
    Get list of point-to-point topologies which can be merged into specified hub-and-spoke topology.

    :param hns_topology_id: ID of an existing topology to merge with the point-to-point topologies
    :param fmc_session:
    :return: List of point-to-point topology objects
    """
    fmc_session.set_hns_topology_id(hns_topology_id)
    return fmc_session.hns_p2p_topologies


@app.get("/p2p-topologies", response_model=List[dict[str, Any]])
def get_topologies(device_id: str = Query(...), fmc_session: FMCSession = Depends(device_domain_dependency)) -> list[
    dict]:
    """
    Get point-to-point topologies having specific device as one thier endpoint.

    :param device_id: The device ID of the endpoint.
    :param fmc_session:
    :return: The list of point-to-point topology objects
    """
    return fmc_session.p2p_topologies[device_id]


@app.post("/conflicts")
def get_conflicts(fmc_session: FMCSession = Depends(domain_dependency),
                  topology_ids: list[str] = Body(..., embed=True)) -> dict[str, Any]:
    """
    Get topology conflicts for a set of point-to-point topologies to be merged.

    :param fmc_session:
    :param topology_ids: List of topologies to be merged
    :return: Conflicts for each merged topology (currently single merged topology returned)
    """
    return fmc_session.get_topology_conflicts(topology_ids)


@app.post("/hns-topology", response_model=List[dict])
def create_hns_topologies(fmc_session: FMCSession = Depends(domain_dependency),
                          override: Optional[dict[str, Any]] = Body(None),
                          hns_topology_id: Optional[str] = Body(None),
                          p2p_topology_ids: list[str] = Body(..., embed=True)) -> list[dict]:
    """
    Create merged topology with specified parameters overriden (obtained after resolving conflicts).

    :param fmc_session:
    :param override: The subtree object whose _leaf_ values override the default values in case of conflicts
    :param hns_topology_id: The id of hub and spoke topology if merging into and existing topology
    :param p2p_topology_ids: List of point-to-point topologies to merge
    :return: Merged topology objects
    """
    return [fmc_session.create_hns_topology("HNS-" + token_urlsafe(2), p2p_topology_ids, override or {}, hns_topology_id)]


@app.post("/deploy")
def deploy(fmc_session: FMCSession = Depends(domain_dependency)):
    """
    Deploy the created topology to the device after deleting the existing point-to-point topologies.

    :param fmc_session:
    """
    fmc_session.deploy()


@app.get("/status")
async def respond_when_ready(task: str = Query(...), token: str = Query(...)) -> EventSourceResponse:
    """
    Listen for [Server sent event](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events) "ready"
        when a specific _task_ finishes. Useful for tasks which take longer than hard timeout limit of HTTP request imposed by browsers.

    :param task: Task name (e.g. "topologies")
    :param token: The OAuth2 token issued during login
    :return: Event stream listend by SSE listener on client side
    """
    try:
        fmc_session = sessions[token]
    except KeyError:
        raise HTTPException(status_code=401, detail="Token SHA-256 hash invalid")
    ready_event_generator = yield_when_task_done(task, fmc_session)
    return EventSourceResponse(ready_event_generator)

# app.mount("/static", StaticFiles(directory="../build", html=True), name="home")
