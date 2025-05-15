"use client";
import { useSocketStore } from "@/stores/socketStore";
import { Loader2 } from "lucide-react";

export const GlobalLoadingOverlay = () => {
  const isSendingCommand = useSocketStore((state) => state.isSendingCommand);

  if (!isSendingCommand) return null;

  return (
    <div className="fixed inset-0 z-[9999] backdrop-blur-xs flex items-center justify-center">
      <Loader2 className="animate-spin text-white w-12 h-12" />
    </div>
  );
};