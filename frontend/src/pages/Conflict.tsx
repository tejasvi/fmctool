import {
    camelToTitleCase,
    getKeyPathValue,
    isListConflictNode,
    post,
    removeNonObjectNodes,
    setKeyPathValue,
    theme
} from "../utils";
import {Badge, Card, Col, Container, Form, InputGroup, Row} from "react-bootstrap";
import JSONTree from "react-json-tree";
import {MouseEvent, useState} from "react";
import {getHnsTopology, Merged} from "./Merged";
import {filteredTopologiesState, overrideState, pageState} from "../States";
import {Header} from "../Components";

const conflictsContext: { conflicts: any, override: any } = {conflicts: {}, override: {}};

function getConflicts(callback: any, topology_ids: string[]) {
    post("conflicts", responseData => {
        conflictsContext.conflicts = responseData;
        const override = JSON.parse(JSON.stringify(responseData));
        console.log("None obj nodes", JSON.parse(JSON.stringify(override)));
        removeNonObjectNodes(override);
        console.log("After None obj nodes", JSON.parse(JSON.stringify(override)));
        conflictsContext.override = override;
        for (const k in responseData) {
            callback();
            return;
        }
        getHnsTopology(() => {
            pageState.setPage(<Merged/>);
        }, topology_ids, {});
    }, 5, {topology_ids: topology_ids});
}


function Conflict() {
    const [override, setOverride] = useState<{ [key: string]: any }>(conflictsContext.override);
    return (
        <Container>
            <Row className="justify-content-md-center">
                <Col className="justify-content-md-center">
                    {/* eslint-disable-next-line react/jsx-no-undef */}
                    <Header onBack={() => alert("back")} onNext={() => {
                        conflictsContext.override = override;
                        getHnsTopology(() => {
                            pageState.setPage(<Merged/>);
                        }, filteredTopologiesState.id_list as string[], overrideState.override)
                    }
                    } header="Conflicts"
                            nextVariant="success"/>
                    <Card>
                        <Card.Body><JSONTree sortObjectKeys={true} theme={theme} getItemString={() => <></>}
                                             labelRenderer={(keyPath, nodeType, expanded, expandable) => {
                                                 const value = getKeyPathValue(override, keyPath);
                                                 const label = camelToTitleCase(keyPath[0].toString()) + (expandable ? (expanded ? " ↴" : " +") : ":");
                                                 if (nodeType === "Array" && getKeyPathValue(conflictsContext.conflicts, keyPath) !== undefined) {
                                                     return (<>
                                                         <Form.Row>
                                                             <InputGroup hasValidation className="form-inline">
                                                                 <InputGroup.Prepend>
                                                                     <InputGroup.Text>{label}</InputGroup.Text>
                                                                 </InputGroup.Prepend>
                                                                 <Form.Control type="text" placeholder="Override"
                                                                               as="textarea"
                                                                               rows={typeof value === 'string' ? value.split('\n').length : 1}
                                                                               value={typeof value === 'string' ? value : undefined}
                                                                               isInvalid={(() => {
                                                                                   console.log("Invalid", value);
                                                                                   if (value === "" || typeof value !== 'string') return false;
                                                                                   try {
                                                                                       JSON.parse(value);
                                                                                   } catch (e) {
                                                                                       if (e instanceof SyntaxError) {
                                                                                           return true;
                                                                                       } else {
                                                                                           throw e;
                                                                                       }
                                                                                   }
                                                                                   return false;
                                                                               })()}
                                                                               onClick={(e: MouseEvent<HTMLTextAreaElement>) => {
                                                                                   e.preventDefault();
                                                                                   e.stopPropagation()
                                                                               }}
                                                                               onChange={e => {
                                                                                   const newValue = e.currentTarget.value;
                                                                                   setKeyPathValue(override, keyPath, newValue);
                                                                                   setOverride({...override});
                                                                               }}/>
                                                                 <Form.Control.Feedback type="invalid">
                                                                     Invalid JSON
                                                                 </Form.Control.Feedback>
                                                             </InputGroup>
                                                         </Form.Row>
                                                     </>)
                                                 } else {
                                                     return label;
                                                 }
                                             }}
                                             shouldExpandNode={(keyPath, data, level) => !isListConflictNode(data) && (!Array.isArray(data) || data.length < 5)}
                                             valueRenderer={(valueString, value, ...keyPath) => (
                                                 <Badge variant="light" pill onClick={() => {
                                                     const parentPath = keyPath.slice(1);
                                                     const currentValue = getKeyPathValue(override, parentPath);
                                                     console.log("valueclick", {
                                                         override,
                                                         parentPath,
                                                         value,
                                                         currentValue
                                                     });
                                                     if (currentValue === undefined || typeof currentValue === 'string') {
                                                         console.log("IN");
                                                         setKeyPathValue(override, parentPath, JSON.stringify(value));
                                                         setOverride({...override});
                                                     }
                                                 }}
                                                        style={{cursor: 'pointer'}}>{valueString.replace?.(/^"+|"+$/g, '') || valueString}
                                                 </Badge>
                                             )} hideRoot={true} collectionLimit={2} data={conflictsContext.conflicts}/>
                        </Card.Body>

                    </Card>
                </Col>
            </Row>
        </Container>
    );
}

export {getConflicts, Conflict};