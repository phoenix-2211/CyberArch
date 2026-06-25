import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorCardProps {
  message: string;
  onRetry?: () => void;
}

const ErrorCard = ({ message, onRetry }: ErrorCardProps) => {
  return (
    <div className="bg-card border border-border rounded-lg p-6 flex flex-col items-center gap-3">
      <AlertTriangle className="h-8 w-8 text-destructive" />
      <p className="text-sm text-text-secondary text-center">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="h-3 w-3 mr-1.5" />
          Retry
        </Button>
      )}
    </div>
  );
};

export default ErrorCard;
