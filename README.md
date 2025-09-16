# Opper Coder

A coding agent flavor for the [Opper Agent SDK](https://github.com/opper-ai/opperai-agent-sdk) using [Polytope](https://polytope.com).

## What is this?

This provides a clean template for building AI agents using the Opper SDK. The template includes:

- **FastAPI backend** with agent endpoints
- **Example agents** showing tools and flow modes  
- **Simple tools** as starting points
- **Clean project structure** optimized for agent development

## How it works

1. Use the `__polytope__create-agent-api` tool to create a new agent project
2. The tool instantiates the `templates/python-agent-api` template at your specified path
3. Your coding agent can then iterate on the project - polytope hot reloads changes automatically
4. Build custom agents by modifying the examples and adding your own tools/workflows

## Prerequisites

Install Polytope:
```bash
curl -s https://polytope.com/install.sh | sh
```

Get an Opper API key from [https://platform.opper.ai](https://platform.opper.ai).

## Setup Instructions

### Step 1: Include this repository

Create a `polytope.yml` file with the following content in your project directory:

```yaml
include:
  - gh:aeriksson/opper-coder
```

### Step 2: Set your Opper API key

Set your Opper API key as a secret:

```bash
pt secret set opper-api-key [your-opper-api-key]
```

### Step 3: Start the Polytope MCP server

Run the following command in your project directory:

```bash
pt run --mcp
```

This launches the Polytope terminal UI with a clean sandbox and an MCP server reachable via `http://localhost:31338/mcp`.

### Step 4: Add the Polytope MCP server to your coding agent

The way to do this depends on which coding agent you are using.

#### For Claude Code:
Run
```bash
claude mcp add --transport http polytope http://localhost:31338/mcp
```
in your project directory.

### Step 5: Create your agent

Ask your coding agent to create a new agent project:

```
Please create a new Opper agent API project at ./my-agent
```

This will use the `__polytope__create-agent-api` tool to instantiate the template.

## Example Agent Ideas

Try these prompts to test your setup:

### 1. **"Create a Python REST API client"**
"Build me a Python REST API client class that can handle GET, POST, PUT, DELETE requests with proper error handling and authentication headers"

### 2. **"Build a smart code reviewer agent"**  
"Create an intelligent code review agent that can analyze Python code for bugs, security issues, performance problems, and style violations. It should provide detailed feedback with suggestions for improvement."
