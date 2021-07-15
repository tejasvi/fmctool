import {useCallback, useEffect, useState} from "react";
import {get} from "../utils";

function ExistingHnsTopologies() {
    const [hnsTopologies, setHnsTopologies] = useState();
    useEffect(useCallback(function getHnsTopologies() {
        get("hns-topologies", setHnsTopologies, 5, undefined, "hns_topologies")
    }, []), [])
    return (
        <>
            {hnsTopologies}
        </>
    )
}

export default ExistingHnsTopologies;