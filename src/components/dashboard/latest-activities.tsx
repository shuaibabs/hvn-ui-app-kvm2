
"use client";

import { useApp } from "@/context/app-context";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback } from "../ui/avatar";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";

function ActivityTime({ timestamp }: { timestamp: Date }) {
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    // This will only run on the client, after hydration
    setTimeAgo(formatDistanceToNow(timestamp, { addSuffix: true }));
  }, [timestamp]);

  // Render a placeholder or nothing on the server
  if (!timeAgo) {
    return null;
  }

  return <>{timeAgo}</>;
}

export function LatestActivities() {
  const { activities } = useApp();
  const { role } = useAuth();

  const sortedActivities = [...activities]
    .filter(activity => activity.timestamp) // Ensure timestamp is not null
    .sort((a, b) => b.timestamp.toDate().getTime() - a.timestamp.toDate().getTime());
  
  const cardTitle = role === 'admin' ? "Latest Activities" : "My Recent Activities";

  return (
    <div className="space-y-4">
      {sortedActivities.slice(0, 5).map((activity, index) => (
        <div key={`${activity.id}-${index}`} className="flex items-center gap-4">
          <Avatar className="h-9 w-9">
            <AvatarFallback>{activity.employeeName?.[0].toUpperCase() || 'A'}</AvatarFallback>
          </Avatar>
          <div className="grid gap-1">
            <p className="text-sm font-medium leading-none">
              <span className="font-semibold">{activity.employeeName}</span> {activity.action.toLowerCase()}
            </p>
            <p className="text-sm text-muted-foreground">{activity.description}</p>
          </div>
          <div className="ml-auto text-sm text-muted-foreground">
            <ActivityTime timestamp={activity.timestamp.toDate()} />
          </div>
        </div>
      ))}
       {sortedActivities.length === 0 && (
        <div className="text-center text-muted-foreground py-4">
            No activities to display.
        </div>
       )}
    </div>
  );
}
