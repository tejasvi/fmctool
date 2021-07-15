import {ListGroup} from "react-bootstrap";
import {ModalWrapper} from "../Components";
import {useEffect, useRef, useState} from "react";
import {get} from "../utils";
import {domainState, pageState} from "../States";
import TopologyChoice from "./TopologyChoice";

const useComponentWillMount = (func: any) => {
    const willMount = useRef(true)

    if (willMount.current) func()

    willMount.current = false
}

function Domain(props: {domains: any[]}) {
    return (
        <ModalWrapper title={<h1>Choose domain</h1>} body={(
            <ListGroup>
                {Object.entries(props.domains).map(([id, name]) => (
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