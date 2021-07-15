#!/usr/bin/env python3
from concurrent.futures import ThreadPoolExecutor

from fmcapi import FMC

from app.utils import recreate_test_p2p_topologies

with ThreadPoolExecutor(max_workers=8)  as api_pool:
    with FMC(host="10.10.8.4", username="api", password="Cisco@123", autodeploy=False) as fmc:
        fmc.TOO_MANY_CONNECTIONS_TIMEOUT = 5
        recreate_test_p2p_topologies(fmc=fmc, api_pool=api_pool, count=5)
