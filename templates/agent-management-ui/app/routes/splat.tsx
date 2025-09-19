import { useNavigate } from "react-router";
import { ErrorState } from "~/components/ErrorState";

export default function CatchAll() {
  const navigate = useNavigate();

  return (
    <ErrorState
      title="Page Not Found"
      message="The page you're looking for doesn't exist."
      onBack={() => navigate('/home')}
      backLabel="Go to Dashboard"
      icon="bot"
    />
  );
}