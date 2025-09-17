"""
Example agent demonstrating opper-agent-sdk usage.

This shows the basic pattern for building tools-mode agents.
Replace with your own agent logic for production use.

See the opper-agent-sdk examples for more patterns:
- Tools mode: examples/tools/tools_mode_example.py
- Flow mode: examples/flow/flow_mode_example.py
"""

from opper_agent import Agent, tool


# Example tools showing different input/output types
@tool
def greet(name: str) -> str:
    """Greet someone by name."""
    return f"Hello, {name}! Welcome to the Opper Agent SDK."


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


@tool
def count_words(text: str) -> str:
    """Count words in a text string."""
    word_count = len(text.split())
    return f"The text contains {word_count} words."


def get_coding_agent():
    """
    Create an example agent with basic tools.
    
    This demonstrates the minimal pattern for building agents:
    1. Define tools with @tool decorator
    2. Create Agent with tools list
    3. Agent automatically gets tool selection and reasoning
    """
    return Agent(
        name="example-agent",
        description="An example agent that can greet people, do math, and count words",
        tools=[greet, calculate, count_words],
        verbose=True
    )


