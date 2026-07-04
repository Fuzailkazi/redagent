"""Adapter tests against a local http.server: verify {{PROMPT}} injection into
the body template and dotted responsePath extraction (including array indices),
plus ${ENV_VAR} resolution and error handling."""

import json
import os
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

import pytest

import redteam


class _EchoHandler(BaseHTTPRequestHandler):
    received = []  # captured request bodies + headers

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length).decode("utf-8"))
        _EchoHandler.received.append({
            "body": body,
            "auth": self.headers.get("Authorization"),
        })
        # Echo the user content back inside a nested, array-indexed shape.
        content = body["messages"][0]["content"]
        payload = {"choices": [{"message": {"role": "assistant",
                                            "content": f"echo: {content}"}}]}
        data = json.dumps(payload).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *args):
        pass


@pytest.fixture
def server():
    _EchoHandler.received = []
    httpd = HTTPServer(("127.0.0.1", 0), _EchoHandler)
    port = httpd.server_address[1]
    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()
    yield port
    httpd.shutdown()


def test_prompt_injection_and_dotted_path(server):
    os.environ["TEST_TOKEN"] = "secret-123"
    target = {
        "name": "local",
        "url": f"http://127.0.0.1:{server}/chat",
        "method": "POST",
        "headers": {"Authorization": "Bearer ${TEST_TOKEN}"},
        "bodyTemplate": {"messages": [{"role": "user", "content": "{{PROMPT}}"}]},
        "responsePath": "choices.0.message.content",
    }
    out = redteam.send_probe(target, "hello world", timeout_ms=5000)
    assert out == "echo: hello world"

    # {{PROMPT}} was injected into the body sent over the wire.
    assert _EchoHandler.received[0]["body"]["messages"][0]["content"] == "hello world"
    # ${ENV_VAR} was resolved in the header.
    assert _EchoHandler.received[0]["auth"] == "Bearer secret-123"


def test_extract_path_array_indices():
    obj = {"choices": [{"message": {"content": "A"}},
                       {"message": {"content": "B"}}]}
    assert redteam.extract_path(obj, "choices.1.message.content") == "B"
    assert redteam.extract_path(obj, "choices.0.message.content") == "A"
    assert redteam.extract_path(obj, "choices.9.message.content") is None
    assert redteam.extract_path(obj, "missing.path") is None


def test_inject_prompt_is_recursive():
    template = {"a": "{{PROMPT}}", "b": ["x", {"c": "pre-{{PROMPT}}-post"}]}
    out = redteam.inject_prompt(template, "P")
    assert out == {"a": "P", "b": ["x", {"c": "pre-P-post"}]}


def test_resolve_env_missing_raises():
    with pytest.raises(redteam.RedteamError):
        redteam.resolve_env("Bearer ${DEFINITELY_NOT_SET_ENV_XYZ}")


def test_send_probe_transport_error_becomes_error_verdict():
    # Nothing listening on this port -> send raises -> runner records ERROR.
    target = {
        "name": "dead",
        "url": "http://127.0.0.1:1/chat",
        "method": "POST",
        "headers": {},
        "bodyTemplate": {"messages": [{"role": "user", "content": "{{PROMPT}}"}]},
        "responsePath": "choices.0.message.content",
    }
    library = {"version": "0.1.0", "probes": [{
        "id": "x-001", "category": "prompt_injection", "owasp": "AAI01",
        "severity": "low", "prompt": "hi",
        "detection": {"tier1": {"mode": "regex", "failIfMatches": ["z"],
                                "passIfMatches": ["q"]}},
    }]}
    results = redteam.run_scan(
        library, lambda p: redteam.send_probe(target, p["prompt"], 1000))
    assert results[0]["verdict"] == redteam.ERROR
    assert results[0]["error"] is not None
