from concurrent.futures import wait, Future, as_completed
from concurrent.futures.thread import ThreadPoolExecutor
from itertools import chain
from sys import getsizeof
from typing import Callable, Dict, Mapping, Union

from fastapi import FastAPI
from pydantic.typing import AnyCallable
from starlette.middleware.cors import CORSMiddleware

from app.constants import BULK_POST_BYTE_LIMIT


def enable_cors(app: FastAPI) -> None:
    """
    Enable CORS for specific origins (clients).

    :param app: Main FastAPI _app_
    """
    origins = [
        "http://localhost:3000",
        "localhost:3000",
        "http://127.0.0.1:3000",
        "127.0.0.1:3000",
        "https://spectrum-stages-hills-galaxy.trycloudflare.com",
        "spectrum-stages-hills-galaxy.trycloudflare.com",
        "https://technique-programming-try-registered.trycloudflare.com",
        "technique-programming-try-registered.trycloudflare.com",
        "https://scale-cos-carries-rpm.trycloudflare.com",
        "scale-cos-carries-rpm.trycloudflare.com"
    ]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


def execute_parallel_tasks(task_list: list[Callable], api_pool: ThreadPoolExecutor) -> None:
    """
    Excute list of tasks in parallel and return on completion.

    :param task_list: List of tasks (callables/functions/lambdas)
    :param api_pool: Thread pool
    :return:
    """
    wait([api_pool.submit(task) for task in task_list])


def patch_dict(dict_item: dict, patch: dict) -> None:
    """
    Update a nested dictionary based on values in overriding dictionary.

    :param dict_item: Dictionary to be updated
    :param patch: Overriding dictionary
    """
    override_queue = [(patch, dict_item)]
    while override_queue:
        patch, orig = override_queue.pop()
        for key, value in patch.items():
            if isinstance(value, dict):
                override_queue.append((value, orig[key]))
            elif value is not None:
                orig[key] = value


def get_task_callback_setup(executor: ThreadPoolExecutor) -> tuple[Callable, Callable[[], None]]:
    """
    - Create a task submitter closure which runs the task in thread-pool and associates it with optional callback.
    - Create a trigger function to run the callback after each task finishes.

    :param executor:
    :return: Task submitter and trigger for callbacks.
    """
    future_to_callback: dict[Future, AnyCallable] = {}

    def submit_task(task, *args, callback=lambda _: None, **kwargs):
        future_to_callback[executor.submit(task, *args, **kwargs)] = callback

    def run_callbacks():
        for future in as_completed(future_to_callback):
            future_function = future_to_callback[future]
            future_function(future.result())

    return submit_task, run_callbacks


def get_post_data_chunks(data: list[dict]) -> list[dict]:
    """
    Generator function to split list of items into smaller lists to stay under limit.
    :param data:
    :return:
    """
    while data:
        chunk = []
        while data and getsizeof(chunk) < BULK_POST_BYTE_LIMIT:
            chunk.append(data.pop())
        yield chunk


def get_dict_diff(dicts: list[dict], ignored_keys: set[str]) -> Dict:
    assert dicts
    res = {}
    for key in dicts[0]:
        if key in ignored_keys:
            continue
        values = [dict_item[key] for dict_item in dicts]
        if isinstance(values[0], Mapping):
            conflict = get_dict_diff(values, ignored_keys) or None
        elif isinstance(values[0], list):
            conflict = get_list_value_conflict(values)
        else:
            conflict = set(values)
            if len(conflict) == 1:
                conflict = None
        if conflict is not None:
            res[key] = conflict
    return res


def get_list_value_conflict(values: list) -> Union[None, list[list]]:
    union_list = []
    for i in chain.from_iterable(values):
        if i not in union_list:
            union_list.append(i)
    conflict = None if union_list == values[0] else [union_list]
    return conflict


