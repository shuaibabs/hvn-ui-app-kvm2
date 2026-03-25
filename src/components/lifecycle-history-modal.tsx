
"use client";

import { useMemo } from 'react';
import { useApp } from '@/context/app-context';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { TableSpinner } from './ui/spinner';
import {
  FilePlus2,
  Package,
  FilePen,
  Trash2,
  UserCog,
  DollarSign,
  Bookmark,
  LogIn,
  FileClock,
  History,
  MapPin,
  FileText,
  UploadCloud,
} from 'lucide-react';
import { LifecycleEvent } from '@/lib/data';


type LifecycleHistoryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  mobileNumber: string;
};

const getActionIcon = (action: string) => {
  const lowerAction = action.toLowerCase();
  if (lowerAction.includes('created')) return <FilePlus2 className="h-4 w-4 text-green-500" />;
  if (lowerAction.includes('sold')) return <DollarSign className="h-4 w-4 text-green-500" />;
  if (lowerAction.includes('upload')) return <UploadCloud className="h-4 w-4 text-sky-500" />;
  if (lowerAction.includes('updated') || lowerAction.includes('changed')) return <FilePen className="h-4 w-4 text-blue-500" />;
  if (lowerAction.includes('deleted') || lowerAction.includes('cancelled')) return <Trash2 className="h-4 w-4 text-red-500" />;
  if (lowerAction.includes('assigned')) return <UserCog className="h-4 w-4 text-purple-500" />;
  if (lowerAction.includes('pre-booked')) return <Bookmark className="h-4 w-4 text-amber-500" />;
  if (lowerAction.includes('checked in')) return <LogIn className="h-4 w-4 text-cyan-500" />;
  if (lowerAction.includes('rtp')) return <FileClock className="h-4 w-4 text-orange-500" />;
  if (lowerAction.includes('location')) return <MapPin className="h-4 w-4 text-teal-500" />;
  if (lowerAction.includes('postpaid')) return <FileText className="h-4 w-4 text-indigo-500" />;
  return <History className="h-4 w-4" />;
};

export function LifecycleHistoryModal({ isOpen, onClose, mobileNumber }: LifecycleHistoryModalProps) {
  const { globalHistory, loading } = useApp();

  const lifecycle = useMemo(() => {
    if (!mobileNumber || loading) return [];
    
    const historyRecord = globalHistory.find(record => record.mobile === mobileNumber);
    
    if (!historyRecord || !historyRecord.history) return [];

    return [...historyRecord.history].sort((a, b) => b.timestamp.toDate().getTime() - a.timestamp.toDate().getTime());
    
  }, [globalHistory, mobileNumber, loading]);

  const getCleanedDescription = (event: LifecycleEvent) => {
    const bulkActionKeywords = [
        "Assigned Numbers", "Bulk Sold Numbers", "Bulk Updated Upload Status", "Bulk Updated Safe Custody Date",
        "Bulk Updated Postpaid Details"
    ];
    if (bulkActionKeywords.includes(event.action)) {
        // Return only the core action part, e.g., "Assigned to Employee X"
        return event.description.split(':')[0];
    }
    return event.description;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Lifecycle History: {mobileNumber}</DialogTitle>
          <DialogDescription>
            A chronological log of all actions performed on this number.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4 -mr-4">
          <div className="relative py-4 pr-4">
             {lifecycle.length > 0 && <div className="absolute left-5 top-2 h-full w-0.5 bg-border" />}

            {loading && <div className="flex justify-center items-center h-48"><TableSpinner colSpan={1} /></div>}
            
            {!loading && lifecycle.length === 0 && (
                 <div className="text-center text-muted-foreground py-16">
                    <Package className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium">No History Found</h3>
                    <p className="mt-1 text-sm text-gray-500">No lifecycle events have been logged for this number yet.</p>
                </div>
            )}
            
            <div className="space-y-8">
              {lifecycle.map((event: LifecycleEvent) => (
                <div key={event.id} className="relative flex items-start gap-4">
                  <div className="absolute left-5 top-2.5 -translate-x-1/2 h-full">
                     <span className="relative flex h-5 w-5 items-center justify-center rounded-full bg-secondary">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-background">
                            {getActionIcon(event.action)}
                        </span>
                    </span>
                  </div>
                  <div className="pl-12 w-full">
                    <div className="flex justify-between items-center">
                        <p className="text-sm font-semibold">
                            {event.action}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {event.timestamp ? format(event.timestamp.toDate(), 'PPP p') : 'Syncing...'}
                        </p>
                    </div>
                    <p className="text-sm text-muted-foreground">{getCleanedDescription(event)}</p>
                    <p className="text-xs text-muted-foreground mt-1">by <span className="font-medium">{event.performedBy}</span></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
