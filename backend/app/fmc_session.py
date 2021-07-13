from collections import defaultdict
from concurrent.futures.thread import ThreadPoolExecutor
from threading import Thread
from typing import Any

from fmcapi import FMC, DeviceRecords, AdvancedSettings, IPSecSettings

from app.constants import RATE_LIMIT_WAIT_SECONDS
from app.fmc_utils import delete_p2p_topology_ids, get_topologies_from_ids, get_topology_api, \
    get_ike_settings, set_endpoints_future, get_base_hns_topology, fetch_to_device_p2p_topologies, \
    fetch_to_p2p_topologies, \
    post_topology_settings
from app.models import Creds
from app.utils import get_task_callback_setup, get_dict_diff


class FMCSession:
    def __init__(self, creds: Creds):
        self.fmc = FMC(host=creds.host, username=creds.username, password=creds.password, autodeploy=True,
                       file_logging="/tmp/log.txt", domain=None, debug=False, limit=1000, timeout=180,
                       check_server_version=False)
        self.fmc.TOO_MANY_CONNECTIONS_TIMEOUT = RATE_LIMIT_WAIT_SECONDS
        self.fmc.__enter__()
        self.domains: dict[str, str] = {domain["uuid"]: domain["name"] for domain in self.fmc.mytoken.all_domain}
        self.fmc.uuid = None
        self.hub_device_id = None
        self.api_pool = ThreadPoolExecutor(max_workers=8)  # max FMC conn 10
        self.max_topologies = 500
        self.pending_futures = defaultdict(list)
        self.hns_topology = None
        self.orig_hns_p2p_topology_ids = None
        self.p2p_topologies = None

    def set_domain(self, domain_id: str) -> None:
        """
        Set the domain UUID for the FMC session trigger fetching P2P topologies in background thread.

        :param domain_id: Domain UUID
        """
        if domain_id != self.fmc.uuid:
            self.fmc.uuid = domain_id
            self.fmc.domain = self.fmc.mytoken.__domain = self.domains[domain_id]
            Thread(target=fetch_to_p2p_topologies,
                   args=[self.fmc, self.max_topologies, self.pending_futures, self.p2p_topologies,
                         self.api_pool]).start()

    def set_hub_device_id(self, device_id: str) -> None:
        """
        - Set the UUID of device used as hub.
        - Trigger fetching IKE settings for the topologies containing that device in a background thread.

        :param device_id: Device UUID
        """
        if self.hub_device_id != device_id:
            self.hub_device_id = device_id
            fetch_to_device_p2p_topologies(self.pending_futures, self.p2p_topologies, self.hub_device_id, self.api_pool,
                                           self.fmc)

    def get_registered_devices(self) -> list[dict]:
        device_api_response = DeviceRecords(fmc=self.fmc).get()
        devices = device_api_response["items"]
        return devices

    def get_topology_conflicts(self, topology_ids: list[str]) -> dict[str, Any]:
        """
        Get the conflicting parameters among the topologies.

        :param topology_ids: List of topology UUIDs.
        :return: Parameters with the list of conflicting values. Data structures corresponds the GET ftds2svpns response.
        """
        topologies = get_topologies_from_ids(self.p2p_topologies, self.hub_device_id, topology_ids)
        ignored_keys = {"metadata", "id", "description", "links", "topologyType", "endpoints", "name"}
        conflicts = get_dict_diff(topologies, ignored_keys)
        return conflicts

    def create_hns_topology(self, topology_name: str, p2p_topology_ids: list[str], override: dict[str, Any]) -> dict:
        """
        Create new Hub and Spoke topology on the device from Point to Point topologies.

        :param topology_name:
        :param p2p_topology_ids: The UUID list of point to point topologies being merged.
        :param override: The overriding parameter values used for conflicts. Data structure corresponds to the GET
            topology response.
        :return: Hub and spoke topology parameters corresponding to the GET `ftds2svpns` response
        """
        base_hns_topology = get_base_hns_topology(self.p2p_topologies, self.hub_device_id, override, topology_name)
        hns_topology_api = get_topology_api(base_hns_topology, self.fmc)
        hns_topology_id = hns_topology_api.id

        # Must set IKE settings before endpoints to override the default automatic pre-shared key setting
        created_ike_settings = get_ike_settings(self.fmc, hns_topology_id, base_hns_topology)

        submit_task, run_callbacks = get_task_callback_setup(self.api_pool)
        created_endpoints = set_endpoints_future(self.p2p_topologies, self.hub_device_id, self.fmc,
                                                 hns_topology_id, p2p_topology_ids,
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
        Deploy the changes in the FMC configuration.
        :return:
        """
        delete_p2p_topology_ids(self.orig_hns_p2p_topology_ids, self.fmc, self.api_pool)
        self.fmc.__exit__()


