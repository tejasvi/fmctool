import {Container, Jumbotron} from "react-bootstrap";
import Button from "react-bootstrap/Button";
import {post} from "../utils";

function deployTopology(callback:any) {
    post("deploy", ()=>{callback();}, 5);
}

function Deploy(){
    return (
        <Jumbotron fluid>
            <Container>
                <h1>Deployment finished!</h1>
                <p>
                    <Button variant="primary" onClick={()=>{
                        window.location.reload();
                        /* TODO: preserve login */
                        // setDeployed(undefined);
                        // setHnsTopologies(undefined);
                        // setTopologies(undefined);
                        // setDevices(undefined);
                    }}>Startover</Button>
                </p>
            </Container>
        </Jumbotron>
    );
}

export {deployTopology, Deploy};