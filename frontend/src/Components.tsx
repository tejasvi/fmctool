import {Modal, ProgressBar} from "react-bootstrap";
import Skeleton from "react-loading-skeleton";

function ModalWrapper(props: { title: JSX.Element, header?: JSX.Element, body?: JSX.Element, footer?: JSX.Element }): JSX.Element {
    return (
        <Modal.Dialog>
            <Modal.Header>
                <Modal.Title>{props.title}</Modal.Title>
                {props.header}
            </Modal.Header>
            <Modal.Body>{props.body}</Modal.Body>
            {props.footer ? <Modal.Footer>{props.footer}</Modal.Footer> : undefined}
        </Modal.Dialog>
    )
}

export {ModalWrapper};

export function Progress(props: { now: number }) {
    return (<div className="justify-content-md-center">
        <ProgressBar now={props.now}/>
        <Skeleton width={"70vw"}
                  style={{margin: "15vw", marginTop: "5vw", borderRadius: 10, height: "50vh"}}> </Skeleton>
    </div>);
}