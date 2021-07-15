import {camelToTitleCase, Header, post, theme} from "../utils";
import {Accordion, Card, Col, Container, Row} from "react-bootstrap";
import JSONTree from "react-json-tree";
import {Deploy, deployTopology} from "./Deploy";
import {useState} from "react";
import {newTopologyState, pageState} from "../States";

const mergedContext:{topology:any}= {topology:{}};

function getHnsTopology(callback:any, p2pTopologyIds:string[], override:any) {
    post("hns-topology", responseData=>{
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
                    <Header onBack={()=>alert("back")} onNext={()=>window.confirm("Delete the point-to-point topologies and deploy the changes?") && deployTopology(()=>{pageState.setPage(<Deploy/>)})} header="Merged topology" nextVariant="success" nextString="Deploy"/>
                    <Accordion defaultActiveKey="0">
                        {[mergedContext.topology].map((topology, idx) => (
                            <Card>
                                <Accordion.Toggle as={Card.Header} eventKey={idx.toString()} onClick={() => setExpandedTopology(expandedTopology === idx ? undefined : idx)}>
                                    {topology.name}<span className="float-right">{expandedTopology === idx ? "▲" : "▼"}</span>
                                </Accordion.Toggle>
                                <Accordion.Collapse eventKey={idx.toString()}>
                                    <Card.Body><JSONTree  sortObjectKeys={true} theme={theme} getItemString={() => <></>} labelRenderer={([key], _nodeType, _expanded, expandable) => <>{camelToTitleCase(key.toString()) + (expandable ? " +" : "")}</>} valueRenderer={(raw) => <code>{typeof raw === 'string' ? raw.replace(/^"+|"+$/g, '') : raw}</code>} hideRoot={true} collectionLimit={2} data={topology} /></Card.Body>
                                </Accordion.Collapse>
                            </Card>
                        ))}
                    </Accordion>
                    <Card>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
}
export {getHnsTopology, Merged};