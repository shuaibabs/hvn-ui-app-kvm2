
"use client"

import * as React from "react"
import { Pie, PieChart, ResponsiveContainer, Cell } from "recharts"
import { useApp } from "@/context/app-context";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useTheme } from "next-themes";
import { useAuth } from "@/context/auth-context";


export function StatusChart() {
  const { user, role } = useAuth();
  const { numbers, sales, preBookings } = useApp();
  const { theme } = useTheme();

  const rtpCount = numbers.filter(n => n.status === "RTP").length;
  const nonRtpCount = numbers.length - rtpCount;
  const pendingUploads = numbers.filter(n => n.uploadStatus === 'Pending').length;
  const salesCount = sales.length;
  const preBookingsCount = preBookings.length;

  const chartData = [
    { name: "RTP", value: rtpCount, fill: "hsl(var(--chart-2))" },
    { name: "Non-RTP", value: nonRtpCount, fill: "hsl(var(--chart-5))" },
    { name: "Pending Uploads", value: pendingUploads, fill: "hsl(var(--chart-4))" },
    { name: "Sales", value: salesCount, fill: "hsl(var(--chart-1))" },
    { name: "Pre-Bookings", value: preBookingsCount, fill: "hsla(var(--chart-1), 0.5)" },
  ].filter(item => item.value > 0);

   const chartConfig = {
    rtp: {
      label: "RTP",
      color: "hsl(var(--chart-2))",
    },
    "non-rtp": {
      label: "Non-RTP",
      color: "hsl(var(--chart-5))",
    },
    "pending-uploads": {
        label: "Pending Uploads",
        color: "hsl(var(--chart-4))"
    },
    sales: {
        label: "Sales",
        color: "hsl(var(--chart-1))"
    },
    "pre-bookings": {
        label: "Pre-Bookings",
        color: "hsla(var(--chart-1), 0.5)"
    }
  }

  return (
    <ChartContainer
      config={chartConfig}
      className="mx-auto aspect-square h-full max-h-[250px]"
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
           <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel />}
          />
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            innerRadius={60}
            strokeWidth={5}
            labelLine={false}
          >
             {chartData.map((entry) => (
                <Cell
                    key={`cell-${entry.name}`}
                    fill={entry.fill}
                    stroke={theme === 'dark' ? 'hsl(var(--background))' : 'hsl(var(--card))'}
                />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
