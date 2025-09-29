import { Bot, AlertCircle } from "lucide-react";

interface ErrorStateProps {
  title: string;
  message: string;
  onBack?: () => void;
  backLabel?: string;
  icon?: "bot" | "alert";
}

export function ErrorState({
  title,
  message,
  onBack,
  backLabel = "Back",
  icon = "alert"
}: ErrorStateProps) {
  const Icon = icon === "bot" ? Bot : AlertCircle;

  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center max-w-md">
        <Icon className="h-12 w-12 mx-auto mb-4 text-destructive" />
        <h1 className="text-xl font-semibold mb-2">{title}</h1>
        <p className="text-muted-foreground mb-4">{message}</p>
        {onBack && (
          <button
            onClick={onBack}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/80"
          >
            {backLabel}
          </button>
        )}
      </div>
    </div>
  );
}