"""
Agent evaluation framework.

This module provides a simple framework for evaluating agent performance
on test cases. Customize this for your specific evaluation needs.
"""

import json
import time
from typing import Any
from pydantic import BaseModel


class EvalCase(BaseModel):
    """A single evaluation test case."""
    id: str
    description: str
    goal: str
    agent_name: str
    expected_outcome: str | None = None
    max_iterations: int = 10


class EvalResult(BaseModel):
    """Result of running an evaluation case."""
    case_id: str
    success: bool
    result: Any
    execution_time: float
    iterations: int | None = None
    error: str | None = None


def run_eval_case(case: EvalCase, agent_registry) -> EvalResult:
    """
    Run a single evaluation case.

    Args:
        case: The evaluation case to run
        agent_registry: The agent registry to get agents from

    Returns:
        EvalResult with the outcome
    """
    start_time = time.time()

    try:
        # Get the agent from registry
        agent = agent_registry.get_agent(case.agent_name)
        if not agent:
            raise ValueError(f"Agent '{case.agent_name}' not found in registry")

        # Set max iterations
        agent.max_iterations = case.max_iterations
        agent.verbose = False  # Reduce noise during evals

        # Process the goal
        result = agent.process(case.goal)

        # Extract iterations if available
        iterations = None
        if hasattr(result, 'get') and isinstance(result, dict):
            iterations = result.get('iterations')
        elif hasattr(result, '__dict__') and hasattr(result, 'metadata'):
            iterations = getattr(result.metadata, 'steps', None)

        execution_time = time.time() - start_time

        return EvalResult(
            case_id=case.id,
            success=True,
            result=result,
            execution_time=execution_time,
            iterations=iterations
        )

    except Exception as e:
        execution_time = time.time() - start_time
        return EvalResult(
            case_id=case.id,
            success=False,
            result=None,
            execution_time=execution_time,
            error=str(e)
        )


def run_evaluations(cases: list[EvalCase], agent_registry) -> list[EvalResult]:
    """
    Run all evaluation cases.

    Args:
        cases: List of evaluation cases to run
        agent_registry: The agent registry to get agents from

    Returns:
        List of EvalResult objects
    """
    print(f"Running {len(cases)} evaluation cases...")

    results = []
    for i, case in enumerate(cases, 1):
        print(f"[{i}/{len(cases)}] Running: {case.description}")
        result = run_eval_case(case, agent_registry)
        results.append(result)

        if result.success:
            print(f"  ✅ Success ({result.execution_time:.2f}s)")
        else:
            print(f"  ❌ Failed: {result.error}")

    return results


def print_eval_summary(results: list[EvalResult]):
    """Print a summary of evaluation results."""
    total = len(results)
    passed = len([r for r in results if r.success])
    failed = total - passed

    avg_time = sum(r.execution_time for r in results) / total if total > 0 else 0

    print(f"\n{'='*50}")
    print("EVALUATION SUMMARY")
    print(f"{'='*50}")
    print(f"Total cases: {total}")
    print(f"Passed: {passed} ({passed/total*100:.1f}%)")
    print(f"Failed: {failed} ({failed/total*100:.1f}%)")
    print(f"Average execution time: {avg_time:.2f}s")

    if failed > 0:
        print("\nFailed cases:")
        for result in results:
            if not result.success:
                print(f"  - {result.case_id}: {result.error}")


def load_eval_cases(filepath: str) -> list[EvalCase]:
    """
    Load evaluation cases from a JSON file.

    Args:
        filepath: Path to the JSON file containing eval cases

    Returns:
        List of EvalCase objects
    """
    with open(filepath, "r") as f:
        data = json.load(f)

    return [EvalCase(**case) for case in data]


def save_results(results: list[EvalResult], filepath: str = "eval_results.json"):
    """
    Save evaluation results to a JSON file.

    Args:
        results: List of EvalResult objects
        filepath: Path where to save the results
    """
    results_data = [result.model_dump() for result in results]
    with open(filepath, "w") as f:
        json.dump(results_data, f, indent=2, default=str)
    print(f"\nResults saved to {filepath}")