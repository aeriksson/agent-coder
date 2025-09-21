"""
Test utilities for agent testing via API.

Provides clean, clear testing interface that always goes through the API
and presents results in a format optimized for understanding agent behavior.
"""

import json
import time
import httpx
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.syntax import Syntax

console = Console()


class AgentTestClient:
    """Client for testing agents via the API."""

    def __init__(self, base_url: str = None, spawn_server: bool = False):
        """
        Initialize test client.

        Args:
            base_url: Base URL of the agent server (defaults to http://localhost:8000 if spawning, http://api:3030 otherwise)
            spawn_server: If True, spawn a server process for this test session
        """
        self.spawn_server = spawn_server
        if base_url is None:
            self.base_url = (
                "http://localhost:8000" if spawn_server else "http://api:3030"
            )
        else:
            self.base_url = base_url.rstrip("/")
        self.server_process = None
        self.client = httpx.Client(timeout=120.0)  # 2 minute timeout

        if spawn_server:
            self._start_server()

    def _start_server(self):
        """Start the agent server in a subprocess."""
        import subprocess
        import os
        import threading
        import queue

        console.print("[yellow]Starting agent server for testing...[/yellow]")
        env = os.environ.copy()
        env["HTTP_AUTORELOAD"] = "false"  # Disable hot reload for tests
        env["LOG_LEVEL"] = "INFO"  # Show info logs for debugging

        # Start server with output streaming
        self.server_process = subprocess.Popen(
            ["python", "-m", "agent_server.main"],
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,  # Combine stderr into stdout
            universal_newlines=True,
            bufsize=1,  # Line buffered
        )

        # Queue to capture early errors
        error_queue = queue.Queue()
        startup_complete = threading.Event()

        def echo_logs():
            """Echo server logs and detect startup failures."""
            for line in self.server_process.stdout:
                console.print(f"[dim][SERVER][/dim] {line.rstrip()}")

                # Check for common startup failures
                if not startup_complete.is_set():
                    lower_line = line.lower()
                    if any(
                        err in lower_line
                        for err in [
                            "error",
                            "exception",
                            "traceback",
                            "failed",
                            "cannot import",
                        ]
                    ):
                        error_queue.put(line.strip())

        log_thread = threading.Thread(target=echo_logs, daemon=True)
        log_thread.start()

        # Wait for server to be ready (10 second timeout, checking every 0.5s)
        last_error = None
        last_error_time = 0

        for i in range(20):  # 20 * 0.5s = 10s total
            # Check if process died
            if self.server_process.poll() is not None:
                # Collect any error messages
                errors = []
                while not error_queue.empty():
                    errors.append(error_queue.get_nowait())
                error_msg = (
                    "\n".join(errors) if errors else "Process exited unexpectedly"
                )
                raise RuntimeError(f"Server failed to start:\n{error_msg}")

            try:
                response = self.client.get(f"{self.base_url}/api/v1/agents")
                if response.status_code == 200:
                    console.print("[green]✓ Server ready[/green]")
                    startup_complete.set()
                    break
            except Exception as e:
                current_time = time.time()
                # Log error every 3 seconds
                if last_error != str(e) or current_time - last_error_time >= 3:
                    console.print(f"[dim]Waiting for server: {e}[/dim]")
                    last_error = str(e)
                    last_error_time = current_time

            time.sleep(0.5)
        else:
            # Timeout - check if process is still running
            if self.server_process.poll() is not None:
                errors = []
                while not error_queue.empty():
                    errors.append(error_queue.get_nowait())
                error_msg = "\n".join(errors) if errors else "Process exited"
                raise RuntimeError(f"Server process died during startup:\n{error_msg}")
            else:
                raise RuntimeError(
                    f"Server failed to become ready within 10 seconds. Last error: {last_error}"
                )

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

    def close(self):
        """Clean up resources."""
        self.client.close()
        if self.server_process:
            console.print("[yellow]Stopping test server...[/yellow]")
            self.server_process.terminate()
            self.server_process.wait(timeout=5)

    def list_agents(self) -> list[dict]:
        """List all available agents."""
        response = self.client.get(f"{self.base_url}/api/v1/agents")
        response.raise_for_status()
        return response.json()

    def call_agent(
        self,
        agent_name: str,
        input_data: dict,
        max_iterations: int | None = None,
        stream_events: bool = True,
        timeout: float = 120.0,
    ) -> dict:
        """
        Call an agent and return results.

        Args:
            agent_name: Name of the agent to call
            input_data: Input data matching the agent's schema
            max_iterations: Maximum number of reasoning iterations
            stream_events: Whether to stream and display events
            timeout: Maximum time to wait for completion (seconds, default 120)

        Returns:
            Call result with status, result, and metadata
        """
        # Build call spec with the input data
        call_spec = {"input_data": input_data}
        if max_iterations:
            call_spec["max_iterations"] = max_iterations

        # Display request
        console.print(f"\n[bold blue]📤 Calling agent: {agent_name}[/bold blue]")
        console.print(
            Panel(json.dumps(input_data, indent=2), title="Input", border_style="blue")
        )

        if max_iterations:
            console.print(f"[yellow]🔄 Max iterations: {max_iterations}[/yellow]")

        # Make the call
        console.print("[yellow]⏳ Executing...[/yellow]")
        start_time = time.time()

        response = self.client.post(
            f"{self.base_url}/api/v1/agents/{agent_name}/calls", json=call_spec
        )
        response.raise_for_status()
        call_data = response.json()
        call_id = call_data["call_id"]

        console.print(f"[dim]Call ID: {call_id}[/dim]")

        # Stream events if requested
        if stream_events:
            self._stream_events(call_id)

        # Poll for completion with timeout
        result = self._wait_for_completion(call_id, timeout=timeout)
        elapsed = time.time() - start_time

        # Display result
        self._display_result(result, elapsed)

        return result

    def _stream_events(self, call_id: str):
        """Stream and display events from a call."""
        import websocket
        import threading

        console.print("[dim]Streaming events...[/dim]")

        def on_message(ws, message):
            try:
                event = json.loads(message)
                self._display_event(event)
            except json.JSONDecodeError:
                pass

        def on_error(ws, error):
            console.print(f"[red]WebSocket error: {error}[/red]")

        # Extract host from base_url for WebSocket
        import re

        host = re.sub(r"^https?://", "", self.base_url)
        ws_protocol = "wss" if self.base_url.startswith("https") else "ws"
        ws_url = f"{ws_protocol}://{host}/api/v1/calls/{call_id}/events/stream"
        ws = websocket.WebSocketApp(ws_url, on_message=on_message, on_error=on_error)

        # Run WebSocket in thread
        wst = threading.Thread(target=ws.run_forever)
        wst.daemon = True
        wst.start()

    def _display_event(self, event: dict):
        """Display a single event clearly."""
        event_type = event.get("event_type", event.get("type", "unknown"))

        if event_type == "thought":
            console.print(
                f"[cyan]💭 Thought:[/cyan] {event.get('reasoning', '')[:200]}..."
            )
        elif event_type == "action":
            tool_name = event.get("tool_name", "unknown")
            console.print(f"[green]🔧 Tool: {tool_name}[/green]")
            if event.get("parameters"):
                console.print(
                    f"   [dim]Params: {json.dumps(event['parameters'])[:100]}[/dim]"
                )
        elif event_type == "result":
            console.print("[bold green]✓ Completed[/bold green]")
        elif event_type == "error":
            console.print(
                f"[red]❌ Error: {event.get('error_message', 'Unknown error')}[/red]"
            )

    def _wait_for_completion(self, call_id: str, timeout: float = 120.0) -> dict:
        """Wait for a call to complete.

        Args:
            call_id: ID of the call to wait for
            timeout: Maximum time to wait (seconds)

        Returns:
            Call result (may be incomplete if timed out)
        """
        start = time.time()
        last_call = None

        while time.time() - start < timeout:
            response = self.client.get(f"{self.base_url}/api/v1/calls/{call_id}")
            response.raise_for_status()
            call = response.json()
            last_call = call

            if call["status"] in ["completed", "failed", "cancelled"]:
                return call

            time.sleep(1)

        # Timeout - try to cancel and return what we have
        console.print(
            f"[yellow]⚠️  Call timeout after {timeout:.1f} seconds, cancelling...[/yellow]"
        )
        try:
            self.client.post(f"{self.base_url}/api/v1/calls/{call_id}/cancel")
        except Exception:
            pass  # Best effort cancellation

        # Return the last known state with timeout indicator
        if last_call:
            last_call["status"] = "timeout"
            last_call["timeout_seconds"] = timeout
            return last_call
        else:
            return {
                "call_id": call_id,
                "status": "timeout",
                "timeout_seconds": timeout,
                "error": f"Call did not complete within {timeout:.1f} seconds",
            }

    def _display_result(self, result: dict, elapsed_time: float):
        """Display the final result clearly."""
        status = result["status"]

        # Status header
        if status == "completed":
            console.print(
                f"\n[bold green]✅ COMPLETED[/bold green] in {elapsed_time:.2f}s"
            )
        elif status == "failed":
            console.print(f"\n[bold red]❌ FAILED[/bold red] in {elapsed_time:.2f}s")
        elif status == "timeout":
            timeout_secs = result.get("timeout_seconds", "unknown")
            console.print(
                f"\n[bold yellow]⏱️  TIMEOUT[/bold yellow] after {timeout_secs}s (total elapsed: {elapsed_time:.2f}s)"
            )
            console.print(
                "[yellow]The agent was still running when the timeout was reached.[/yellow]"
            )
        else:
            console.print(
                f"\n[yellow]⚠️  {status.upper()}[/yellow] in {elapsed_time:.2f}s"
            )

        # Result content
        if "result" in result:
            result_data = result["result"]
            if isinstance(result_data, str):
                console.print(Panel(result_data, title="Result", border_style="green"))
            else:
                json_str = json.dumps(result_data, indent=2)
                syntax = Syntax(json_str, "json", theme="monokai", line_numbers=False)
                console.print(Panel(syntax, title="Result", border_style="green"))

        # Metadata
        if "metadata" in result and result["metadata"]:
            table = Table(title="Metadata")
            table.add_column("Key", style="cyan")
            table.add_column("Value")

            for key, value in result["metadata"].items():
                table.add_row(key, str(value))

            console.print(table)

        # Error info if failed
        if status == "failed" and "error" in result:
            console.print(
                Panel(result["error"], title="Error Details", border_style="red")
            )


def test_agent(
    agent_name: str,
    input_data: dict,
    max_iterations: int | None = None,
    base_url: str = None,
    spawn_server: bool = False,
    timeout: float = 120.0,
) -> dict:
    """
    Convenience function to test an agent.

    Args:
        agent_name: Name of the agent to test
        input_data: Input data matching the agent's schema
        max_iterations: Maximum number of reasoning iterations
        base_url: Base URL of the agent server (defaults based on spawn_server)
        spawn_server: If True, spawn a server process for this test
        timeout: Maximum time to wait for completion (seconds)

    Returns:
        Call result
    """
    with AgentTestClient(base_url=base_url, spawn_server=spawn_server) as client:
        return client.call_agent(
            agent_name, input_data, max_iterations, timeout=timeout
        )


def print_header(text: str):
    """Print a formatted test header."""
    console.rule(f"[bold blue]{text}[/bold blue]")


def print_success(text: str):
    """Print success message."""
    console.print(f"[bold green]✅ {text}[/bold green]")


def print_error(text: str):
    """Print error message."""
    console.print(f"[bold red]❌ {text}[/bold red]")


def print_info(text: str):
    """Print info message."""
    console.print(f"[yellow]ℹ️  {text}[/yellow]")
