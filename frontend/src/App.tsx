import {FormEvent, ReactElement, useEffect, useState, MouseEvent} from 'react';
import Skeleton from 'react-loading-skeleton';
import JSONTree from 'react-json-tree'
import Button from 'react-bootstrap/Button';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import axios, {AxiosResponse} from 'axios';
import {
    Accordion,
    ButtonGroup,
    Jumbotron,
    Container,
    Navbar,
    Card,
    Toast,
    Col,
    Dropdown,
    DropdownButton,
    Form,
    InputGroup,
    ListGroup,
    Modal,
    Badge,
    ProgressBar,
    Row
} from "react-bootstrap";


function removeNonObjectNodes(object: {[key: string]: any}) {
    for (const [key, value] of Object.entries(object)) {
        if (typeof(value) === 'object' && !Array.isArray(value)) {
            removeNonObjectNodes(value);
        } else {
            object[key] = undefined;
        }
    }
}

function getKeyPathValue(object: {[key: string]: any}, keyPath: (string|number)[]): unknown {
    console.log("get", object, keyPath);
    try {
        for (let i = keyPath.length - 1; i >= 0; --i) {
            object = object[keyPath[i]];
        }
    } catch (e) {
        if (e instanceof TypeError) {
            return undefined;
        }
        throw e;
    }
    return object;
}

function setKeyPathValue(object: any, keyPath: (string|number)[], value: any) {
    console.log("set", object, keyPath, value);
    for (let i = keyPath.length - 1; i > 0; --i) {
        object = object[keyPath[i]];
    }
    object[keyPath[0]] = value;
}

const theme = {
  scheme: 'bright',
  author: 'chris kempson (http://chriskempson.com)',
  base00: '#000000',
  base01: '#303030',
  base02: '#505050',
  base03: '#000000',
  base04: '#d0d0d0',
  base05: '#e0e0e0',
  base06: '#f5f5f5',
  base07: '#ffffff',
  base08: '#fb0120',
  base09: '#fc6d24',
  base0A: '#fda331',
  base0B: '#a1c659',
  base0C: '#76c7b7',
  base0D: '#6fb3d2',
  base0E: '#d381c3',
  base0F: '#be643c',
  arrowSign: {
    },
  arrowContainer: ({ style } : {style: any}) => ({
      style: {
        ...style,
      display: "none",
      }
    }),
  nestedNodeLabel: ({ style } : {style: any}, keyPath: any, nodeType: any, expanded: any, expandable: any) => ({
      style: {
        ...style,
        fontWeight: expandable ? 'bold' : 'default',
      },
    }),
    value: ({ style } : {style: any}, nodeType: any, keyPath: (string | number)[]) => ({
      style: {
        ...style,
        marginLeft: keyPath.length > 1 ? '1.5em' : 0,
        paddingLeft: 0,
        textIndent:0,
      },
    }),
     nestedNode: (
      { style }: {style: any},
      keyPath: (string | number)[],
      nodeType: any,
      expanded: any,
      expandable:any
    ) => ({
      style: {
        ...style,
        marginLeft: keyPath.length > 1 ? '1.5em' : 0,
        paddingLeft: 0,
      },
    }),
};

function camelToTitleCase(camel: string) {
    const replacements = [
        ["Id", "ID"],
        ["Ike", "IKE"],
        ["Ipsec", "IPsec"],
        ["Tfc", "TFC"],
        ["V2", "v2"],
        ["V1", "v1"],
        ["Sa", "SA"],
        ["Icmp", "ICMP"],
    ];
    let title = camel.replace( /(?<![A-Z])([A-Z])/g, " $1" );
    title = title.charAt(0).toUpperCase() + title.slice(1);
    title = replacements.reduce((str, [from, to])=> str.replace(from, to), title)
    return title;
}



const backendRoot = "http://127.0.0.1:8000";
// const backendRoot = "https://technique-programming-try-registered.trycloudflare.com";

