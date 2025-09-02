import React from "react";
import { cn } from "@/lib/utils";

interface LazyLoadingProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  text?: string;
}

export function LazyLoading({ size = "md", className, text }: LazyLoadingProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6", 
    lg: "w-8 h-8"
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn(
        "border-2 border-gray-200 border-t-primary rounded-full animate-spin",
        sizeClasses[size]
      )} />
      {text && (
        <span className="text-sm text-gray-600 animate-pulse">
          {text}
        </span>
      )}
    </div>
  );
}

export function LazyLoadingOverlay({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
      <div className="bg-white rounded-lg p-4 shadow-lg border">
        <LazyLoading size="md" text={text} />
      </div>
    </div>
  );
}

export function LazyLoadingInline({ text }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-8">
      <LazyLoading size="md" text={text} />
    </div>
  );
}