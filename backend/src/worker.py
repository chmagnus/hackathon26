"""Cloudflare Workers entry point (wrangler.jsonc "main").

Cloudflare loads the files in this folder as top-level modules, but the API is the package `src`, with relative
imports, as `uvicorn src.main:app` runs it locally. Registering this folder under that name first lets `src.main`
and its imports load unchanged.
"""
import importlib.util
import os
import sys

if "src" not in sys.modules:
    here = os.path.dirname(os.path.abspath(__file__))
    spec = importlib.util.spec_from_file_location("src", os.path.join(here, "__init__.py"), submodule_search_locations=[here])
    package = importlib.util.module_from_spec(spec)
    sys.modules["src"] = package
    spec.loader.exec_module(package)

from src.main import app  # noqa: E402
from workers import asgi  # noqa: E402

Default = asgi.entrypoint(app)
