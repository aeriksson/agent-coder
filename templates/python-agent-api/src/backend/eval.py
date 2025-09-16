"""
Agent evaluation framework.

This module provides a simple framework for evaluating agent performance
on test cases. Customize this for your specific evaluation needs.
"""

import json
import time
from typing import Any
from pydantic import BaseModel
from .agents import get_example_tools_agent, get_example_flow_agent


class EvalCase(BaseModel):
    """A single evaluation test case."""
    id: str
    description: str
    goal: str
    agent_type: str = "coding"  # "coding" or "workflow"
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


# Example evaluation cases
EXAMPLE_EVAL_CASES = [
    EvalCase(
        id="basic_greeting",
        description="Test basic greeting functionality",
        goal="Say hello to Alice",
        agent_type="coding",
        expected_outcome="greeting"
    ),
    EvalCase(
        id="simple_math",
        description="Test basic math calculation",
        goal="Calculate 15 + 27",
        agent_type="coding",
        expected_outcome="42"
    ),
    EvalCase(
        id="workflow_processing",
        description="Test workflow message processing",
        goal="Process this message: Testing workflow",
        agent_type="workflow",
        expected_outcome="processed message"
    ),
]


def run_eval_case(case: EvalCase) -> EvalResult:
    """Run a single evaluation case."""
    start_time = time.time()

    try:
        # Get the appropriate agent
        if case.agent_type == "coding":
            agent = get_example_tools_agent()
        elif case.agent_type == "workflow":
            agent = get_example_flow_agent()
        else:
            raise ValueError(f"Unknown agent type: {case.agent_type}")

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


def run_evaluations(cases: list[EvalCase] = None) -> list[EvalResult]:
    """Run all evaluation cases."""
    if cases is None:
        cases = EXAMPLE_EVAL_CASES

    print(f"Running {len(cases)} evaluation cases...")

    results = []
    for i, case in enumerate(cases, 1):
        print(f"[{i}/{len(cases)}] Running: {case.description}")
        result = run_eval_case(case)
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


def main():
    """Main evaluation function."""
    print("🧪 Agent Evaluation Framework")
    print("="*50)

    # Run evaluations
    results = run_evaluations()

    # Print summary
    print_eval_summary(results)

    # Save results to file
    results_data = [result.dict() for result in results]
    with open("eval_results.json", "w") as f:
        json.dump(results_data, f, indent=2, default=str)

    print("\nResults saved to eval_results.json")

    # Exit with error code if any tests failed
    failed_count = len([r for r in results if not r.success])
    exit(failed_count)


if __name__ == "__main__":
    main()
