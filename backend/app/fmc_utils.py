from collections import defaultdict
from concurrent.futures import Future
from concurrent.futures import as_completed
from concurrent.futures._base import wait
from concurrent.futures.thread import ThreadPoolExecutor
from copy import deepcopy
from functools import partial
from typing import Any, Callable

from fmcapi import FTDS2SVPNs, IKESettings, Endpoints, FMC
from requests.models import PreparedRequest

from app.utils import execute_parallel_tasks, patch_dict, get_post_data_chunks


def delete_p2p_topology_ids(p2p_topology_ids: list[str], fmc: FMC, api_pool: ThreadPoolExecutor) -> None:
    delete_tasks = []
    for topology_id in p2p_topology_ids:
        temp_topology_api = FTDS2SVPNs(fmc=fmc)
        temp_topology_api.id = topology_id
        delete_tasks.append(temp_topology_api.delete)
    execute_parallel_tasks(delete_tasks, api_pool)


def get_topologies_from_ids(p2p_topologies: dict[str, list[dict]], device_id: str, topology_ids: list[str],
                            hns_p2p_topologies: list[dict]) -> list[
    dict]:
    tid_set = set(topology_ids)
    if device_id is None:
        topologies = [topology for topology in hns_p2p_topologies if topology["id"] in tid_set]
    else:
        topologies = [topology for topology in p2p_topologies[device_id] if topology["id"] in tid_set]
    return topologies


def fetch_topology_settings(fmc: FMC, topology: dict, key_name: str, policy_service) -> list[dict]:
    if "links" not in topology[key_name]:
        return topology[key_name]
    settings = policy_service(fmc=fmc)
    settings.vpn_policy(vpn_id=topology["id"])
    response = settings.get()["items"]
    return response


def get_topology_ike_settings(fmc: FMC, topology: dict) -> dict:
    response = fetch_topology_settings(fmc, topology, "ikeSettings", IKESettings)
    assert len(response) == 1
    return response[0]


def get_topology_endpoints(fmc: FMC, topology: dict) -> list[dict]:
    return fetch_topology_settings(fmc, topology, "endpoints", Endpoints)


def get_topology_post_request_params(topology_config):
    topology_params = {k: v for k, v in topology_config.items() if
                       k not in {"metadata", "ipsecSettings", "advancedSettings", "links", "ikeSettings",
                                 "endpoints"}}
    return topology_params


def get_base_hns_topology(p2p_topologies: dict[str, list[dict]], hub_device_id: str, override: dict,
                          topology_name: str, hns_topology_id: str, hns_topologies: list[dict]) -> dict:
    if hns_topology_id is None:
        base_topology: dict = deepcopy(p2p_topologies[hub_device_id][0])
        base_topology["name"] = topology_name
        base_topology.pop("id")
        base_topology["topologyType"] = "HUB_AND_SPOKE"
    else:
        for topology in hns_topologies:
            if topology["id"] == hns_topology_id:
                base_topology: dict = deepcopy(topology)
                break
    patch_dict(base_topology, override)
    return base_topology


def get_topology_api(topology_config: dict, fmc: FMC) -> FTDS2SVPNs:
    topology_params = get_topology_post_request_params(topology_config)
    topology_api = FTDS2SVPNs(fmc=fmc, **topology_params)
    topology_api.post()
    return topology_api


def get_ike_settings(fmc: FMC, hns_topology_id: str, topology_config: dict) -> dict:
    ike_settings: dict[str, Any] = topology_config["ikeSettings"]
    ike_settings_api = IKESettings(fmc=fmc, **ike_settings)
    ike_settings_api.vpn_policy(vpn_id=hns_topology_id)
    created_ike_settings = ike_settings_api.post()
    return created_ike_settings


def post_topology_settings(fmc: FMC, topology_id: str, topology_config: dict, key_name: str,
                           policy_service) -> None:
    settings_api = policy_service(fmc=fmc, **topology_config[key_name])
    settings_api.vpn_policy(vpn_id=topology_id)
    settings_api.post()


