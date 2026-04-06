import { useToastStore, type Toast as ToastData } from "@/stores/toast";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

const icons: Record<string, string> = {
  success: "✓",
  error: "✕",
  warning: "!",
  info: "i",
};

const iconColors: Record<string, string> = {
  success: "text-success",
  error: "text-error",
  warning: "text-warning",
  info: "text-cyan-primary",
};

const borderColors: Record<string, string> = {
  success: "border-l-success",
  error: "border-l-error",
  warning: "border-l-warning",
  info: "border-l-cyan-primary",
};

function ToastItem({ toast }: { toast: ToastData }) {
  const removeToast = useToastStore((s) => s.removeToast);
  const isManualDismiss = toast.duration === 0;

  return (
    <motion.div
      layout
      initial={{ x: 80, opacity: 0, scale: 0.95 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      exit={{ x: 80, opacity: 0, scale: 0.95 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 30,
        opacity: { duration: 0.15 },
      }}
      role="alert"
      aria-live={isManualDismiss ? "assertive" : "polite"}
      className={cn(
        "relative flex items-start gap-3 max-w-toast bg-surface-4 border border-border-medium rounded-[12px] px-4 py-3 shadow-none overflow-hidden",
        isManualDismiss && "border-l-[3px]",
        isManualDismiss && borderColors[toast.type],
      )}
    >
      <span className={cn("text-label font-semibold shrink-0 mt-0.5", iconColors[toast.type])}>
        {icons[toast.type]}
      </span>
      <p className="text-body-sm text-text-primary flex-1">{toast.message}</p>
      <button
        onClick={() => removeToast(toast.id)}
        className={cn(
          "shrink-0 mt-0.5 transition-colors",
          isManualDismiss
            ? "text-text-secondary hover:text-text-primary text-label font-medium"
            : "text-text-tertiary hover:text-text-secondary text-body-sm"
        )}
        aria-label="Dismiss notification"
      >
        ✕
      </button>

      {/* Auto-dismiss progress bar — §22 */}
      {toast.duration > 0 && (
        <motion.div
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: toast.duration / 1000, ease: "linear" }}
          className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/[0.08] origin-left"
        />
      )}
    </motion.div>
  );
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  );
}
