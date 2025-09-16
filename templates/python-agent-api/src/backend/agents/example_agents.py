"""
Simple example agents to get you started.

These are minimal examples showing both tools and flow modes.
Replace with your own agent logic.
"""

from opper_agent import Agent, tool, step, Workflow, ExecutionContext
from pydantic import BaseModel, Field
from .. import conf


# Example tools for tools mode
@tool
def greet(name: str) -> str:
    """Greet someone by name."""
    return f"Hello, {name}!"


@tool
def calculate(expression: str) -> str:
    """Safely calculate simple math expressions."""
    try:
        # Basic safety - only allow numbers and basic operators
        allowed_chars = set("0123456789+-*/.() ")
        if not all(c in allowed_chars for c in expression):
            return "Error: Expression contains invalid characters"

        result = eval(expression)
        return f"{expression} = {result}"
    except Exception as e:
        return f"Error: {str(e)}"


# Example data models for flow mode
class SimpleRequest(BaseModel):
    message: str = Field(description="The user's message")


class SimpleResponse(BaseModel):
    response: str = Field(description="The processed response")


# Example workflow steps
@step
async def process_message(request: SimpleRequest, ctx: ExecutionContext) -> SimpleResponse:
    """Process the user's message."""
    processed = f"Processed: {request.message}"
    return SimpleResponse(response=processed)


def get_example_tools_agent() -> Agent:
    """
    Create a simple tools-mode agent.

    This agent can dynamically use tools based on the user's request.
    Customize this with your own tools and description.
    """
    api_key = conf.get_opper_api_key()

    return Agent(
        name="ExampleToolsAgent",
        description=("A simple example agent that can greet people and do basic calculations. Replace this with your own agent logic."),
        tools=[greet, calculate],
        opper_api_key=api_key,
        verbose=True
    )


def get_example_flow_agent() -> Agent:
    """
    Create a simple flow-mode agent.

    This agent executes a structured workflow.
    Customize this with your own workflow steps.
    """
    api_key = conf.get_opper_api_key()

    # Create a simple workflow
    workflow = (
        Workflow(
            id="simple-example-workflow",
            input_model=SimpleRequest,
            output_model=SimpleResponse,
        )
        .then(process_message)
        .commit()
    )

    return Agent(
        name="ExampleFlowAgent",
        description="A simple example workflow agent that processes messages. Replace this with your own workflow logic.",
        flow=workflow,
        opper_api_key=api_key,
        verbose=True
    )
