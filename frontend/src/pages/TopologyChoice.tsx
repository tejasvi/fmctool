import {ModalWrapper} from "../Components";
import {ListGroup} from "react-bootstrap";
import {pageState} from "../States";
import ExistingHnsTopologies from "./ExistingHnsTopologies";

function TopologyChoice() {
    return (
        <ModalWrapper title={<h1>Hub and Spoke topology</h1>} body={(
            <ListGroup>
                <ListGroup.Item action onClick={() => {
                    pageState.setPage(<Device/>);
                }}>
                    Create new
                </ListGroup.Item>
                <ListGroup.Item action onClick={() => {
                    pageState.setPage(<ExistingHnsTopologies/>);
                }}>
                    Use Existing
                </ListGroup.Item>
            </ListGroup>
        )}/>
    );
}

export default TopologyChoice;