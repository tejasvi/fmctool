import {pageState, progressState} from "./States";
import {ReactElement, useState} from "react";
import Login from "./pages/Login";
import {Progress} from "./Components";
import 'bootstrap/dist/css/bootstrap.min.css';


function App() {
    const [progress, setProgress] = useState<number>(100);
    progressState.setProgress = setProgress;
    const [page, setPage] = useState<ReactElement>(<Login/>);
    pageState.setPage = setPage;

    if (progress !== undefined && progress < 100) {
        return <Progress now={progress}/>
    } else if (page !== undefined) {
        return page;
    }

    return <>:(</>
}

export default App;