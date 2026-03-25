

"use client";

import { useApp } from '@/context/app-context';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { PlusCircle, Check, Trash, Users, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Spinner, TableSpinner } from '@/components/ui/spinner';
import { useState, useMemo } from 'react';
import { AddReminderModal } from '@/components/add-reminder-modal';
import { useAuth } from '@/context/auth-context';
import type { Reminder } from '@/lib/data';
import { MarkReminderDoneModal } from '@/components/mark-reminder-done-modal';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Timestamp } from 'firebase/firestore';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AssignReminderModal } from '@/components/assign-reminder-modal';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { BulkMarkRemindersDoneModal } from '@/components/bulk-mark-reminders-done-modal';
import { Pagination } from '@/components/pagination';
import { useToast } from '@/hooks/use-toast';

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100, 250, 500, 1000, 5000];
type SortableColumn = keyof Reminder;

export default function RemindersPage() {
  const { reminders, loading, deleteReminder, users: allUsers, bulkMarkRemindersDone, bulkDeleteReminders } = useApp();
  const { role, user } = useAuth();
  const { toast } = useToast();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDoneModalOpen, setIsDoneModalOpen] = useState(false);
  const [isBulkDoneModalOpen, setIsBulkDoneModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [reminderToDelete, setReminderToDelete] = useState<Reminder | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: SortableColumn; direction: 'ascending' | 'descending' } | null>({ key: 'dueDate', direction: 'ascending' });

  const [searchTerm, setSearchTerm] = useState('');

  const sortedReminders = useMemo(() => {
    let sortableItems = [...reminders];

    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key as keyof Reminder];
        const bValue = b[sortConfig.key as keyof Reminder];
        
        if (a.status === 'Pending' && b.status !== 'Pending') return -1;
        if (a.status !== 'Pending' && b.status === 'Pending') return 1;

        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        
        let comparison = 0;
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          comparison = aValue.localeCompare(bValue);
        } else if (aValue instanceof Timestamp && bValue instanceof Timestamp) {
            comparison = aValue.toMillis() - bValue.toMillis();
        } else {
             if (aValue < bValue) {
                comparison = -1;
            }
            if (aValue > bValue) {
                comparison = 1;
            }
        }
        return sortConfig.direction === 'ascending' ? comparison : -comparison;
      });
    } else {
      // Default sort: pending first, then by due date
      sortableItems.sort((a, b) => {
          if (a.status === 'Pending' && b.status !== 'Pending') return -1;
          if (a.status !== 'Pending' && b.status === 'Pending') return 1;
          return a.dueDate.toDate().getTime() - b.dueDate.toDate().getTime();
      });
    }
    return sortableItems;
  }, [reminders, sortConfig]);

  const totalPages = Math.ceil(sortedReminders.length / itemsPerPage);
  const paginatedReminders = sortedReminders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };
  
  const handleSelectRow = (id: string) => {
    setSelectedRows(prev => 
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };
  
  const handleSelectAllOnPage = (checked: boolean | 'indeterminate') => {
    const pageIds = paginatedReminders.map(n => n.id);
    if (checked) {
      setSelectedRows(prev => [...new Set([...prev, ...pageIds])]);
    } else {
      setSelectedRows(prev => prev.filter(id => !pageIds.includes(id)));
    }
  };

  const isAllOnPageSelected = paginatedReminders.length > 0 && paginatedReminders.every(n => selectedRows.includes(n.id));

  const handleMarkDoneClick = (reminder: Reminder) => {
    setSelectedReminder(reminder);
    setIsDoneModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (reminderToDelete) {
      deleteReminder(reminderToDelete.id);
      setReminderToDelete(null);
    }
  };
  
  const requestSort = (key: SortableColumn) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  const getSortIcon = (columnKey: SortableColumn) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />;
    }
    if (sortConfig.direction === 'ascending') {
      return <ArrowUp className="ml-2 h-4 w-4" />;
    }
    return <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const SortableHeader = ({ column, label }: { column: SortableColumn, label: string }) => (
    <TableHead>
        <Button variant="ghost" onClick={() => requestSort(column)} className="px-0 hover:bg-transparent">
            {label}
            {getSortIcon(column)}
        </Button>
    </TableHead>
  );

  const selectedReminderRecords = reminders.filter(r => selectedRows.includes(r.id));
  
  const closeAssignModal = () => {
    setIsAssignModalOpen(false);
    setSelectedRows([]);
  }
  
  const closeBulkDoneModal = () => {
    setIsBulkDoneModalOpen(false);
    setSelectedRows([]);
  }

  const handleBulkDelete = () => {
    const remindersToDelete = selectedReminderRecords.filter(r => r.status === 'Done');
    const pendingReminders = selectedReminderRecords.filter(r => r.status === 'Pending');

    if (pendingReminders.length > 0) {
      toast({
        variant: "destructive",
        title: "Deletion Skipped",
        description: `${pendingReminders.length} pending reminder(s) were not deleted. Only completed reminders can be deleted.`
      });
    }

    if (remindersToDelete.length > 0) {
      const idsToDelete = remindersToDelete.map(r => r.id);
      bulkDeleteReminders(idsToDelete);
    }
    
    setSelectedRows([]);
  };

  return (
    <>
      <PageHeader
        title="Work Reminders"
        description="Manage and track your assigned tasks and reminders."
      >
        <div className="flex gap-2 flex-wrap">
            {role === 'admin' && (
            <Button onClick={() => setIsAddModalOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                New Reminder
            </Button>
            )}
        </div>
      </PageHeader>
      <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-4 flex-wrap">
             <Select value={String(itemsPerPage)} onValueChange={handleItemsPerPageChange}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Items per page" />
              </SelectTrigger>
              <SelectContent>
                {ITEMS_PER_PAGE_OPTIONS.map(val => (
                   <SelectItem key={val} value={String(val)}>{val} / page</SelectItem>
                ))}
              </SelectContent>
            </Select>
             {selectedRows.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                    <Button onClick={() => setIsAssignModalOpen(true)}>
                        <Users className="mr-2 h-4 w-4" />
                        Assign Users ({selectedRows.length})
                    </Button>
                     <Button onClick={() => setIsBulkDoneModalOpen(true)}>
                        <Check className="mr-2 h-4 w-4" />
                        Mark as Done ({selectedRows.length})
                    </Button>
                    {role === 'admin' && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                            <Button variant="destructive">
                                <Trash className="mr-2 h-4 w-4" />
                                Delete ({selectedRows.length})
                            </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                This action will permanently delete {selectedRows.length} selected reminder(s). Only completed reminders will be deleted.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleBulkDelete}>
                                Yes, delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                </div>
            )}
          </div>
        </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                   <Checkbox
                        checked={isAllOnPageSelected}
                        onCheckedChange={handleSelectAllOnPage}
                        aria-label="Select all on this page"
                    />
                </TableHead>
              <SortableHeader column="taskName" label="Task" />
              <TableHead>Assigned To</TableHead>
              <SortableHeader column="dueDate" label="Due Date" />
              <SortableHeader column="status" label="Status" />
              <TableHead>Completion Note</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
                <TableSpinner colSpan={7} />
            ) : paginatedReminders.length > 0 ? (
                paginatedReminders.map((reminder) => {
                    const assignees = Array.isArray(reminder.assignedTo) ? reminder.assignedTo : [reminder.assignedTo].filter(Boolean);
                    return (
                        <TableRow key={reminder.id} data-state={selectedRows.includes(reminder.id) && "selected"}>
                            <TableCell>
                                <Checkbox
                                    checked={selectedRows.includes(reminder.id)}
                                    onCheckedChange={() => handleSelectRow(reminder.id)}
                                    aria-label="Select row"
                                />
                            </TableCell>
                            <TableCell className="font-medium">{reminder.taskName}</TableCell>
                            <TableCell>
                                <div className="flex items-center space-x-2">
                                     <TooltipProvider>
                                        <div className="flex -space-x-2">
                                            {assignees.slice(0, 3).map(name => (
                                                <Tooltip key={name}>
                                                    <TooltipTrigger asChild>
                                                        <Avatar className="h-6 w-6 border-2 border-background">
                                                            <AvatarFallback>{name?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                                                        </Avatar>
                                                    </TooltipTrigger>
                                                    <TooltipContent>{name}</TooltipContent>
                                                </Tooltip>
                                            ))}
                                        </div>
                                    </TooltipProvider>
                                    {assignees.length > 3 && (
                                        <span className="text-xs text-muted-foreground">+{assignees.length - 3} more</span>
                                    )}
                                    {assignees.length === 0 && <span className="text-xs text-muted-foreground">Unassigned</span>}
                                </div>
                            </TableCell>
                            <TableCell>{format(reminder.dueDate.toDate(), 'PPP')}</TableCell>
                            <TableCell>
                                <Badge variant={reminder.status === 'Done' ? 'secondary' : 'destructive'} className={reminder.status === 'Done' ? `bg-green-500/20 text-green-700` : `bg-yellow-500/20 text-yellow-700`}>
                                    {reminder.status}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{reminder.notes || 'N/A'}</TableCell>
                            <TableCell className="text-right">
                                {reminder.status === 'Pending' && (
                                    <Button size="sm" onClick={() => handleMarkDoneClick(reminder)}>
                                        <Check className="mr-2 h-4 w-4" />
                                        Mark as Done
                                    </Button>
                                )}
                                {role === 'admin' && reminder.status === 'Done' && (
                                     <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                                <Trash className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This action will permanently delete the completed task "{reminder.taskName}".
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => deleteReminder(reminder.id)}>Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}
                            </TableCell>
                        </TableRow>
                    )
                })
            ) : (
                <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                        No reminders found.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

       <Pagination 
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        itemsPerPage={itemsPerPage}
        totalItems={sortedReminders.length}
      />

      <AddReminderModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
      
      {selectedReminder && (
        <MarkReminderDoneModal
            isOpen={isDoneModalOpen}
            onClose={() => setIsDoneModalOpen(false)}
            reminder={selectedReminder}
        />
      )}
       <AssignReminderModal
        isOpen={isAssignModalOpen}
        onClose={closeAssignModal}
        selectedReminders={selectedReminderRecords}
      />
      <BulkMarkRemindersDoneModal 
        isOpen={isBulkDoneModalOpen}
        onClose={closeBulkDoneModal}
        selectedReminders={selectedReminderRecords}
      />
    </>
  );
}
