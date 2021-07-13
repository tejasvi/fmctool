from collections import defaultdict
from concurrent.futures import Future
from concurrent.futures import wait, as_completed
from concurrent.futures.thread import ThreadPoolExecutor
from copy import deepcopy
from typing import Any, Callable, Union, cast

from fmcapi import FTDS2SVPNs, IKESettings, Endpoints, AdvancedSettings, IPSecSettings, FMC
from fmcapi.api_objects.apiclasstemplate import APIClassTemplate
from requests.models import PreparedRequest

from app.utils import execute_parallel_tasks, patch_dict, get_post_data_chunks


def delete_p2p_topology_ids(p2p_topology_ids: list[str], fmc: FMC, api_pool: ThreadPoolExecutor) -> None:
    delete_tasks = []
    for topology_id in p2p_topology_ids:
        temp_topology_api = FTDS2SVPNs(fmc=fmc)
        temp_topology_api.id = topology_id
        delete_tasks.append(temp_topology_api.delete)
    execute_parallel_tasks(delete_tasks, api_pool)


def get_topologies_from_ids(p2p_topologies: dict[str, list[dict]], device_id: str, topology_ids: list[str]) -> list[
    dict]:
    tid_set = set(topology_ids)
    topologies = [topology for topology in p2p_topologies[device_id] if topology["id"] in tid_set]
    return topologies


def fetch_topology_settings(fmc: FMC, topology: dict, key_name: str, policy_service: APIClassTemplate) -> list[dict]:
    if "links" not in topology[key_name]:
        return topology[key_name]
    settings = cast(Callable, policy_service)(fmc=fmc)
    settings.vpn_policy(vpn_id=topology["id"])
    response = settings.get()["items"]
    return response


def get_topology_ike_settings(fmc: FMC, topology: dict) -> list[dict]:
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
                          topology_name: str) -> dict:
    base_topology: dict = deepcopy(p2p_topologies[hub_device_id][0])
    base_topology["name"] = topology_name
    base_topology["topologyType"] = "HUB_AND_SPOKE"
    base_topology.pop("id")
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
                           policy_service: Union[AdvancedSettings, IPSecSettings]) -> None:
    settings_api = cast(Callable, policy_service)(fmc=fmc, **topology_config[key_name])
    settings_api.vpn_policy(vpn_id=topology_id)
    settings_api.post()


def get_hns_endpoint_data_from_p2p(p2p_topologies: dict[str, list[dict]], hub_device_id: str, fmc: FMC,
                                   hns_topology_id: str,
                                   p2p_topology_ids) -> list[dict]:
    is_hub_device_created = False
    p2p_topology_ids_set = set(p2p_topology_ids)
    endpoints_data = []
    for topology in p2p_topologies[hub_device_id]:
        if topology["id"] in p2p_topology_ids_set:
            for p2p_endpoint in topology["endpoints"]:
                hns_endpoint = deepcopy(p2p_endpoint)
                if hns_endpoint["device"]["id"] == hub_device_id and not hns_endpoint["extranet"]:
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


def set_endpoints_future(p2p_topologies: list[dict], hub_device_id: str, fmc: FMC, hns_topology_id: str,
                         p2p_topology_ids: list[str],
                         submit_future: Callable) -> list[dict]:
    created_endpoints = []
    endpoints_data = get_hns_endpoint_data_from_p2p(p2p_topologies, hub_device_id, fmc, hns_topology_id,
                                                    p2p_topology_ids)
    bulk_endpoints_api_url = get_create_bulk_endpoints_url(fmc, hns_topology_id)
    for chunk in get_post_data_chunks(endpoints_data):
        def set_endpoints(endpoints_response):
            created_endpoints.extend(endpoints_response["items"])

        submit_future(fmc.send_to_api, method="post", url=bulk_endpoints_api_url, json_data=chunk,
                      callback=set_endpoints)
    return created_endpoints


def fetch_to_device_p2p_topologies(futures: dict[str, list[Future]], p2p_topologies: list[dict], hub_device_id: str,
                                   api_pool: ThreadPoolExecutor) -> None:
    futures["device_p2p_topologies"] = futures["p2p_topologies"]
    wait(futures["p2p_topologies"])
    future_to_ike_settings = {api_pool.submit(get_topology_ike_settings, topology): topology for topology
                              in p2p_topologies[hub_device_id]}
    futures["device_p2p_topologies"][:] = future_to_ike_settings
    for i, future in enumerate(as_completed(future_to_ike_settings)):
        print("Completed device p2p", i)
        topology = future_to_ike_settings[future]
        topology["ikeSettings"] = future.result()


def fetch_to_p2p_topologies(fmc: FMC, max_topologies: int, pending_futures, p2p_topologies: dict[str, list[dict]],
                            api_pool: ThreadPoolExecutor) -> None:
    s2s_topologies = FTDS2SVPNs(fmc=fmc).get()['items'][:max_topologies]
    future_to_endpoints_topology_map = {
        api_pool.submit(get_topology_endpoints, topology): topology
        for topology in s2s_topologies
        if topology["topologyType"] == "POINT_TO_POINT"
    }
    pending_futures["p2p_topologies"].extend(future_to_endpoints_topology_map)
    fetched_p2p_topologies = get_topologies_with_their_endpoints(future_to_endpoints_topology_map)
    p2p_topologies.clear()
    p2p_topologies.update(fetched_p2p_topologies)


def get_topologies_with_their_endpoints(future_to_endpoints_topology_map: dict[Future, dict]) -> dict[str, list[dict]]:
    fetched_p2p_topologies = defaultdict(list)
    for i, future in enumerate(as_completed(future_to_endpoints_topology_map)):
        print("Completed ", i)
        topology = future_to_endpoints_topology_map[future]
        topology["endpoints"] = future.result()
        for endpoint in topology["endpoints"]:
            if not endpoint["extranet"]:
                fetched_p2p_topologies[endpoint["device"]["id"]].append(topology)
                break
    fetched_p2p_topologies.default_factory = None
    return fetched_p2p_topologies
