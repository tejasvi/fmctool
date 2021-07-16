#!/usr/bin/env python3
import uvicorn

if __name__ == '__main__':
    """Start the backend server at specified host and port. Restart on source file modifications."""
    uvicorn.run("app.api:app", host="127.0.0.1", port=8000, reload=True)
