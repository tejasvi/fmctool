import {Col, Form, Row} from "react-bootstrap";
import Button from "react-bootstrap/Button";
import {auth, backendRoot, pageState} from "../States";
import {FormEvent} from "react";
import axios from "axios";
import {post, progressRunner} from "../utils";
import {ModalWrapper} from "../Components";
import Domain from "./Domain";

function getToken(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const hostUsername = `${formData.get("host")} ${formData.get("username")}`;
    formData.set("username", hostUsername)
    formData.delete("host");
    formData.append("grant_type", "password");
    console.log("Sent:", formData);

    post("token", response => {
        console.log("Token", response.data["access_token"], response.data["domain_names"]);
        auth.token = response.data["access_token"];
        // domainState.(response.data["domains"]);
        pageState.setPage(<Domain/>)
    }, 5, formData);
}

function Login() {
    const host = "host";
    const username = "username";
    const password = "password";

    return (
        <Form onSubmit={getToken}>
            <ModalWrapper title={<>Tool</>} body={(
                <>
                    <Form.Group controlId={host}>
                        <Form.Label>FMC host</Form.Label>
                        <Form.Control type="text" name={host} placeholder="FMC host" required={true}
                                      pattern="^[^\s]*$" autoFocus={true}/>
                        <Form.Text className="text-muted">
                            E.g. 192.0.2.10, example.com:8080
                        </Form.Text>
                    </Form.Group>

                    <Row>
                        <Col>
                            <Form.Group controlId={username}>
                                <Form.Label>Username</Form.Label>
                                <Form.Control type="text" name={username} placeholder="Username" required={true}
                                              pattern="^[^\s]*$"/>
                            </Form.Group>
                        </Col>

                        <Col>
                            <Form.Group controlId={password}>
                                <Form.Label>Password</Form.Label>
                                <Form.Control type="password" name={password} placeholder="Password"
                                              required={true}/>
                            </Form.Group>
                        </Col>
                    </Row>
                </>
            )} footer={(
                <Button variant="primary" type="submit" block>
                    Login
                </Button>
            )}/>
        </Form>
    )
}

export default Login;