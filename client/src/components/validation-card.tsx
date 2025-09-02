import { motion } from "framer-motion";
import { CheckCircle, XCircle, AlertTriangle, Info, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ValidationCardProps {
  type: "validating" | "success" | "error" | "warning" | "info";
  title: string;
  description: string;
  className?: string;
  onClose?: () => void;
}

export default function ValidationCard({ type, title, description, className, onClose }: ValidationCardProps) {
  const getIcon = () => {
    switch (type) {
      case "validating":
        return <Loader2 className="h-5 w-5 animate-spin text-blue-600" />;
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      case "info":
        return <Info className="h-5 w-5 text-blue-600" />;
      default:
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const getStyles = () => {
    switch (type) {
      case "validating":
        return "bg-white border-blue-200 shadow-lg";
      case "success":
        return "bg-white border-green-200 shadow-lg";
      case "error":
        return "bg-white border-red-200 shadow-lg";
      case "warning":
        return "bg-white border-orange-200 shadow-lg";
      case "info":
        return "bg-white border-blue-200 shadow-lg";
      default:
        return "bg-white border-gray-200 shadow-lg";
    }
  };

  const getTitleColor = () => {
    switch (type) {
      case "validating":
        return "text-blue-700";
      case "success":
        return "text-green-700";
      case "error":
        return "text-red-700";
      case "warning":
        return "text-orange-700";
      case "info":
        return "text-blue-700";
      default:
        return "text-gray-700";
    }
  };

  const getAnimationDirection = () => {
    switch (type) {
      case "success":
        return { x: 100 }; // Slide from right
      case "error":
        return { x: 100 }; // Slide from right
      case "warning":
        return { x: 100 }; // Slide from right
      case "info":
        return { x: 100 }; // Slide from right
      case "validating":
        return { x: 100 }; // Slide from right
      default:
        return { x: 100 };
    }
  };

  const getPosition = () => {
    switch (type) {
      case "success":
        return "top-4 right-4";
      case "error":
        return "top-4 right-4";
      case "warning":
        return "top-4 right-4";
      case "info":
        return "top-4 right-4";
      case "validating":
        return "top-4 right-4";
      default:
        return "top-4 right-4";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, ...getAnimationDirection() }}
      animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      exit={{ opacity: 0, ...getAnimationDirection() }}
      transition={{ 
        duration: 0.5,
        type: "spring",
        stiffness: 300,
        damping: 30
      }}
      className={cn(
        "fixed z-[10002] rounded-lg border-2 p-3 sm:p-4 max-w-xs sm:max-w-sm shadow-xl select-none",
        getPosition(),
        getStyles(),
        className
      )}
      onMouseEnter={(e) => e.stopPropagation()}
      onMouseLeave={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start space-x-2 sm:space-x-3">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={cn("text-sm sm:text-base font-semibold", getTitleColor())}>
            {title}
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-gray-600 leading-relaxed">
            {description}
          </p>
        </div>
        {onClose && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="absolute top-2 right-2 rounded-full p-1 hover:bg-gray-100 transition-colors"
          >
            <X className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
          </button>
        )}
      </div>
    </motion.div>
  );
}