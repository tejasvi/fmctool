## Libraries
* [FastAPI](https://fastapi.tiangolo.com/tutorial/) is used to build the backend API.
* [`fmcapi`](https://github.com/tejasvi/fmcapi) is used for making FMC API requests.

## Code structure
* `main.py` starts the server.
* `app/api.py` contains all the backend routes used by the client.
    * `app/dependencies.py` contains the dependencies required by the backend API routes (e.g. auth token).
    * `app/models.py` contains the _data models_ used by the routes.
* `app/fmc_session.py` contains the class methods used by routes.
    * `app/fmc_utils.py` provides FMC specific utility functions.
* `app/utils.py` contains the general-purpose utility functions.
* `app/constants.py` contains the application wide constants.