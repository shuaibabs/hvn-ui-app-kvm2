
"use client";

import { useApp } from "@/context/app-context";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { StatusChart } from "@/components/dashboard/status-chart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";
import { LatestActivities } from "@/components/dashboard/latest-activities";
import { useMemo } from "react";
import { GlobalHistory } from "@/components/dashboard/global-history";

export default function DashboardPage() {
  const { user, role } = useAuth();
  const { numbers, reminders, sales, preBookings } = useApp();

  const rtpCount = numbers.filter(n => n.status === "RTP").length;
  const nonRtpCount = numbers.length - rtpCount;
  const pendingUploads = numbers.filter(n => n.uploadStatus === 'Pending').length;
  const salesCount = sales.length;
  const preBookingsCount = preBookings.length;

  return (
    <>
      <div className="space-y-6">
        <SummaryCards />

        <GlobalHistory />
        
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-7">
          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle>Status Breakdown</CardTitle>
              <CardDescription>
                A summary of all number statuses and pending work.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="min-h-[250px] w-full">
                <StatusChart />
              </div>
               <div className="flex flex-col gap-4 text-sm">
                <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[hsl(var(--chart-2))]"></span>
                    <span className="font-medium">RTP</span>
                    <span className="ml-auto text-muted-foreground">{rtpCount}</span>
                </div>
                 <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[hsl(var(--chart-5))]"></span>
                    <span className="font-medium">Non-RTP</span>
                    <span className="ml-auto text-muted-foreground">{nonRtpCount}</span>
                </div>
                 <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[hsl(var(--chart-4))]"></span>
                    <span className="font-medium">Pending Uploads</span>
                    <span className="ml-auto text-muted-foreground">{pendingUploads}</span>
                </div>
                 <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[hsl(var(--chart-1))]"></span>
                    <span className="font-medium">Sales</span>
                    <span className="ml-auto text-muted-foreground">{salesCount}</span>
                </div>
                 <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[hsl(var(--chart-1))] opacity-50"></span>
                    <span className="font-medium">Pre-Bookings</span>
                    <span className="ml-auto text-muted-foreground">{preBookingsCount}</span>
                </div>
            </div>
            </CardContent>
          </Card>
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Latest Activities</CardTitle>
            </CardHeader>
            <CardContent>
              <LatestActivities />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
