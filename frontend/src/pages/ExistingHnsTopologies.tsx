import {useEffect, useState} from "react";
import {get} from "../utils";

function ExistingHnsTopologies() {
    const [hnsTopologies, setHnsTopologies] = useState();
    useEffect(function getHnsTopologies() {
            if (hnsTopologies !== undefined) return;
            get("hns-topologies", setHnsTopologies, 5, undefined, "hns_topologies");
        }
    , [hnsTopologies]);
    return (
        <>
            {hnsTopologies}
        </>
    )
}

export default ExistingHnsTopologies;