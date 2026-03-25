
"use client";

import { useApp } from "@/context/app-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { BellRing, Calendar } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "./ui/badge";

export function WorkReminderPopup() {
    const { showReminderPopup, pendingRemindersForPopup, closeReminderPopup } = useApp();

    if (!showReminderPopup || pendingRemindersForPopup.length === 0) {
        return null;
    }

    return (
        <Dialog open={showReminderPopup} onOpenChange={closeReminderPopup}>
            <DialogContent className="sm:max-w-lg border-primary border-2">
                <DialogHeader>
                    <div className="flex items-center gap-4 mb-4">
                        <div className="bg-primary/20 p-3 rounded-full">
                            <BellRing className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                            <DialogTitle className="text-2xl font-bold">Action Required!</DialogTitle>
                            <DialogDescription>
                                You have {pendingRemindersForPopup.length} pending task(s) that are due.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-4">
                    {pendingRemindersForPopup.map(reminder => (
                        <div key={reminder.id} className="p-4 border rounded-lg">
                            <div className="flex justify-between items-start">
                                <h4 className="font-semibold">{reminder.taskName}</h4>
                                 <Badge variant="destructive">Due</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">Assigned to: {reminder.assignedTo}</p>
                            <div className="flex items-center text-sm text-muted-foreground mt-2">
                                <Calendar className="mr-2 h-4 w-4" />
                                Due Date: {format(reminder.dueDate.toDate(), 'PPP')}
                            </div>
                        </div>
                    ))}
                </div>
                <DialogFooter>
                    <Button onClick={closeReminderPopup}>Dismiss</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
