import { useToaster } from "react-hot-toast"

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
        .map((toast) => (
          <div className="alert alert-info" key={toast.id} {...toast.ariaProps}>
            {toast.message?.toString()}
          </div>
        ))}
    </div>
  )
}
