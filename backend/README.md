## Dev setup
* Python 3.9 required. Creating a corresponding Pipenv will be convenient.
* Install dependencies using `pip -r requirements.txt`
* For starting  or debugging, run `main.py`. The server will automatically reload on code modifications.
* Execute `./recreate.py` to delete all the existing topologies and recreate newer ones for testing. Make sure the constants specified in it match the FMC configuration.
* Check if the client URL (usually `http://localhost:3000`) is included in the `ALLOWED_CORS_ORIGINS` constant in `utils.py`.
* Visit `$SERVER_HOST:$PORT/docs` to get the Swagger API documentation for the routes.

## Libraries
* [FastAPI](https://fastapi.tiangolo.com/tutorial/) is used to build the backend API.
* [`fmcapi`](https://github.com/tejasvi/fmcapi) is used for making FMC API requests.

## Code structure
* `main.py` starts the server.
* `app/api.py` contains all the backend routes used by the client.
    * `app/api_utils.py` contains the utility functions used by the routes.
    * `app/models.py` contains the _data models_ used by the routes.
* `app/fmc_session.py` contains the class methods used by routes.
    * `app/fmc_utils.py` provides FMC specific utility functions.
* `app/utils.py` contains the general-purpose utility functions.
* `app/constants.py` contains the application wide constants.
