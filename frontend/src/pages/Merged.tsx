import {post, renderTopologyTree} from "../utils";
import {Accordion, Card, Col, Container, Row} from "react-bootstrap";
import {Deploy, deployTopology} from "./Deploy";
import {useState} from "react";
import {newTopologyState, pageState} from "../States";
import {Header} from "../Components";

const mergedContext: { topology: any } = {topology: {}};

function getHnsTopology(callback: any, p2pTopologyIds: string[], override: any) {
    post("hns-topology", responseData => {
        mergedContext.topology = responseData[0];
        callback(responseData);
    }, 5, {p2p_topology_ids: p2pTopologyIds, override: override, hns_topology_id: newTopologyState.hnsTopologyId});
}

function Merged() {
    const [expandedTopology, setExpandedTopology] = useState<number>();
    return (
        <Container>
            <Row className="justify-content-md-center">
                <Col className="justify-content-md-center">
                    <Header onBack={() => alert("back")}
                            onNext={() => window.confirm("Delete the point-to-point topologies and deploy the changes?") && deployTopology(() => {
                                pageState.setPage(<Deploy/>)
                            })} header="Merged topology" nextVariant="success" nextString="Deploy"/>
                    <Accordion defaultActiveKey="0">
                        {[mergedContext.topology].map(renderTopologyTree(setExpandedTopology, expandedTopology))}
                    </Accordion>
                    <Card>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
}

export {getHnsTopology, Merged};