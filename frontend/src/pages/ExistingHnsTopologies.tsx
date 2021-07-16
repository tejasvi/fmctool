import {get} from "../utils";
import {ModalWrapper} from "../Components";
import {ListGroup} from "react-bootstrap";
import {newTopologyState, pageState} from "../States";
import {getHnsP2pTopologies, P2pTopologies} from "./P2pTopologies";

const hnsTopologiesContext: { hnsTopologies: any[] } = {hnsTopologies: []};

function getHnsTopologies(callback: any) {
    get("hns-topologies", (responseData) => {
        hnsTopologiesContext.hnsTopologies = responseData;
        callback();
    }, 5, undefined, "topologies");
}

function ExistingHnsTopologies() {
    return (
        <ModalWrapper title={<h1>Choose topology</h1>} body={(
            <ListGroup>
                {
                    hnsTopologiesContext.hnsTopologies.map((topology) => (
                        <ListGroup.Item action onClick={() => {
                            newTopologyState.hnsTopologyId = topology.id;
                            getHnsP2pTopologies(() => {
                                pageState.setPage(<P2pTopologies/>);
                            });
                        }}>
                            {topology.name}
                        </ListGroup.Item>
                    ))
                }
            </ListGroup>
        )}/>
    )
}

export {getHnsTopologies, ExistingHnsTopologies};