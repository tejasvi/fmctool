import socket
import struct
from concurrent.futures import wait, Future, as_completed
from concurrent.futures.thread import ThreadPoolExecutor
from functools import partial
from itertools import chain
from random import randint
from sys import getsizeof
from typing import Callable, Dict, Mapping, Union

from fastapi import FastAPI
from fmcapi import FTDS2SVPNs, IKESettings, Endpoints, FMC, AdvancedSettings
from pydantic.typing import AnyCallable
from starlette.middleware.cors import CORSMiddleware

from app.constants import BULK_POST_BYTE_LIMIT


def delete_all_topologies(fmc: FMC, api_pool: ThreadPoolExecutor, p2p_only=False) -> None:
    """
    Parallelly delete all topologies unless :p2p_only: specified.

    :param fmc: FMC API object
    :param api_pool: Thread pool used for sending requests
    :param p2p_only: Delete only point-to-point topologies
    """
    topology_api = FTDS2SVPNs(fmc=fmc)
    topology_api_resp = topology_api.get()
    delete_tasks = []
    for topology in topology_api_resp['items']:
        if p2p_only and topology['topologyType'] != "POINT_TO_POINT":
            continue
        temp_topology_api = FTDS2SVPNs(fmc=fmc)
        temp_topology_api.id = topology['id']
        delete_tasks.append(temp_topology_api.delete)
    execute_parallel_tasks(delete_tasks, api_pool)


def recreate_test_p2p_topologies(fmc, api_pool, count=5):
    """
    Delete all existing topologies and create point-to-point topologies.

    :param fmc: FMC API object
    :param api_pool: Thread pool used for sending requests
    :param count: Number of P2P topologies created.
    """
    delete_all_topologies(fmc, api_pool)

    extranet_ips = get_random_ips(count)

    execute_parallel_tasks([partial(create_p2p_topology, fmc, extranet_ips.pop(), f"p2p-topology-{i:03d}") for i in range(count)],
                           api_pool)


def create_test_topology_advanced_settings(fmc, topology_api, advanced_settings_id):
    """
    Set specific advanced settings for the topology.

    :param fmc: FMC API object
    :param topology_api: Topology API object
    :param advanced_settings_id: Advanced settings object ID
    """
    advanced_settings = {
        "id": advanced_settings_id,
        "type": "AdvancedSettings",
        "advancedTunnelSetting": {
            "certificateMapSettings": {
                "useCertMapConfiguredInEndpointToDetermineTunnel": False,
                "useCertificateOuToDetermineTunnel": True,
                "useIkeIdentityOuToDetermineTunnel": True,
                "usePeerIpAddressToDetermineTunnel": True
            },
            "enableSpokeToSpokeConnectivityThroughHub": False,
            "natKeepaliveMessageTraversal": {
                "enabled": True,
                "intervalSeconds": [20, 40][randint(0, 1)]
            },
            "bypassAccessControlTrafficForDecryptedTraffic": False
        },
        "advancedIpsecSetting": {
            "maximumTransmissionUnitAging": {
                "enabled": False
            },
            "enableFragmentationBeforeEncryption": True
        },
        "advancedIkeSetting": {
            "ikeKeepaliveSettings": {
                "ikeKeepalive": "ENABLED",
                "threshold": 10,
                "retryInterval": 2
            },
            "enableAggressiveMode": False,
            "cookieChallenge": "CUSTOM",
            "identitySentToPeer": "AUTO_OR_DN",
            "peerIdentityValidation": "REQUIRED",
            "thresholdToChallengeIncomingCookies": 50,
            "percentageOfSAsAllowedInNegotiation": 100,
            "enableNotificationOnTunnelDisconnect": False
        }
    }
    advanced_settings_api = AdvancedSettings(fmc=fmc, **advanced_settings)
    advanced_settings_api.vpn_policy(vpn_id=topology_api.id)
    advanced_settings_api.put()


def create_p2p_topology(fmc, extranet_ip: str, topology_name: str) -> None:
    """
    Create point-to-point topology with device and extranet endpoints.

    :param fmc: FMC API object
    :param extranet_ip: IP of the extranet endpoint
    :param topology_name: Name of topology
    """
    topology_api = FTDS2SVPNs(fmc=fmc, name=topology_name, topologyType="POINT_TO_POINT")
    topology = topology_api.post()

    create_test_topology_advanced_settings(fmc, topology_api, topology["advancedSettings"]["id"])

    create_topology_ike_settings(fmc, topology_api)

    create_p2p_topology_endpoints(fmc, extranet_ip, topology_api)


def create_p2p_topology_endpoints(fmc: FMC, extranet_ip: str, topology_api: FTDS2SVPNs) -> None:
    """
    Create device and extranet endpoints

    :param fmc: FMC API object
    :param extranet_ip: IP of the extranet endpoint
    :param topology_api: Topology API object
    """
    protected_networks = {
        "networks": [{"name": "10P2PObj", "id": "0050568C-4A4E-0ed3-0000-021474838306", "type": "Network"}]}
    ftd = {"peerType": "PEER",
           "device": {"name": "10.10.8.2", "id": "07cfba2c-c2bf-11eb-9e85-c5bee801c0c9", "type": "Device"},
           "interface": {"name": "Outside", "id": "0050568C-4A4E-0ed3-0000-021474837881", "type": "PhysicalInterface"},
           "protectedNetworks": protected_networks}
    extranet = {"peerType": "PEER", "extranet": True,
                "extranetInfo": {"name": extranet_ip, "ipAddress": extranet_ip},
                "protectedNetworks": protected_networks}
    for device in (extranet, ftd):
        endpoints_api = Endpoints(fmc=fmc, **device)
        endpoints_api.vpn_policy(vpn_id=topology_api.id)
        endpoints_api.post()


