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

function ToastItem({ toast }: { toast: ToastData }) {
  const removeToast = useToastStore((s) => s.removeToast);

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
      className="flex items-start gap-3 max-w-toast bg-surface-4 border border-border-medium rounded-[12px] px-4 py-3 shadow-none"
    >
      <span className={cn("text-label font-semibold shrink-0 mt-0.5", iconColors[toast.type])}>
        {icons[toast.type]}
      </span>
      <p className="text-body-sm text-text-primary flex-1">{toast.message}</p>
      <button
        onClick={() => removeToast(toast.id)}
        className="text-text-tertiary hover:text-text-secondary text-body-sm shrink-0 mt-0.5"
      >
        ✕
      </button>
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
