import {auth, backendRoot, deviceState, domainState, progressState} from "./States";
import axios, {AxiosResponse} from "axios";

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
    let url = `${backendRoot}/status?` + new URLSearchParams({task: task, token: token});
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
    const finishProgress = progressRunner(secondsEstimate);
    if (task !== undefined) {
        const tasklessArguments = Array.prototype.slice.call(arguments, 0, -1);
        addEventListener(task, get.bind(undefined, ...tasklessArguments));
    } else {
        axios.get(`${backendRoot}/${path}`, {
            params: params,
            headers: {"Authorization": `bearer ${auth.token}`}
        }).then(response => responseCallback(response.data))
            .catch((reason) => {
                console.error("Some error in GET", [reason]);
            }).finally(finishProgress);
    }
}


function post(path: string, responseCallback: (response: AxiosResponse) => any, secondsEstimate: number, body: Object = {}, params: any = {}): void {
    if (params.domainId === undefined) params.domain_id = domainState.domain;
    if (params.deviceId === undefined) params.device_id = deviceState.device;
    const finishProgress = progressRunner(secondsEstimate);
    if (task !== undefined) {
        const tasklessArguments = Array.prototype.slice.call(arguments, 0, -1);
        addEventListener(task, post.bind(undefined, ...tasklessArguments));
    } else {
        axios.post(`${backendRoot}/${path}`, body, {
            params: params,
            headers: {"Authorization": `bearer ${auth.token}`}
        }).then(response => responseCallback(response.data))
            .catch((reason) => {
                console.error("Some error in POST", [reason]);
            }).finally(finishProgress);
    }
}


export {progressRunner, get, post};
