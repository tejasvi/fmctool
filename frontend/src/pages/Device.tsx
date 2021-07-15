import {ListGroup} from "react-bootstrap";
import {ModalWrapper} from "../Components";
import {deviceState, pageState} from "../States";
import {useEffect, useState} from "react";
import {get} from "../utils";
import P2pTopologies from "./P2pTopologies";

function Device() {
    const [devices, setDevices] = useState();
    useEffect(function getDevices() {
        if (domains !== undefined) return;
        get("devices", responseData => {
            console.log("Devices", responseData);
            setDevices(responseData);
        }, 5)
    },[]);
    return (
        <ModalWrapper title={<h1>Choose device</h1>} body={(
            <ListGroup>
                {
                    devices && devices.map((device) => (
                        <ListGroup.Item action onClick={() => {
                            deviceState.device = device.id;
                            pageState.setState(<P2pTopologies/>);
                        }}>
                            {device.name}
                        </ListGroup.Item>
                    ))
                }
            </ListGroup>
        )}/>
    )

}