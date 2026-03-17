interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <div className="mb-6 p-4 bg-red-950/50 border border-red-800 rounded-lg flex items-start justify-between gap-3">
      <p className="text-red-400 text-sm">{message}</p>
      <button
        onClick={onDismiss}
        className="text-red-400 hover:text-red-300 text-sm font-medium shrink-0 transition-colors"
      >
        Dismiss
      </button>
    </div>
  );
}
