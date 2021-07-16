#!/usr/bin/env python3
import socket
import struct
from concurrent.futures import ThreadPoolExecutor
from functools import partial
from random import randint

from fmcapi import FMC, AdvancedSettings, FTDS2SVPNs, Endpoints, IKESettings

from app.utils import execute_parallel_tasks

##################################################
# Verify the constants before running the script
##################################################

FMC_PASSWORD = "Cisco@123"

FMC_USER = "api"

FMC_HOST = "10.10.8.4"

IKE_POLICIES = [{"name": "DES-SHA-SHA-LATEST", "id": "0050568C-4A4E-0ed3-0000-000000000404", "type": "IKEv2Policy"}]

FTD_INTERFACE = {"name": "Outside", "id": "0050568C-4A4E-0ed3-0000-021474837881", "type": "PhysicalInterface"}

FTD_DEVICE_ = {"name": "10.10.8.2", "id": "07cfba2c-c2bf-11eb-9e85-c5bee801c0c9", "type": "Device"}

PROTECTED_NETWORKS = {
    "networks": [{"name": "10P2PObj", "id": "0050568C-4A4E-0ed3-0000-021474838306", "type": "Network"}]}


def recreate_test_topologies(fmc, api_pool, count=5, p2p_only=False):
    """
    Delete all existing topologies and create fresh topologies.

    :param fmc: FMC API object
    :param api_pool: Thread pool used for sending requests
    :param count: Number of P2P topologies created.
    :param p2p_only: Delete and recreate only P2P topologies
    """
    delete_all_topologies(fmc, api_pool, p2p_only)

    extranet_ips = get_random_ips(count)

    tasks = [partial(create_topology, fmc, extranet_ips.pop(), f"p2p-topology-{i:03d}", True) for i in range(count)]
    if not p2p_only:
        tasks.append(partial(create_topology, fmc, get_random_ips(1).pop(), "test_hns_topology", False))

    execute_parallel_tasks(tasks, api_pool)


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


def create_topology(fmc, extranet_ip: str, topology_name: str, p2p: bool) -> None:
    """
    Create topology with device and extranet endpoints.

    :param p2p: Create P2P topology or HNS
    :param fmc: FMC API object
    :param extranet_ip: IP of the extranet endpoint
    :param topology_name: Name of topology
    """
    topology_api = FTDS2SVPNs(fmc=fmc, name=topology_name, topologyType="POINT_TO_POINT" if p2p else "HUB_AND_SPOKE")
    topology = topology_api.post()

    create_test_topology_advanced_settings(fmc, topology_api, topology["advancedSettings"]["id"])

    create_topology_ike_settings(fmc, topology_api)

    create_topology_endpoints(fmc, extranet_ip, topology_api, p2p)


def create_topology_endpoints(fmc: FMC, extranet_ip: str, topology_api: FTDS2SVPNs, p2p: bool) -> None:
    """
    Create device and extranet endpoints

    :param p2p: Create p2p endpoints or hns
    :param fmc: FMC API object
    :param extranet_ip: IP of the extranet endpoint
    :param topology_api: Topology API object
    """
    ftd = {"peerType": "PEER" if p2p else "HUB",
           "device": FTD_DEVICE_,
           "interface": FTD_INTERFACE,
           "protectedNetworks": PROTECTED_NETWORKS}
    extranet = {"peerType": "PEER" if p2p else "SPOKE", "extranet": True,
                "extranetInfo": {"name": extranet_ip, "ipAddress": extranet_ip},
                "protectedNetworks": PROTECTED_NETWORKS}
    for device in (extranet, ftd):
        endpoints_api = Endpoints(fmc=fmc, **device)
        endpoints_api.vpn_policy(vpn_id=topology_api.id)
        endpoints_api.post()


def create_topology_ike_settings(fmc: FMC, topology_api: FTDS2SVPNs):
    """
    Create IKE settings

    :param fmc: FMC API object
    :param topology_api: Topology API object
    """
    ike_settings = {"authenticationType": "MANUAL_PRE_SHARED_KEY", "enforceHexBasedPreSharedKeyOnly": False,
                    "manualPreSharedKey": ["Cisco@123-Collab", "Cisco@123-Switching"][randint(0, 1)],
                    "policies": IKE_POLICIES}

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


if __name__ == "__main__":
    """Delete all topologies and recreate test p2p and hns topologies"""
    with ThreadPoolExecutor(max_workers=8)  as api_pool:
        with FMC(host=FMC_HOST, username=FMC_USER, password=FMC_PASSWORD, autodeploy=False) as fmc:
            fmc.TOO_MANY_CONNECTIONS_TIMEOUT = 5
            recreate_test_topologies(fmc=fmc, api_pool=api_pool, count=5, p2p_only=False)
