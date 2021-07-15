import {ModalWrapper} from "../Components";
import {ListGroup} from "react-bootstrap";
import {pageState} from "../States";
import {getHnsTopologies, ExistingHnsTopologies} from "./ExistingHnsTopologies";
import {Device, getDevices} from "./Device"

function TopologyChoice() {
    return (
        <ModalWrapper title={<h1>Hub and Spoke topology</h1>} body={(
            <ListGroup>
                <ListGroup.Item action onClick={() => {
                    getDevices(() => pageState.setPage(<Device/>));
                }}>
                    <h3>Create new</h3>
                </ListGroup.Item>
                <ListGroup.Item action onClick={() => {
                    getHnsTopologies(()=>pageState.setPage(<ExistingHnsTopologies/>));
                }}>
                    <h3>Use existing</h3>
                </ListGroup.Item>
            </ListGroup>
        )}/>
    );
}

export default TopologyChoice;