// use-toast.ts
import { toast as sonnerToast } from "@/components/ui/toast";

type ToastProps = {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number;
};

export const useToast = () => {
  const toast = ({ title, description, variant = 'default', duration = 3000 }: ToastProps) => {
    return sonnerToast({
      title,
      description,
      variant,
      duration,
    });
  };

  return { toast };
};
