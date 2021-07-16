import {auth, backendRoot, deviceState, domainState, progressState} from "./States";
import axios from "axios";
import {Accordion, Card} from "react-bootstrap";
import JSONTree from "react-json-tree";

function progressRunner(secondsEstimate: number) {
    if (progressState.setProgress === undefined) console.error("setProgress not set");
    const incrementPercent = 0.1;
    let currentProgress = 0;
    const threshold = 75;
    const incrementProgress = () => {
        progressState.setProgress?.(currentProgress);
        currentProgress += (currentProgress < threshold ? incrementPercent : (incrementPercent * (100 - currentProgress) / (100 - threshold)));
    };
    const interval = setInterval(incrementProgress, secondsEstimate / 100 * incrementPercent);
    return () => {
        clearInterval(interval);
        progressState.setProgress?.(100);
    }
}

function addEventListener(task: string, callback: () => void) {
    if (auth.token === undefined) return;
    let url = `${backendRoot}/status?` + new URLSearchParams({task: task, token: auth.token});
    const eventSource = new EventSource(url);
    console.log("Added eventsource");
    eventSource.addEventListener("ready", () => {
            eventSource.close();
            console.log("eventsource ready");
            callback();
        }
    );
}

function get(path: string, responseCallback: (responseData: any) => any, secondsEstimate: number, params: any = {}, task?: string): void {
    if (params.domainId === undefined) params.domain_id = domainState.domain;
    if (params.deviceId === undefined) params.device_id = deviceState.device;
    if (task !== undefined) {
        const tasklessArguments = Array.prototype.slice.call(arguments, 0, -1);
        addEventListener(task, get.bind(undefined, ...tasklessArguments));
    } else {
        const finishProgress = progressRunner(secondsEstimate);
        axios.get(`${backendRoot}/${path}`, {
            params: params,
            headers: {"Authorization": `bearer ${auth.token}`}
        }).then(response => responseCallback(response.data))
            .catch((reason) => {
                console.error("Some error in GET", [reason]);
                window.alert(`Some error in GET. Please check the backend logs.\n${reason}`);
            }).finally(finishProgress);
    }
}

function removeNonObjectNodes(object: { [key: string]: any }) {
    for (const [key, value] of Object.entries(object)) {
        if (typeof (value) === 'object' && !Array.isArray(value)) {
            removeNonObjectNodes(value);
        } else {
            object[key] = undefined;
        }
    }
}

export const theme = {
    scheme: 'bright',
    author: 'chris kempson (https://chriskempson.com)',
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
    arrowSign: {},
    arrowContainer: ({style}: { style: any }) => ({
        style: {
            ...style,
            display: "none",
        }
    }),
    nestedNodeLabel: ({style}: { style: any }, keyPath: any, nodeType: any, expanded: any, expandable: any) => ({
        style: {
            ...style,
            fontWeight: expandable ? 'bold' : 'default',
        },
    }),
    value: ({style}: { style: any }, nodeType: any, keyPath: (string | number)[]) => ({
        style: {
            ...style,
            marginLeft: keyPath.length > 1 ? '1.5em' : 0,
            paddingLeft: 0,
            textIndent: 0,
        },
    }),
    nestedNode: (
        {style}: { style: any },
        keyPath: (string | number)[],
        nodeType: any,
        expanded: any,
        expandable: any
    ) => ({
        style: {
            ...style,
            marginLeft: keyPath.length > 1 ? '1.5em' : 0,
            paddingLeft: 0,
        },
    }),
};


export function camelToTitleCase(camel: string) {
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
    let title = camel.replace(/(?<![A-Z])([A-Z])/g, " $1");
    title = title.charAt(0).toUpperCase() + title.slice(1);
    title = replacements.reduce((str, [from, to]) => str.replace(from, to), title)
    return title;
}


function post(path: string, responseCallback: (responseData: any) => any, secondsEstimate: number, body: Object = {}, params: any = {}, task?: string): void {
    if (params.domainId === undefined) params.domain_id = domainState.domain;
    if (params.deviceId === undefined) params.device_id = deviceState.device;
    if (task !== undefined) {
        const tasklessArguments = Array.prototype.slice.call(arguments, 0, -1);
        addEventListener(task, post.bind(undefined, ...tasklessArguments));
    } else {
        const finishProgress = progressRunner(secondsEstimate);
        axios.post(`${backendRoot}/${path}`, body, {
            params: params,
            headers: {"Authorization": `bearer ${auth.token}`}
        }).then(response => responseCallback(response.data))
            .catch((reason) => {
                console.error("Some error in POST", [reason]);
                window.alert(`Some error in POST. Please check the backend logs.\n${reason}`);
            }).finally(finishProgress);
    }
}


function getKeyPathValue(object: { [key: string]: any }, keyPath: (string | number)[]): unknown {
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

function setKeyPathValue(object: any, keyPath: (string | number)[], value: any) {
    console.log("set", object, keyPath, value);
    for (let i = keyPath.length - 1; i > 0; --i) {
        object = object[keyPath[i]];
    }
    object[keyPath[0]] = value;
}

function isListConflictNode(value: any) {
    return Array.isArray(value) && value.length === 1;
}


export {progressRunner, get, post, removeNonObjectNodes, getKeyPathValue, setKeyPathValue, isListConflictNode};

export function renderTopologyTree(setExpandedTopology: (value: (((prevState: (number | undefined)) => (number | undefined)) | number | undefined)) => void, expandedTopology: number | undefined) {
    return (topology: any, idx: number) => (
        <Card>
            <Accordion.Toggle as={Card.Header} eventKey={idx.toString()}
                              onClick={() => setExpandedTopology(expandedTopology === idx ? undefined : idx)}>
                {topology.name}<span
                className="float-right">{expandedTopology === idx ? "▲" : "▼"}</span>
            </Accordion.Toggle>
            <Accordion.Collapse eventKey={idx.toString()}>
                <Card.Body><JSONTree sortObjectKeys={true} theme={theme} getItemString={() => <></>}
                                     labelRenderer={([key], _nodeType, _expanded, expandable) => <>{camelToTitleCase(key.toString()) + (expandable ? " +" : "")}</>}
                                     valueRenderer={(raw) =>
                                         <code>{typeof raw === 'string' ? raw.replace(/^"+|"+$/g, '') : raw}</code>}
                                     hideRoot={true} collectionLimit={2}
                                     data={topology}/></Card.Body>
            </Accordion.Collapse>
        </Card>
    );
}