// TODO: Write as component
function getModal(title: JSX.Element, header?: JSX.Element, body?: JSX.Element, footer?: JSX.Element): JSX.Element {
    return (
        <Modal.Dialog>
            <Modal.Header>
                <Modal.Title>{title}</Modal.Title>
                {header}
            </Modal.Header>
            <Modal.Body>{body}</Modal.Body>
            {footer ? <Modal.Footer>{footer}</Modal.Footer> : undefined}
        </Modal.Dialog>
    )
}

interface Filter {
    keyPath: string[];
    value: string | [number, number] | boolean;
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

function App() {
    const [progress, setProgress] = useState<number>(100);
    const [progressLabel, setProgressLabel] = useState<string>("");
    const [token, setToken] = useState<string>();
    const [domains, setDomains] = useState<{ [key: string]: string }>();
    const [domainId, setDomainId] = useState<string>();
    const [devices, setDevices] = useState<any[]>();
    const [deviceId, setDeviceId] = useState<string>();
    const [topologies, setTopologies] = useState<any[]>();
    const [conflicts, setConflicts] = useState<any[]>();
    const [override, setOverride] = useState<{[key: string]: any}>();
    const [invalidFilters, setInvalidFilters] = useState<Set<number>>(new Set());
    const [expandedTopology, setExpandedTopology] = useState<number>();
    const [deployed, setDeployed] = useState<boolean>();

    function getDefaultFilter(): Filter {
        return {keyPath: ["name"], value: ""};
    }

    const [filters, setFilters] = useState<Filter[]>([getDefaultFilter()]);
    const [hnsTopologies, setHnsTopologies] = useState<any[]>();

    useEffect(()=>{if (domainId !== undefined) 
            getDevices();
    }, [domainId]);
    useEffect(()=>{if (deviceId !== undefined) getTopologies()}, [deviceId]);

    function progressRunner(secondsEstimate: number, labelCallback: (arg0: number) => void) {
        const incrementPercent = 0.1;
        secondsEstimate = 0.1;
        let currentProgress = 0;
        const threshold = 75;
        const incrementProgress = () => {
            setProgress(currentProgress);
            currentProgress += (currentProgress < threshold ? incrementPercent : (incrementPercent * (100 - currentProgress) / (100-threshold)));
            if (progress > 20) labelCallback(currentProgress);
        };
        const interval = setInterval(incrementProgress, secondsEstimate / 100 * incrementPercent);
        return () => {
            clearInterval(interval);
            setProgress(100);
        }
    }

    function get(path: string, params: any = {}): Promise<AxiosResponse> {
        if (params.domainId === undefined) params.domain_id = domainId;
        if (params.deviceId === undefined) params.device_id = deviceId;
        return axios.get(`${backendRoot}/${path}`, {params: params, headers: {"Authorization": `bearer ${token}`}});
    }

    function post(path: string, body: Object = {}, params: any = {}): Promise<AxiosResponse> {
        if (params.domainId === undefined) params.domain_id = domainId;
        if (params.deviceId === undefined) params.device_id = deviceId;
        return axios.post(`${backendRoot}/${path}`, body, {
            params: params,
            headers: {"Authorization": `bearer ${token}`}
        });
    }

    function loginGetDomains(e: FormEvent<HTMLFormElement>) {
        const finishProgress = progressRunner(5, (progress: number) => {
            if (progress < 50) setProgressLabel("Connecting FMC"); else setProgressLabel("Logging in");
        });
        const formData = new FormData(e.currentTarget);
        const host = formData.get("host");
        if (host === null) throw new Error("Host not supplied");
        formData.delete("host");
        formData.append("scope", host);
        formData.append("grant_type", "password");
        console.log("Sent:", formData);
        axios.post(`${backendRoot}/token`, formData).then(response => {
            console.log("Token", response.data["access_token"], response.data["domain_names"]);
            const token = response.data["access_token"];
            setToken(token);
            setDomains(response.data["domains"]);
        }).catch((reason) => {
            if (reason.response === undefined || reason.response.status === 404) {
                console.error("Could not connect to server.");
            } else {
                console.error("Unauthorized");
            }
        }).finally(finishProgress);
        e.preventDefault();
    }

    function getDomains() {
        const finishProgress = progressRunner(5, (progress: number) => {
            if (progress < 50) setProgressLabel("Connecting FMC"); else setProgressLabel("Logging in");
        });
        return get("domains").then(response => {
            console.log("Domain Names", response.data);
            setDomains(response.data["domains"]);
        }).catch((reason) => {
            console.error("Some error", reason);
        }).finally(finishProgress);
    }


    function getDevices() {
        const finishProgress = progressRunner(5, (progress: number) => {
            if (progress < 50) setProgressLabel("Connecting FMC"); else setProgressLabel("Getting devices");
        });
        get("devices").then(response => {
            console.log("Devices", response.data);
            setDevices(response.data);
        }).catch((reason) => {
            console.error("Some error", [reason]);
        }).finally(finishProgress);
    }

    function getTopologies() {
        const finishProgress = progressRunner(5, (progress: number) => {
            if (progress < 50) setProgressLabel("Connecting FMC"); else setProgressLabel("Fetching topologies");
        });
        console.log("Device ID: ", deviceId);
        if (token === undefined) throw new Error();
        let url = `${backendRoot}/status?` + new URLSearchParams({task: "device_p2p_topologies", token: token});
        const eventSource = new EventSource(url);
        console.log("Added eventsource");
        eventSource.addEventListener("ready", ()=>{
            eventSource.close();
            console.log("eventsource ready");
            get("topologies").then(response => {
                console.log("Topologies", response.data);
                setTopologies(response.data);
            }).catch((reason) => {
                console.error("Some error", reason);
            }).finally(finishProgress)
        }
        );
    }

    function getHnsTopologies() {
        const filteredTopologies = getFilteredTopologies();
        const finishProgress = progressRunner(30, (progress: number) => {
            if (progress < 50) setProgressLabel("Connecting FMC"); else setProgressLabel("Calculating topologies");
        });
        post("hns-topologies", {p2p_topology_ids: filteredTopologies.map(t=>t.id), override: override}).then(response=>{
            console.log("HNS topologies", response.data);
            setHnsTopologies(response.data);
        }).catch((reason) => {
            console.error("Some error", reason);
        }).finally(finishProgress);
    }

    function getFilteredTopologies() {
        if (topologies === undefined) throw new Error("Topologies is undefined");
        const filteredTopologies = topologies.filter(topology => {
                            for (let idx = 0; idx < filters.length; ++idx) {
                                if (invalidFilters.has(idx)) continue;
                                const {keyPath, value} = filters[idx];
                                let node = topology;
                                for (const key of keyPath) {
                                    node = node[key];
                                }
                                switch (typeof value) {
                                    case 'string':
                                        const regex = new RegExp(value);
                                        if (!regex.test(node)) return false;
                                        break;
                                    case 'object':
                                        console.log("comparing", value, [node]);
                                        const [min, max] = value as [number, number];
                                        if (!(node >= min && node <= max)) return false;
                                        break;
                                    case 'boolean':
                                        if (node !== value) return false;
                                        break;
                                    default:
                                        throw new Error(`Invalid type ${typeof value}. keyPath: ${keyPath}. Filters: ${filters}`);
                                }
                            }
                            return true;
                        })
        return filteredTopologies;
    }

    function deploy() {
        const finishProgress = progressRunner(0, (progress: number) => {
            if (progress < 50) setProgressLabel("Connecting FMC"); else setProgressLabel("Deploying");
        });
        post("deploy").then(response => {
            console.log("Deployed?", response.data);
        }).catch((reason) => {
            console.error("Some error", reason);
        }).finally(finishProgress);
        setDeployed(true); // TODO: move to then
    }


    function getConflicts() {
        const finishProgress = progressRunner(1, (progress: number) => {
            if (progress < 50) setProgressLabel("Connecting FMC"); else setProgressLabel("Checking conflicts");
        });
        const topology_ids = getFilteredTopologies().map(topology=>topology.id);
        post("conflicts", {topology_ids}).then(response=> {
            console.log("Conflicts", response.data);
            const conflicts_data = response.data;
            setConflicts(conflicts_data);
            const override = JSON.parse(JSON.stringify(conflicts_data));
            console.log("None obj nodes", JSON.parse(JSON.stringify(override)));
            removeNonObjectNodes(override);
            console.log("After None obj nodes", JSON.parse(JSON.stringify(override)));
            setOverride(override)
            for (const _ in conflicts_data) {
                return;
            }
            getHnsTopologies();
        }).catch((reason) => {
            console.error("Some error", reason);
        }).finally(finishProgress);
    }

    function isListConflictNode(value: any) {
        return Array.isArray(value) && value.length === 1;
    }

    if (progress < 100) {
        return (
            <div className="justify-content-md-center">
            <ProgressBar now={progress} label={progressLabel}/>
            <Skeleton width={"70vw"}  style={{ margin: "15vw", marginTop: "5vw", borderRadius: 10, height:"50vh" }}>
            </Skeleton>
            </div>
        );
    } else if (deployed !== undefined) {
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
    } else if (hnsTopologies !== undefined) {
        return (
            <Container>
                <Row className="justify-content-md-center">
                    <Col className="justify-content-md-center">
                    <Header onBack={()=>alert("back")} onNext={deploy} header="Merged topology" nextVariant="success" nextString="Deploy"/>
                    <Accordion defaultActiveKey="0">
                        {hnsTopologies.map((topology, idx) => (
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
    } else if (conflicts !== undefined && override !== undefined) {
        return (
            <Container>
                <Row className="justify-content-md-center">
                    <Col className="justify-content-md-center">
                    <Header onBack={()=>alert("back")} onNext={getHnsTopologies} header="Conflicts" nextVariant="success"/>
                            <Card>
                                        <Card.Body><JSONTree  sortObjectKeys={true} theme={theme} getItemString={() => <></>}
                                        labelRenderer={(keyPath, nodeType, expanded, expandable) => {
                                            const value = getKeyPathValue(override, keyPath);
                                            const label = camelToTitleCase(keyPath[0].toString()) + (expandable ? (expanded ? " ↴" : " +") : ":");
                                            if (nodeType === "Array" && getKeyPathValue(conflicts, keyPath) !== undefined) {
                                                return (<>
                                                    <Form.Row>
                                                    <InputGroup hasValidation className="form-inline">
                                                        <InputGroup.Prepend>
                                                            <InputGroup.Text>{label}</InputGroup.Text>
                                                          </InputGroup.Prepend>
                                                                <Form.Control type="text" placeholder="Override" as="textarea"
                                                                              rows={ typeof value === 'string' ? value.split('\n').length : 1 }
                                                                              value={ typeof value === 'string' ? value : undefined}
                                                                              isInvalid={(()=>{
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
                                                                              onClick={(e: MouseEvent<HTMLTextAreaElement>)=>{e.preventDefault(); e.stopPropagation()}}
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
                                    <Badge  variant="light" pill onClick={()=>{
                                            const parentPath = keyPath.slice(1);
                                            const currentValue = getKeyPathValue(override, parentPath);
                                            console.log("valueclick", {override, parentPath, value, currentValue});
                                            if (currentValue === undefined || typeof currentValue === 'string') {
                                                console.log("IN");
                                                setKeyPathValue(override, parentPath, JSON.stringify(value));
                                                setOverride({...override});
                                            }
                                        }}
                                        style={{ cursor: 'pointer'}}>{valueString.replace(/^"+|"+$/g, '')}
                                    </Badge>
                                    )} hideRoot={true} collectionLimit={2} data={conflicts} />
                                    </Card.Body>
                                
                            </Card>
                    </Col>
                </Row>
            </Container>
        );
    } else if (topologies !== undefined) {
        return (
            <>
            <Container>
            <Row className="justify-content-md-center">
                <Col className="justify-content-md-center">
                <Navbar bg="light" sticky="top" >
                  <Container>
                    <Navbar.Brand>
                    <h1>Filter topologies</h1>
                    </Navbar.Brand>
                      <Navbar.Collapse className="justify-content-end">
                            <Button variant="primary" onClick={getConflicts}>Next</Button>
                      </Navbar.Collapse>
                  </Container>
                </Navbar>
                {filters.map(({keyPath, value}, filterIdx) => (
                    <Toast onClose={() => {
                                    console.log("Remove: ", filters, filterIdx);
                                    filters.splice(filterIdx, 1);
                                    setFilters(filters.length > 0 ? filters.slice() : [getDefaultFilter()]);
                                }}>
                        <Toast.Header closeLabel={"Remove"}>
                            <ButtonGroup>
                                <Button as={ButtonGroup} variant="success" onClick={() => {
                                    console.log("Insert: ", filters, filterIdx);
                                    filters.splice(filterIdx + 1, 0, getDefaultFilter());
                                    setFilters(filters.slice());
                                }}>+</Button>
                                {keyPath.map((key, keyIdx) => {
                                    let parent = topologies[0];
                                    for (let i = 0; i < keyIdx; ++i) {
                                        parent = parent[keyPath[i]];
                                    }
                                    return (
                                        <DropdownButton as={ButtonGroup}
                                                        title={camelToTitleCase(key.length < 15 ? key : key.substring(0, 15) + "..")}
                                                        className={Object.keys(parent).length === 1 ? "nocaret" : undefined}
                                                        id="bg-nested-dropdown" block>{
                                            (() => {
                                                console.log("undefined check", parent, keyIdx, key, keyPath);
                                                return Object.keys(parent).map(sibling => (
                                                    <Dropdown.Item eventKey={sibling} active={sibling === key}
                                                                   onSelect={eventKey => {
                                                                       console.log("Onselect", eventKey, keyPath, keyIdx, parent);
                                                                       if (eventKey === null) return;
                                                                       keyPath[keyIdx] = eventKey;
                                                                       let curIdx = keyIdx;
                                                                       let curKey = eventKey;
                                                                       while (typeof parent[curKey] === "object") {
                                                                           parent = parent[curKey];
                                                                           curKey = Object.keys(parent)[0];
                                                                           console.log(curKey, parent);
                                                                           curIdx += 1;
                                                                           keyPath[curIdx] = curKey;
                                                                       }
                                                                       keyPath.length = curIdx + 1;
                                                                       switch (typeof parent[curKey]) {
                                                                           case "string":
                                                                               value = "";
                                                                               break;
                                                                           case "number":
                                                                               value = [Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY];
                                                                               break;
                                                                           case "boolean":
                                                                               value = false;
                                                                               break;
                                                                           default:
                                                                               throw (new Error("Invalid type"));
                                                                       }
                                                                       const filter = filters[filterIdx];
                                                                       filter.value = value;
                                                                       console.log(keyPath, filters);
                                                                       setFilters(filters.slice());
                                                                   }}>
                                                        {typeof sibling === 'string' ? camelToTitleCase(sibling) : sibling}
                                                    </Dropdown.Item>
                                                ));
                                            })()
                                        }</DropdownButton>
                                    )
                                })}
                            </ButtonGroup>
                        </Toast.Header>
                        <Toast.Body>
                            {(() => {
                                switch (typeof value) {
                                    case "string":
                                        return (
                                            <Form>
                                                <Form.Group controlId="exampleForm.ControlInput1">
                                                    <Form.Label>Regex</Form.Label>
                                                    <InputGroup hasValidation>
                                                        <Form.Control type="text" placeholder="Regex"
                                                                      value={value as string || ""}
                                                                      isInvalid={invalidFilters.has(filterIdx)}
                                                                      onChange={e => {
                                                                          const regex = e.target.value;
                                                                          try {
                                                                              new RegExp(regex);
                                                                              if (invalidFilters.delete(filterIdx)) {
                                                                                  setInvalidFilters(new Set(invalidFilters));
                                                                              }
                                                                          } catch (SyntaxError) {
                                                                              invalidFilters.add(filterIdx);
                                                                              setInvalidFilters(new Set(invalidFilters));
                                                                          }
                                                                          filters[filterIdx].value = regex;
                                                                          setFilters(filters.slice());
                                                                      }}/>
                                                        <Form.Control.Feedback type="invalid">
                                                            Regex has some error
                                                        </Form.Control.Feedback>
                                                    </InputGroup>
                                                </Form.Group>
                                            </Form>
                                        )
                                    case "object":
                                        const numberChange = (e: FormEvent<HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement>, isMin: boolean) => {
                                            (filters[filterIdx].value as [number, number])[isMin ? 0 : 1] = Number(e.currentTarget.value);
                                            console.log("Value: ", Number(e.currentTarget.value));
                                            setFilters(filters.slice());
                                        }
                                        const numValue = value as [number, number];
                                        const numError = (
                                            <Form.Control.Feedback type="invalid">
                                                Can't recognize number
                                            </Form.Control.Feedback>
                                        );
                                        console.log("Timestamp:", numValue);
                                        return (
                                            <Form>
                                                    <Form.Label>Number range (inclusive)</Form.Label>
                                                    <Row>
                                                        <Col>
                                                    <InputGroup hasValidation>
                                                            <Form.Control type="text" placeholder="-Infinity"
                                                                          isInvalid={isNaN(numValue[0])}
                                                                          onChange={e => numberChange(e, true)}/>
                                                            {numError}
                                                    </InputGroup>
                                                        </Col>
                                                        to
                                                        <Col>
                                                    <InputGroup hasValidation>
                                                            <Form.Control type="text" placeholder="Infinity"
                                                                          isInvalid={isNaN(numValue[1])}
                                                                          onChange={e => numberChange(e, false)}/>
                                                        <Form.Control.Feedback type="invalid">
                                                            Can't recognize number
                                                        </Form.Control.Feedback>
                                                    </InputGroup>
                                                        </Col>
                                                    </Row>
                                            </Form>
                                        )
                                    case "boolean":
                                        return (
                                            <Form>
                                                <Form.Switch custom type="switch" id="custom-switch"
                                                             label={value ? "True" : "False"} checked={value as boolean}
                                                             onChange={() => {
                                                                 filters[filterIdx].value = !value;
                                                                 setFilters(filters.slice());
                                                             }}/>
                                            </Form>
                                        );
                                }
                            })()}
                        </Toast.Body>
                    </Toast>
                ))}
                <Accordion>
                    {getFilteredTopologies()
                        .map((topology, idx) => (
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
                </Col>
            </Row>
            </Container>
            </>
        )
    } else if (devices !== undefined) {
        return (
            <>
                {getModal(<h1>Choose device</h1>, undefined, (
                    <ListGroup>
                        {
                            devices.map((device) => (
                                <ListGroup.Item action onClick={() => {
                                    setDeviceId(device.id);
                                }}>
                                    {device.name}
                                </ListGroup.Item>
                            ))
                        }
                    </ListGroup>
                ))}
            </>
        )
    } else if (domains !== undefined) {
        return (
            <>
                {getModal(<h1>Choose domain</h1>, undefined, (
                    <ListGroup>
                        {Object.entries(domains).map(([id, name]) => (
                            <ListGroup.Item action onClick={() => {
                                setDomainId(id);
                            }}>
                                {name}
                            </ListGroup.Item>
                        ))}
                    </ListGroup>
                ))}
            </>
        )
    } else if (token === undefined) {
        const host = "host";
        const username = "username";
        const password = "password";

        return (

            <Form onSubmit={loginGetDomains}>
                {getModal(<>Tool</>, undefined, (
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
                ), (
                    <Button variant="primary" type="submit" block>
                        Login
                    </Button>
                ))}
            </Form>
        )
    }

    return <p>:(</p>
}

export default App;
