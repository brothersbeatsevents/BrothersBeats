export default function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="text-center py-16 px-4">
      <div className="mx-auto w-14 h-14 rounded-full bg-[#FFF0EF] flex items-center justify-center mb-4">
        <svg className="w-7 h-7 text-bb-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      </div>
      <h3 className="font-display font-bold text-lg text-bb-text">{title}</h3>
      {message && <p className="mt-1 text-sm text-bb-text-secondary max-w-sm mx-auto">{message}</p>}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 bg-bb-green hover:bg-bb-green-dark text-white font-semibold text-sm px-5 py-2.5 rounded-full transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}
