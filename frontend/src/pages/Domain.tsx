import {ListGroup} from "react-bootstrap";
import {ModalWrapper} from "../Components";
import {useEffect, useState} from "react";
import {get} from "../utils";
import {domainState, pageState} from "../States";
import TopologyChoice from "./TopologyChoice";


function Domain() {
    const [domains, setDomains] = useState<{ [key: string]: string }>();
    useEffect(function getDomains() {
        if (domains !== undefined) return;
        get("domains", responseData => {
            console.log("Devices", responseData);
            setDomains(responseData);
        }, 5)
    },[]);
    return (
        <ModalWrapper title={<h1>Choose domain</h1>} body={(
            <ListGroup>
                {domains && Object.entries(domains).map(([id, name]) => (
                    <ListGroup.Item action onClick={() => {
                        domainState.domain = id;
                        pageState.setPage(<TopologyChoice/>);
                    }}>
                        {name}
                    </ListGroup.Item>
                ))}
            </ListGroup>
        )}/>
    )
}

export default Domain;