def create_topology_ike_settings(fmc: FMC, topology_api: FTDS2SVPNs):
    ike_settings = {"authenticationType": "MANUAL_PRE_SHARED_KEY", "enforceHexBasedPreSharedKeyOnly": False,
                    "manualPreSharedKey": ["Cisco@123-Collab", "Cisco@123-Switching"][randint(0, 1)], "policies": [
            {"name": "DES-SHA-SHA-LATEST", "id": "0050568C-4A4E-0ed3-0000-000000000404", "type": "IKEv2Policy"}]}

    ike_settings_api = IKESettings(fmc=fmc, ikeV2Settings=ike_settings,
                                   id=getattr(topology_api, "ikeSettings")["id"])
    ike_settings_api.vpn_policy(vpn_id=topology_api.id)
    ike_settings_api.put()


def get_random_ips(count: int) -> set[str]:
    """
    Create set of random IPs (0.0.0.0 - 255.255.255.255)
    :param count: Number of IPs
    :return: IP set
    """
    random_ips: set[str] = set()
    for _ in range(count):
        while True:
            random_number = randint(1, 0xffffffff)
            random_ip = socket.inet_ntoa(struct.pack('>I', random_number))
            if random_ip not in random_ips:
                break
        random_ips.add(random_ip)
    return random_ips


def enable_cors(app: FastAPI) -> None:
    """
    Enable CORS for specific origins (clients).

    :param app: Main FastAPI _app_
    """
    origins = [
        "http://localhost:3000",
        "localhost:3000",
        "http://127.0.0.1:3000",
        "127.0.0.1:3000",
        "https://spectrum-stages-hills-galaxy.trycloudflare.com",
        "spectrum-stages-hills-galaxy.trycloudflare.com",
        "https://technique-programming-try-registered.trycloudflare.com",
        "technique-programming-try-registered.trycloudflare.com",
        "https://scale-cos-carries-rpm.trycloudflare.com",
        "scale-cos-carries-rpm.trycloudflare.com"
    ]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


def execute_parallel_tasks(task_list: list[Callable], api_pool: ThreadPoolExecutor) -> None:
    """
    Excute list of tasks in parallel and return on completion.

    :param task_list: List of tasks (callables/functions/lambdas)
    :param api_pool: Thread pool
    :return:
    """
    wait([api_pool.submit(task) for task in task_list])


def patch_dict(dict_item: dict, patch: dict) -> None:
    """
    Update a nested dictionary based on values in overriding dictionary.

    :param dict_item: Dictionary to be updated
    :param patch: Overriding dictionary
    """
    override_queue = [(patch, dict_item)]
    while override_queue:
        patch, orig = override_queue.pop()
        for key, value in patch.items():
            if isinstance(value, dict):
                override_queue.append((value, orig[key]))
            elif value is not None:
                orig[key] = value


def get_task_callback_setup(executor: ThreadPoolExecutor) -> tuple[Callable, Callable[[], None]]:
    """
    - Create a task submitter closure which runs the task in thread-pool and associates it with optional callback.
    - Create a trigger function to run the callback after each task finishes.

    :param executor:
    :return: Task submitter and trigger for callbacks.
    """
    future_to_callback: dict[Future, AnyCallable] = {}

    def submit_task(task, *args, callback=lambda _: None, **kwargs):
        future_to_callback[executor.submit(task, *args, **kwargs)] = callback

    def run_callbacks():
        for future in as_completed(future_to_callback):
            future_function = future_to_callback[future]
            future_function(future.result())

    return submit_task, run_callbacks


def get_post_data_chunks(data: list[dict]) -> list[dict]:
    """
    Generator function to split list of items into smaller lists to stay under limit.
    :param data:
    :return:
    """
    while data:
        chunk = []
        while data and getsizeof(chunk) < BULK_POST_BYTE_LIMIT:
            chunk.append(data.pop())
        yield chunk


def get_dict_diff(dicts: list[dict], ignored_keys: set[str]) -> Dict:
    assert dicts
    res = {}
    for key in dicts[0]:
        if key in ignored_keys:
            continue
        values = [dict_item[key] for dict_item in dicts]
        if isinstance(values[0], Mapping):
            conflict = get_dict_diff(values, ignored_keys) or None
        elif isinstance(values[0], list):
            conflict = get_list_value_conflict(values)
        else:
            conflict = set(values)
            if len(conflict) == 1:
                conflict = None
        if conflict is not None:
            res[key] = conflict
    return res


def get_list_value_conflict(values: list) -> Union[None, list[list]]:
    union_list = []
    for i in chain.from_iterable(values):
        if i not in union_list:
            union_list.append(i)
    conflict = None if union_list == values[0] else [union_list]
    return conflict
