## Dev setup

* Set `BACKEND_ROOT` to the host address of the backend server (usually `http://localhost:8000`) in `src/utils.tsx`.
* Install the package dependencies with `npm install`.
* `npm start` to run the app on [`http://localhost:3000`](http://localhost:3000). _Usually_ it auto-reloads on source file changes.
* Compared to backend code, frontend code is less modular. Code folding will come handy.

## Libraries used

* React as frontend framework. (CRA)
* [React-Bootstrap](https://react-bootstrap.github.io/) for styled components.
* [`react-json-tree`](https://github.com/reduxjs/redux-devtools/tree/master/packages/react-json-tree) for rendering JSON objects as trees.

## Code Structure

* `src/App.tsx` contains the root component.
* `src/App.css` contains app-wide styles.
* Pages
    * `src/pages/Login.tsx` page shows the login screen.
    * `src/pages/Domain.tsx` page shows the available domains on FMC>
    * `src/pages/TopologyChoice.tsx` page shows possiblity to create new topology or merge into an existing one.
    * `src/pages/Device.tsx` page shows the device list to choose the hub device for new topology.
    * `src/pages/ExistingHnsTopologies.tsx` page shows the existing hub-and-spoke topologies to merge into.
    * `src/pages/P2pTopologies.tsx` page shows the point-to-point topologies with the filtering abilities.
    * `src/pages/Conflict.tsx` page shows the point-to-point topology conflicts before merging.
    * `src/pages/Merged.tsx` page shows the merged topology with and option to deploy.
    * `src/pages/Deploy.tsx` page shows the deployment success screen.
* `src/Components.tsx` contains the generic components.
* `src/utils.tsx` contains the utility functions.
* `src/States.tsx` contains the _state_ objects used by the components and pages.
