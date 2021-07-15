import {ListGroup} from "react-bootstrap";
import {ModalWrapper} from "../Components";
import {deviceState, pageState} from "../States";
import {get} from "../utils";
import {getP2pTopologies, P2pTopologies} from "./P2pTopologies";

const deviceContext: { devices: any[] } = {devices: []};

function getDevices(callback: any) {
    get("devices", responseData => {
        console.log("Devices", responseData);
        deviceContext.devices = responseData;
        callback();
    }, 5)
}

function Device() {
    return (
        <ModalWrapper title={<h1>Choose device</h1>} body={(
            <ListGroup>
                {
                    deviceContext.devices.map((device) => (
                        <ListGroup.Item action onClick={() => {
                            deviceState.device = device.id;
                            getP2pTopologies(()=>pageState.setPage(<P2pTopologies/>));
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