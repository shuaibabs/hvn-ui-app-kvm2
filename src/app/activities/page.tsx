
"use client";

import { useApp } from "@/context/app-context";
import { PageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { useEffect, useState } from "react";
import { Pagination } from "@/components/pagination";
import { TableSpinner } from "@/components/ui/spinner";
import { useAuth } from "@/context/auth-context";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Trash } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100, 250, 500, 1000, 5000];

export default function ActivitiesPage() {
  const { activities, loading, deleteActivities, markActivitiesAsSeen } = useApp();
  const { role } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  useEffect(() => {
    markActivitiesAsSeen();
  }, [markActivitiesAsSeen]);

  const sortedActivities = [...activities].sort((a, b) => {
    if (!a.timestamp || !b.timestamp) return 0;
    return b.timestamp.toDate().getTime() - a.timestamp.toDate().getTime()
  });

  const totalPages = Math.ceil(sortedActivities.length / itemsPerPage);
  const paginatedActivities = sortedActivities.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
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
    const pageIds = paginatedActivities.map(a => a.id);
    if (checked) {
      setSelectedRows(prev => [...new Set([...prev, ...pageIds])]);
    } else {
      setSelectedRows(prev => prev.filter(id => !pageIds.includes(id)));
    }
  };

  const handleDeleteSelected = () => {
    deleteActivities(selectedRows);
    setSelectedRows([]);
  };

  const isAllOnPageSelected = paginatedActivities.length > 0 && paginatedActivities.every(p => selectedRows.includes(p.id));

  const pageTitle = role === 'admin' ? "System Activity Log" : "My Activity Log";
  const pageDescription = role === 'admin' 
    ? "A log of all actions performed by users in the system."
    : "A log of all actions you have performed in the system.";

  return (
    <>
      <PageHeader
        title={pageTitle}
        description={pageDescription}
      />
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
            {role === 'admin' && selectedRows.length > 0 && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                        <Trash className="mr-2 h-4 w-4" />
                        Delete Selected ({selectedRows.length})
                    </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete {selectedRows.length} activity record(s).
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteSelected}>
                        Yes, delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
          </div>
        </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {role === 'admin' && (
                <TableHead className="w-12">
                   <Checkbox
                        checked={isAllOnPageSelected}
                        onCheckedChange={handleSelectAllOnPage}
                        aria-label="Select all on this page"
                    />
                </TableHead>
              )}
              <TableHead>Sr.No</TableHead>
              <TableHead>Employee Name</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
             {loading ? (
              <TableSpinner colSpan={role === 'admin' ? 6 : 5} />
            ) : paginatedActivities.length > 0 ? (
                paginatedActivities.map((activity, index) => (
                <TableRow key={`${activity.id}-${index}`} data-state={selectedRows.includes(activity.id) && "selected"}>
                    {role === 'admin' && (
                        <TableCell>
                            <Checkbox
                                checked={selectedRows.includes(activity.id)}
                                onCheckedChange={() => handleSelectRow(activity.id)}
                                aria-label="Select row"
                            />
                        </TableCell>
                    )}
                    <TableCell>{activity.srNo}</TableCell>
                    <TableCell className="font-medium">{activity.employeeName}</TableCell>
                    <TableCell>{activity.action}</TableCell>
                    <TableCell>{activity.source}</TableCell>
                    <TableCell>{activity.description}</TableCell>
                    <TableCell>{activity.timestamp ? format(activity.timestamp.toDate(), 'PPpp') : 'Syncing...'}</TableCell>
                </TableRow>
                ))
            ) : (
                <TableRow>
                    <TableCell colSpan={role === 'admin' ? 6 : 5} className="h-24 text-center">
                        No activities found.
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
        totalItems={sortedActivities.length}
      />
    </>
  );
}
