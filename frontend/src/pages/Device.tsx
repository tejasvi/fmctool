import {ListGroup} from "react-bootstrap";
import {ModalWrapper} from "../Components";
import {deviceState, pageState} from "../States";
import {useEffect, useState} from "react";
import {get} from "../utils";
import P2pTopologies from "./P2pTopologies";

function Device() {
    const [devices, setDevices] = useState<any[]>();
    useEffect(function getDevices() {
        if (devices !== undefined) return;
        get("devices", responseData => {
            console.log("Devices", responseData);
            setDevices(responseData);
        }, 5)
    },[]);
    return (
        <ModalWrapper title={<h1>Choose device</h1>} body={(
            <ListGroup>
                {
                    (devices || []).map((device) => (
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
export default Device;