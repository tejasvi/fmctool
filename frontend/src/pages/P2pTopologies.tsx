// import {
//     Accordion,
//     ButtonGroup, Card,
//     Col,
//     Container,
//     Dropdown,
//     DropdownButton,
//     Form,
//     InputGroup,
//     Navbar,
//     Row,
//     Toast
// } from "react-bootstrap";
// import Button from "react-bootstrap/Button";
// import {FormEvent} from "react";
// import JSONTree from "react-json-tree";

function P2pTopologies() {
    return <>topologies</>;

    // return (
    //     <Container>
    //         <Row className="justify-content-md-center">
    //             <Col className="justify-content-md-center">
    //                 <Navbar bg="light" sticky="top">
    //                     <Container>
    //                         <Navbar.Brand>
    //                             <h1>Filter topologies</h1>
    //                         </Navbar.Brand>
    //                         <Navbar.Collapse className="justify-content-end">
    //                             <Button variant="primary" onClick={getConflicts}>Next</Button>
    //                         </Navbar.Collapse>
    //                     </Container>
    //                 </Navbar>
    //                 {filters.map(({keyPath, value}, filterIdx) => (
    //                     <Toast onClose={() => {
    //                         console.log("Remove: ", filters, filterIdx);
    //                         filters.splice(filterIdx, 1);
    //                         setFilters(filters.length > 0 ? filters.slice() : [getDefaultFilter()]);
    //                     }}>
    //                         <Toast.Header closeLabel={"Remove"}>
    //                             <ButtonGroup>
    //                                 <Button as={ButtonGroup} variant="success" onClick={() => {
    //                                     console.log("Insert: ", filters, filterIdx);
    //                                     filters.splice(filterIdx + 1, 0, getDefaultFilter());
    //                                     setFilters(filters.slice());
    //                                 }}>+</Button>
    //                                 {keyPath.map((key, keyIdx) => {
    //                                     let parent = topologies[0];
    //                                     for (let i = 0; i < keyIdx; ++i) {
    //                                         parent = parent[keyPath[i]];
    //                                     }
    //                                     return (
    //                                         <DropdownButton as={ButtonGroup}
    //                                                         title={camelToTitleCase(key.length < 15 ? key : key.substring(0, 15) + "..")}
    //                                                         className={Object.keys(parent).length === 1 ? "nocaret" : undefined}
    //                                                         id="bg-nested-dropdown" block>{
    //                                             (() => {
    //                                                 console.log("undefined check", parent, keyIdx, key, keyPath);
    //                                                 return Object.keys(parent).map(sibling => (
    //                                                     <Dropdown.Item eventKey={sibling} active={sibling === key}
    //                                                                    onSelect={eventKey => {
    //                                                                        console.log("Onselect", eventKey, keyPath, keyIdx, parent);
    //                                                                        if (eventKey === null) return;
    //                                                                        keyPath[keyIdx] = eventKey;
    //                                                                        let curIdx = keyIdx;
    //                                                                        let curKey = eventKey;
    //                                                                        while (typeof parent[curKey] === "object") {
    //                                                                            parent = parent[curKey];
    //                                                                            curKey = Object.keys(parent)[0];
    //                                                                            console.log(curKey, parent);
    //                                                                            curIdx += 1;
    //                                                                            keyPath[curIdx] = curKey;
    //                                                                        }
    //                                                                        keyPath.length = curIdx + 1;
    //                                                                        switch (typeof parent[curKey]) {
    //                                                                            case "string":
    //                                                                                value = "";
    //                                                                                break;
    //                                                                            case "number":
    //                                                                                value = [Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY];
    //                                                                                break;
    //                                                                            case "boolean":
    //                                                                                value = false;
    //                                                                                break;
    //                                                                            default:
    //                                                                                throw (new Error("Invalid type"));
    //                                                                        }
    //                                                                        const filter = filters[filterIdx];
    //                                                                        filter.value = value;
    //                                                                        console.log(keyPath, filters);
    //                                                                        setFilters(filters.slice());
    //                                                                    }}>
    //                                                         {typeof sibling === 'string' ? camelToTitleCase(sibling) : sibling}
    //                                                     </Dropdown.Item>
    //                                                 ));
    //                                             })()
    //                                         }</DropdownButton>
    //                                     )
    //                                 })}
    //                             </ButtonGroup>
    //                         </Toast.Header>
    //                         <Toast.Body>
    //                             {(() => {
    //                                 switch (typeof value) {
    //                                     case "string":
    //                                         return (
    //                                             <Form>
    //                                                 <Form.Group controlId="exampleForm.ControlInput1">
    //                                                     <Form.Label>Regex</Form.Label>
    //                                                     <InputGroup hasValidation>
    //                                                         <Form.Control type="text" placeholder="Regex"
    //                                                                       value={value as string || ""}
    //                                                                       isInvalid={invalidFilters.has(filterIdx)}
    //                                                                       onChange={e => {
    //                                                                           const regex = e.target.value;
    //                                                                           try {
    //                                                                               new RegExp(regex);
    //                                                                               if (invalidFilters.delete(filterIdx)) {
    //                                                                                   setInvalidFilters(new Set(invalidFilters));
    //                                                                               }
    //                                                                           } catch (SyntaxError) {
    //                                                                               invalidFilters.add(filterIdx);
    //                                                                               setInvalidFilters(new Set(invalidFilters));
    //                                                                           }
    //                                                                           filters[filterIdx].value = regex;
    //                                                                           setFilters(filters.slice());
    //                                                                       }}/>
    //                                                         <Form.Control.Feedback type="invalid">
    //                                                             Regex has some error
    //                                                         </Form.Control.Feedback>
    //                                                     </InputGroup>
    //                                                 </Form.Group>
    //                                             </Form>
    //                                         )
    //                                     case "object":
    //                                         const numberChange = (e: FormEvent<HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement>, isMin: boolean) => {
    //                                             (filters[filterIdx].value as [number, number])[isMin ? 0 : 1] = Number(e.currentTarget.value);
    //                                             console.log("Value: ", Number(e.currentTarget.value));
    //                                             setFilters(filters.slice());
    //                                         }
    //                                         const numValue = value as [number, number];
    //                                         const numError = (
    //                                             <Form.Control.Feedback type="invalid">
    //                                                 Can't recognize number
    //                                             </Form.Control.Feedback>
    //                                         );
    //                                         console.log("Timestamp:", numValue);
    //                                         return (
    //                                             <Form>
    //                                                 <Form.Label>Number range (inclusive)</Form.Label>
    //                                                 <Row>
    //                                                     <Col>
    //                                                         <InputGroup hasValidation>
    //                                                             <Form.Control type="text" placeholder="-Infinity"
    //                                                                           isInvalid={isNaN(numValue[0])}
    //                                                                           onChange={e => numberChange(e, true)}/>
    //                                                             {numError}
    //                                                         </InputGroup>
    //                                                     </Col>
    //                                                     to
    //                                                     <Col>
    //                                                         <InputGroup hasValidation>
    //                                                             <Form.Control type="text" placeholder="Infinity"
    //                                                                           isInvalid={isNaN(numValue[1])}
    //                                                                           onChange={e => numberChange(e, false)}/>
    //                                                             <Form.Control.Feedback type="invalid">
    //                                                                 Can't recognize number
    //                                                             </Form.Control.Feedback>
    //                                                         </InputGroup>
    //                                                     </Col>
    //                                                 </Row>
    //                                             </Form>
    //                                         )
    //                                     case "boolean":
    //                                         return (
    //                                             <Form>
    //                                                 <Form.Switch custom type="switch" id="custom-switch"
    //                                                              label={value ? "True" : "False"}
    //                                                              checked={value as boolean}
    //                                                              onChange={() => {
    //                                                                  filters[filterIdx].value = !value;
    //                                                                  setFilters(filters.slice());
    //                                                              }}/>
    //                                             </Form>
    //                                         );
    //                                 }
    //                             })()}
    //                         </Toast.Body>
    //                     </Toast>
    //                 ))}
    //                 <Accordion>
    //                     {getFilteredTopologies()
    //                         .map((topology, idx) => (
    //                             <Card>
    //                                 <Accordion.Toggle as={Card.Header} eventKey={idx.toString()}
    //                                                   onClick={() => setExpandedTopology(expandedTopology === idx ? undefined : idx)}>
    //                                     {topology.name}<span
    //                                     className="float-right">{expandedTopology === idx ? "▲" : "▼"}</span>
    //                                 </Accordion.Toggle>
    //                                 <Accordion.Collapse eventKey={idx.toString()}>
    //                                     <Card.Body><JSONTree sortObjectKeys={true} theme={theme}
    //                                                          getItemString={() => <></>}
    //                                                          labelRenderer={([key], _nodeType, _expanded, expandable) => <>{camelToTitleCase(key.toString()) + (expandable ? " +" : "")}</>}
    //                                                          valueRenderer={(raw) =>
    //                                                              <code>{typeof raw === 'string' ? raw.replace(/^"+|"+$/g, '') : raw}</code>}
    //                                                          hideRoot={true} collectionLimit={2}
    //                                                          data={topology}/></Card.Body>
    //                                 </Accordion.Collapse>
    //                             </Card>
    //                         ))}
    //                 </Accordion>
    //             </Col>
    //         </Row>
    //     </Container>
    // )
}
export default P2pTopologies;