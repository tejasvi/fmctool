from collections import defaultdict
from concurrent.futures import wait
from concurrent.futures.thread import ThreadPoolExecutor
from functools import partial
from threading import Thread
from time import sleep
from typing import Any

from fastapi.security import OAuth2PasswordRequestForm
from fmcapi import FMC, DeviceRecords, AdvancedSettings, IPSecSettings, FTDS2SVPNs

from app.constants import RATE_LIMIT_WAIT_SECONDS
from app.fmc_utils import delete_p2p_topology_ids, get_topologies_from_ids, get_topology_api, \
    get_ike_settings, set_endpoints_future, get_base_hns_topology, fetch_to_device_p2p_topologies, \
    post_topology_settings, get_topology_endpoints, get_topologies_with_their_endpoints, fetch_to_hns_p2p_topologies
from app.utils import get_task_callback_setup, get_dict_diff


class FMCSession:
    def __init__(self, creds: OAuth2PasswordRequestForm):
        host, username = creds.username.split(" ", 1)
        self.fmc = FMC(host=host, username=username, password=creds.password, autodeploy=True,
                       file_logging="/tmp/log.txt", domain=None, debug=False, limit=1000, timeout=180,
                       check_server_version=False)
        self.fmc.TOO_MANY_CONNECTIONS_TIMEOUT = RATE_LIMIT_WAIT_SECONDS
        self.fmc.__enter__()
        self.domains: dict[str, str] = {domain["uuid"]: domain["name"] for domain in self.fmc.mytoken.all_domain}
        self.fmc.uuid = None
        self.hub_device_id = None
        self.hns_topology_id = None
        self.api_pool = ThreadPoolExecutor(max_workers=8)  # max FMC limit 10
        self.max_topologies = 500
        self.pending_futures = defaultdict(list)
        self.hns_topology = None
        self.orig_hns_p2p_topology_ids = None
        self.p2p_topologies = None
        self.hns_topologies = None
        self.hns_p2p_topologies = []

    def set_domain(self, domain_id: str) -> None:
        """
        - Set the domain UUID for the FMC session
        - trigger fetching all topologies in background thread.

        :param domain_id: Domain UUID
        """
        if domain_id != self.fmc.uuid:
            self.fmc.uuid = domain_id
            self.fmc.domain = self.fmc.mytoken.__domain = self.domains[domain_id]
            Thread(target=self.fetch_topologies).start()

    def set_hns_topology_id(self, hns_topology_id: str) -> list[dict]:
        """
        - Set the UUID of HNS topology to merge into.
        - Trigger fetching IKE settings for the p2p topologies containing HNS hub devices as one of their endpoints in
            a background thread.

        :param hns_topology_id: HNS topology UUID
        """
        if self.hns_topology_id != hns_topology_id:
            self.hns_topology_id = hns_topology_id
            assert self.p2p_topologies
            for topology in self.hns_topologies:
                if topology["id"] == hns_topology_id:
                    hns_topology = topology
                    break
            fetch_to_hns_p2p_topologies(self.pending_futures, self.p2p_topologies, hns_topology,
                                        self.api_pool,
                                        self.fmc, self.hns_p2p_topologies)
        return self.hns_p2p_topologies

    def set_hub_device_id(self, device_id: str) -> None:
        """
        - Set the UUID of device used as hub.
        - Trigger fetching IKE settings for the topologies containing that device in a background thread.

        :param device_id: Device UUID
        """
        if self.hub_device_id != device_id:
            self.hub_device_id = device_id
            wait(self.pending_futures["topologies"])
            assert self.p2p_topologies
            fetch_to_device_p2p_topologies(self.pending_futures, self.p2p_topologies, self.hub_device_id, self.api_pool,
                                           self.fmc)

    def get_registered_devices(self) -> list[dict]:
        """
        Get list of all devices registered on FMC

        :return: List of device details
        """
        device_api_response = DeviceRecords(fmc=self.fmc).get()
        devices = device_api_response["items"]
        return devices

    def get_topology_conflicts(self, topology_ids: list[str]) -> dict[str, Any]:
        """
        Get the conflicting parameters among the topologies.

        :param topology_ids: List of topology UUIDs.
        :return: Parameters with the list of conflicting values. Data structures corresponds the GET ftds2svpns response.
        """
        topologies = get_topologies_from_ids(self.p2p_topologies, self.hub_device_id, topology_ids, self.hns_p2p_topologies)
        ignored_keys = {"metadata", "id", "description", "links", "topologyType", "endpoints", "name"}
        conflicts = get_dict_diff(topologies, ignored_keys)
        return conflicts

    def create_hns_topology(self, topology_name: str, p2p_topology_ids: list[str], override: dict[str, Any], existing_hns_topology_id: str) -> dict:
        """
        Create new Hub and Spoke topology on the device from Point to Point topologies if hns topology ID is not provided or merge into existing one.

        :param existing_hns_topology_id: Existing HNS topology UUID to merge into (None if new topology)
        :param topology_name: Name of topology if creating new one
        :param p2p_topology_ids: The UUID list of point to point topologies being merged.
        :param override: The overriding parameter values used for conflicts. Data structure corresponds to the GET
            topology response.
        :return: Hub and spoke topology parameters corresponding to the GET `ftds2svpns` response
        """
        base_hns_topology = get_base_hns_topology(self.p2p_topologies, self.hub_device_id, override, topology_name, existing_hns_topology_id, self.hns_topologies)
        hns_topology_api = get_topology_api(base_hns_topology, self.fmc)
        hns_topology_id = hns_topology_api.id

        # Must set IKE settings before endpoints to override the default automatic pre-shared key setting else FMC API complains
        created_ike_settings = get_ike_settings(self.fmc, hns_topology_id, base_hns_topology)

        submit_task, run_callbacks = get_task_callback_setup(self.api_pool)
        created_endpoints = set_endpoints_future(self.p2p_topologies, self.hub_device_id, self.fmc,
                                                 hns_topology_id, p2p_topology_ids, self.hns_p2p_topologies, self.api_pool, self.hns_topologies,
                                                 True if existing_hns_topology_id is None else False,
                                                 submit_task)
        submit_task(lambda: post_topology_settings(self.fmc, hns_topology_id, base_hns_topology, "ipsecSettings",
                                                   IPSecSettings))
        submit_task(lambda: post_topology_settings(self.fmc, hns_topology_id, base_hns_topology, "advancedSettings",
                                                   AdvancedSettings))
        run_callbacks()

        self.hns_topology = hns_topology_api.get()
        self.hns_topology["endpoints"] = created_endpoints
        self.hns_topology["ikeSettings"] = created_ike_settings

        self.orig_hns_p2p_topology_ids = p2p_topology_ids

        return self.hns_topology

    def deploy(self):
        """
        Deploy the changes in the FMC configuration after deleting existing P2P topologies.
        """
        delete_p2p_topology_ids(self.orig_hns_p2p_topology_ids, self.fmc, self.api_pool)
        self.fmc.__exit__()

    def fetch_topologies(self) -> None:
        """
        Fetch all topologies using parallel connections. It adds the futures to FMC session's pending future list so that
            related requests can "wait" for completion. (using "/status" endpoint)
        """
        s2s_topologies = []
        stop_sleep = False
        def sleep_forever():
            while not stop_sleep:
                sleep(1)
        unending_future = ThreadPoolExecutor().submit(sleep_forever)
        self.pending_futures["topologies"].append(unending_future)
        s2s_topologies.extend(FTDS2SVPNs(fmc=self.fmc).get()['items'][:self.max_topologies])
        future_to_endpoints_topology_map = {
            self.api_pool.submit(partial(get_topology_endpoints, self.fmc, topology)): topology
            for topology in s2s_topologies
        }
        self.pending_futures["topologies"].extend(future_to_endpoints_topology_map)
        fetched_topologies = get_topologies_with_their_endpoints(future_to_endpoints_topology_map)
        p2p_topologies = fetched_topologies["POINT_TO_POINT"]
        self.p2p_topologies = defaultdict(list)
        for topology in p2p_topologies:
            for endpoint in topology["endpoints"]:
                if not endpoint["extranet"]:
                    self.p2p_topologies[endpoint["device"]["id"]].append(topology)
            self.p2p_topologies.default_factory = None
        self.hns_topologies = fetched_topologies["HUB_AND_SPOKE"] if "HUB_AND_SPOKE" in fetched_topologies else []
        self.pending_futures["topologies"].remove(unending_future)
        stop_sleep = True

