import { useEffect } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/_index";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Agent Dashboard" },
    { name: "description", content: "Redirecting to agent dashboard..." },
  ];
}

export default function IndexRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to home route
    navigate('/home', { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground mt-4">Redirecting...</p>
      </div>
    </div>
  );
}