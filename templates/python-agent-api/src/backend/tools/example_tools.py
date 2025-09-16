"""
Example tools for use with Opper agents.

These are simple examples showing how to create tools.
Replace with your own tools for your specific use case.
"""

import os
from typing import Any
from opper_agent import tool


@tool
def example_file_tool(file_path: str) -> dict[str, Any]:
    """
    Read and analyze a text file.

    Args:
        file_path: Path to the file to read

    Returns:
        File information including content and basic stats
    """
    if not os.path.exists(file_path):
        return {"error": f"File not found: {file_path}"}

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        lines = content.split('\n')

        return {
            "file_path": file_path,
            "content": content[:500] + "..." if len(content) > 500 else content,
            "stats": {
                "total_lines": len(lines),
                "non_empty_lines": len([line for line in lines if line.strip()]),
                "total_characters": len(content),
                "file_size_bytes": os.path.getsize(file_path)
            }
        }

    except Exception as e:
        return {"error": f"Failed to read file: {str(e)}"}


@tool
def example_api_tool(url: str, method: str = "GET") -> dict[str, Any]:
    """
    Make a simple HTTP request.

    Args:
        url: URL to request
        method: HTTP method (GET, POST, etc.)

    Returns:
        Response information
    """
    try:
        import requests

        if method.upper() == "GET":
            response = requests.get(url, timeout=10)
        else:
            return {"error": f"Method {method} not implemented in this example"}

        return {
            "url": url,
            "method": method,
            "status_code": response.status_code,
            "headers": dict(response.headers),
            "content_length": len(response.text),
            "content_preview": response.text[:200] + "..." if len(response.text) > 200 else response.text
        }

    except ImportError:
        return {"error": "requests library not installed. Add it to your dependencies."}
    except Exception as e:
        return {"error": f"Request failed: {str(e)}"}