def get_hns_endpoint_data_from_p2p(p2p_topologies: dict[str, list[dict]], hub_device_id: str, fmc: FMC,
                                   hns_topology_id: str,
                                   p2p_topology_ids: list[str], hns_p2p_topologies: list[dict], hns_topologies: list[dict]) -> list[dict]:
    is_hub_device_created = False
    p2p_topology_ids_set = set(p2p_topology_ids)
    endpoints_data = []
    existing_hns_hub_device_ids = set()
    if hns_topology_id is None:
        topology_list = p2p_topologies[hub_device_id]
    else:
        for topology in hns_topologies:
            if topology["id"] == hns_topology_id:
                existing_hns_hub_device_ids = {endpoint['device']['id'] for endpoint in topology["endpoints"]
                                        if endpoint["peerType"] == 'HUB' and not endpoint['extranet']}
                break
        topology_list = hns_p2p_topologies
    for topology in topology_list:
        if topology["id"] in p2p_topology_ids_set:
            for p2p_endpoint in topology["endpoints"]:
                hns_endpoint = deepcopy(p2p_endpoint)
                if hns_topology_id is not None and not hns_endpoint["extranet"] and hns_endpoint["device"]["id"] in existing_hns_hub_device_ids:
                    continue
                if not hns_endpoint["extranet"] and hns_endpoint["device"]["id"] == hub_device_id:
                    if is_hub_device_created:
                        continue
                    else:
                        hns_endpoint["peerType"] = "HUB"
                        is_hub_device_created = True
                else:
                    hns_endpoint["peerType"] = "SPOKE"
                hns_endpoint["description"] = "desc"

                hns_endpoint.pop("id")
                endpoints_api = Endpoints(fmc=fmc, **hns_endpoint)
                endpoints_api.vpn_policy(vpn_id=hns_topology_id)
                endpoints_data.append(endpoints_api.format_data())
    return endpoints_data


def get_create_bulk_endpoints_url(fmc: FMC, hns_topology_id: str) -> str:
    endpoints_api = Endpoints(fmc=fmc)
    endpoints_api.vpn_policy(vpn_id=hns_topology_id)
    endpoints_api_url = endpoints_api.URL
    req = PreparedRequest()
    req.prepare_url(endpoints_api_url, {"bulk": "true"})
    endpoints_api_bulk_url = req.url
    return endpoints_api_bulk_url


def set_endpoints_future(p2p_topologies: dict[str, list[dict]], hub_device_id: str, fmc: FMC, hns_topology_id: str,
                         p2p_topology_ids: list[str], hns_p2p_topologies: list[dict], api_pool, hns_topologies,
                         submit_future: Callable) -> list[dict]:
    created_endpoints = []
    endpoints_data = get_hns_endpoint_data_from_p2p(p2p_topologies, hub_device_id, fmc, hns_topology_id,
                                                    p2p_topology_ids, hns_p2p_topologies, hns_topologies)
    bulk_endpoints_api_url = get_create_bulk_endpoints_url(fmc, hns_topology_id)
    for chunk in get_post_data_chunks(endpoints_data):
        def set_endpoints(endpoints_response):
            created_endpoints.extend(endpoints_response["items"])

        submit_future(lambda: fmc.send_to_api(method="post", url=bulk_endpoints_api_url, json_data=chunk),
                      callback=set_endpoints)
    return created_endpoints


def fetch_to_device_p2p_topologies(futures: dict[str, list[Future]], p2p_topologies: dict[str, list[dict]],
                                   hub_device_id: str,
                                   api_pool: ThreadPoolExecutor, fmc: FMC) -> None:
    futures["device_p2p_topologies"] = futures["topologies"]
    wait(futures["topologies"])
    future_to_ike_settings = {api_pool.submit(partial(get_topology_ike_settings, fmc, topology)): topology for topology
                              in p2p_topologies[hub_device_id]}
    futures["device_p2p_topologies"][:] = future_to_ike_settings
    for i, future in enumerate(as_completed(future_to_ike_settings)):
        print("Completed device p2p", i)
        topology = future_to_ike_settings[future]
        topology["ikeSettings"] = future.result()


def get_topologies_with_their_endpoints(future_to_endpoints_topology_map: dict[Future, dict]) -> dict[
    str, list]:
    fetched_topologies = defaultdict(list)
    for i, future in enumerate(as_completed(future_to_endpoints_topology_map)):
        print("Completed ", i)
        topology = future_to_endpoints_topology_map[future]
        topology["endpoints"] = future.result()
        topology_type = topology["topologyType"]
        fetched_topologies[topology_type].append(topology)
    fetched_topologies.default_factory = None
    return fetched_topologies


def fetch_to_hns_p2p_topologies(futures: dict[str, list[Future]], p2p_topologies: dict[str, list[dict]],
                                hns_topology: dict,
                                api_pool: ThreadPoolExecutor, fmc: FMC, hns_p2p_topologies: list[dict]) -> None:
    futures["hns_p2p_topologies"] = futures["topologies"]
    wait(futures["topologies"])
    for endpoint in hns_topology["endpoints"]:
        if not endpoint["extranet"] and endpoint["device"]["id"] in p2p_topologies:
            hns_p2p_topologies.extend(p2p_topologies[endpoint["device"]["id"]])
    future_to_ike_settings = {api_pool.submit(partial(get_topology_ike_settings, fmc, topology)): topology for topology
                              in hns_p2p_topologies + [hns_topology]}
    futures["hns_p2p_topologies"][:] = future_to_ike_settings
    for i, future in enumerate(as_completed(future_to_ike_settings)):
        print("Completed hns p2p", i)
        topology = future_to_ike_settings[future]
        topology["ikeSettings"] = future.result()
