import {ListGroup} from "react-bootstrap";
import {ModalWrapper} from "../Components";
import {deviceState, pageState} from "../States";
import {get} from "../utils";
import P2pTopologies from "./P2pTopologies";

const deviceContext: {devices: any[]} = {devices: []};

function getDevices(callback: any) {
    if (domains !== undefined) return;
    get("devices", responseData => {
        console.log("Devices", responseData);
        deviceContext.devices = responseData;
        callback();
    }, 5)
};

function Device() {
    return (
        <ModalWrapper title={<h1>Choose device</h1>} body={(
            <ListGroup>
                {
                    deviceContext.devices.map((device) => (
                        <ListGroup.Item action onClick={() => {
                            deviceState.device = device.id;
                            pageState.setPage(<P2pTopologies/>);
                        }}>
                            {device.name}
                        </ListGroup.Item>
                    ))
                }
            </ListGroup>
        )}/>
    )

}
export {getDevices, Device};