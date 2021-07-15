import {Container, Modal, Navbar, ProgressBar} from "react-bootstrap";
import Skeleton from "react-loading-skeleton";
import {ReactElement} from "react";
import Button from "react-bootstrap/Button";

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
function Header(props: {onBack?: ()=>any, onNext?: ()=>any, nextVariant?: string, nextString?: string, header?: string | ReactElement}) {
    let back;
    if (props.onBack !== undefined) {
        back=(
            <Navbar.Collapse className="justify-content-start">
                <Button variant="primary" onClick={props.onBack}>Back</Button>
            </Navbar.Collapse>
        );
    }
    let next;
    if (props.onNext !== undefined) {
        next = (
            <Navbar.Collapse className="justify-content-end">
                <Button variant={props.nextVariant || "primary"} onClick={props.onNext}>{props.nextString || "Next"}</Button>
            </Navbar.Collapse>
        );
    }
    return (
        <Navbar  bg="light" sticky="top" >
            <Container>
                {back}
                <Navbar.Brand>
                    <h1>{props.header}</h1>
                </Navbar.Brand>
                {next}
            </Container>
        </Navbar>
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