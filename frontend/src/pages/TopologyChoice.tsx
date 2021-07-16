import {ModalWrapper} from "../Components";
import {ListGroup} from "react-bootstrap";
import {pageState} from "../States";
import {ExistingHnsTopologies, getHnsTopologies} from "./ExistingHnsTopologies";
import {Device, getDevices} from "./Device"

function TopologyChoice() {
    return (
        <ModalWrapper title={<h1>Merged topology</h1>} body={(
            <ListGroup>
                <ListGroup.Item action onClick={() => {
                    getDevices(() => pageState.setPage(<Device/>));
                }}>
                    Create new
                </ListGroup.Item>
                <ListGroup.Item action onClick={() => {
                    getHnsTopologies(() => pageState.setPage(<ExistingHnsTopologies/>));
                }}>
                    Use existing
                </ListGroup.Item>
            </ListGroup>
        )}/>
    );
}

export default TopologyChoice;
