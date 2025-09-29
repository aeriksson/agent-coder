import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  layout("routes/dashboard.tsx", [
    route("home", "routes/home.tsx"),
    route("agents/:agentName", "routes/agents.$agentName.tsx"),
    route("agents/:agentName/execute", "routes/agents.$agentName.execute.tsx"),
    route("agents/:agentName/calls/:callId", "routes/agents.$agentName.calls.$callId.tsx"),
  ]),
  route("*", "routes/splat.tsx"),
] satisfies RouteConfig;
