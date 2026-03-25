"use client";

import { Loader } from "lucide-react";
import { cn } from "@/lib/utils";

export const Spinner = ({ className }: { className?: string }) => {
  return (
    <Loader className={cn("animate-spin text-primary", className)} />
  );
};

export const TableSpinner = ({ colSpan }: { colSpan: number }) => {
    return (
        <tr>
            <td colSpan={colSpan}>
                <div className="flex justify-center items-center h-48">
                    <Spinner className="h-8 w-8" />
                </div>
            </td>
        </tr>
    )
}
