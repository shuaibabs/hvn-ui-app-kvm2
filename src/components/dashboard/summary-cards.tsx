
"use client";

import { useApp } from "@/context/app-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone, CheckCircle, Clock, UploadCloud, DollarSign, LogOut, Bookmark } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useMemo } from "react";

export function SummaryCards() {
  const { user, role } = useAuth();
  const { numbers, sales, preBookings } = useApp();

  const totalNumbers = numbers.length;
  const rtpNumbers = numbers.filter(n => n.status === 'RTP').length;
  const nonRtpNumbers = totalNumbers - rtpNumbers;
  const pendingUploads = numbers.filter(n => n.uploadStatus === 'Pending').length;
  const totalSales = sales.length;
  const totalPreBookings = preBookings.length;


  const summaryData = [
    { title: "Total Numbers", value: totalNumbers, icon: Smartphone, color: "text-blue-500" },
    { title: "RTP Numbers", value: rtpNumbers, icon: CheckCircle, color: "text-green-500" },
    { title: "Non-RTP Numbers", value: nonRtpNumbers, icon: Clock, color: "text-red-500" },
    { title: "Pre-Bookings", value: totalPreBookings, icon: Bookmark, color: "text-amber-500" },
    { title: "Sales", value: totalSales, icon: DollarSign, color: "text-indigo-500" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {summaryData.map(item => (
        <Card key={item.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
            <item.icon className={`h-4 w-4 text-muted-foreground ${item.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{item.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
