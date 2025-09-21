#!/usr/bin/env python
"""
Universal test script for any agent.

Usage:
    python -m scripts.test_agent --agent <name> --goal "Your goal here"
    python -m scripts.test_agent --agent research-assistant --goal "Tell me about Mars" --max-iterations 10
    python -m scripts.test_agent --agent my-agent --input '{"key": "value"}' --spawn-server
"""

import argparse
import json
import sys
from agent_server.test_utils import test_agent, print_header, print_error, print_info


def main():
    parser = argparse.ArgumentParser(description="Test an agent via API")
    parser.add_argument(
        "--agent",
        required=True,
        help="Name of the agent to test"
    )
    parser.add_argument(
        "--input",
        type=str,
        required=True,
        help="Input data as JSON string (must match agent's input schema)"
    )
    parser.add_argument(
        "--max-iterations",
        type=int,
        default=None,
        help="Maximum number of reasoning iterations (default: 25)"
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=120.0,
        help="Maximum time to wait for agent completion in seconds (default: 120)"
    )
    parser.add_argument(
        "--base-url",
        default="http://localhost:8000",
        help="Base URL of the agent server (default: http://localhost:8000)"
    )
    parser.add_argument(
        "--spawn-server",
        action="store_true",
        help="Spawn a test server for this run"
    )

    args = parser.parse_args()

    # Parse input data
    try:
        input_data = json.loads(args.input)
    except json.JSONDecodeError as e:
        print_error(f"Invalid JSON in --input: {e}")
        sys.exit(1)

    # Run test
    print_header(f"Testing Agent: {args.agent}")

    if args.max_iterations:
        print_info(f"Max iterations: {args.max_iterations}")
    if args.timeout != 120.0:
        print_info(f"Timeout: {args.timeout}s")

    try:
        result = test_agent(
            agent_name=args.agent,
            input_data=input_data,
            max_iterations=args.max_iterations,
            base_url=args.base_url,
            spawn_server=args.spawn_server,
            timeout=args.timeout
        )

        # Exit with appropriate code
        if result.get("status") == "completed":
            sys.exit(0)
        elif result.get("status") == "timeout":
            print_error(f"Test timed out after {result.get('timeout_seconds', 'unknown')} seconds")
            sys.exit(2)  # Exit code 2 for timeout
        else:
            sys.exit(1)

    except Exception as e:
        print_error(f"Test failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
