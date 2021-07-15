import {ListGroup} from "react-bootstrap";
import {ModalWrapper} from "../Components";
import {useEffect, useState} from "react";
import {get} from "../utils";
import {domainState, pageState} from "../States";
import TopologyChoice from "./TopologyChoice";

const domainsContext:{domains: [string, string]} = {domains:[]};

function getDomains(callback: any) {
    get("domains", responseData => {
        console.log("Devices", responseData);
        domainsContext.domains = responseData;
        callback();
    }, 5)
}

function Domain() {
    return (
        <ModalWrapper title={<h1>Choose domain</h1>} body={(
            <ListGroup>
                {Object.entries(domainsContext.domains).map(([id, name]) => (
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