import {ReactElement} from "react";

interface Page {
    setPage: (element: ReactElement) => void,
}

const pageState: Page = {
    setPage: e => {
        throw new Error(`setPage not set. Trying to render ${JSON.stringify(e)}`);
    }
}


interface Auth {
    token?: string,
}

const auth: Auth = {};

interface Progress {
    setProgress: (progress: number) => void,
}

const progressState: Progress = {
    setProgress: () => {
        throw new Error("setProgress not set");
    }
};

interface Domain {
    domain?: string,
}

const domainState: Domain = {};

interface Device {
    device?: string,
}

const deviceState: Device = {};

interface FilteredTopologies {
    id_list?: string[],
}

const filteredTopologiesState: FilteredTopologies = {};

interface Override {
    override?: any,
}

const overrideState: Override = {};

interface newTopology {
    hnsTopologyId?: string;
}

const newTopologyState:newTopology = {};

const backendRoot = "http://127.0.0.1:8000";
// const backendRoot = "https://technique-programming-try-registered.trycloudflare.com";

export {backendRoot, pageState, auth, progressState, domainState, deviceState, filteredTopologiesState, overrideState, newTopologyState};