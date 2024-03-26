import { useToaster } from 'react-hot-toast';

export const Notifications = () => {
  const { toasts, handlers } = useToaster()
  const { startPause, endPause } = handlers

  return (
    <div
      className="toast toast-end"
      onMouseEnter={startPause}
      onMouseLeave={endPause}
    >
      {toasts
        .filter((toast) => toast.visible)
        .map(({ id, message, ariaProps, type }) => (
          <div
            className={`alert alert-${type === "loading" ? "info" : "success"}`}
            key={id}
            {...ariaProps}
          >
            {message?.toString()}
          </div>
        ))}
    </div>
  )
}
