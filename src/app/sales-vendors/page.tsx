"use client";

import { useState, useMemo } from 'react';
import { useApp } from '@/context/app-context';
import { PageHeader } from '@/components/page-header';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash, Edit, Plus, Search } from 'lucide-react';
import { TableSpinner } from '@/components/ui/spinner';
import { format } from 'date-fns';
import { useAuth } from '@/context/auth-context';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { SalesVendorRecord } from '@/lib/data';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function ManageSalesVendorsPage() {
    const { salesVendors, loading, addSalesVendor, updateSalesVendor, deleteSalesVendor } = useApp();
    const { role } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');

    // Modals state
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newVendorName, setNewVendorName] = useState('');

    const [vendorToEdit, setVendorToEdit] = useState<SalesVendorRecord | null>(null);
    const [editVendorName, setEditVendorName] = useState('');

    const [vendorToDelete, setVendorToDelete] = useState<SalesVendorRecord | null>(null);

    const filteredVendors = useMemo(() => {
        return salesVendors.filter(v =>
            v.name.toLowerCase().includes(searchTerm.toLowerCase())
        ).sort((a, b) => a.name.localeCompare(b.name));
    }, [salesVendors, searchTerm]);

    const handleAdd = async () => {
        if (!newVendorName.trim()) return;
        await addSalesVendor(newVendorName.trim());
        setNewVendorName('');
        setIsAddModalOpen(false);
    };

    const handleEditOpen = (vendor: SalesVendorRecord) => {
        if (role !== 'admin') return;
        setVendorToEdit(vendor);
        setEditVendorName(vendor.name);
    };

    const handleEditSubmit = async () => {
        if (!vendorToEdit || !editVendorName.trim()) return;
        await updateSalesVendor(vendorToEdit.id, editVendorName.trim());
        setVendorToEdit(null);
    };

    const handleDeleteConfirm = async () => {
        if (!vendorToDelete) return;
        await deleteSalesVendor(vendorToDelete.id);
        setVendorToDelete(null);
    };

    return (
        <>
            <PageHeader
                title="Manage Sales Vendors"
                description="View and manage the master list of vendors for sales."
            >
                <Button onClick={() => setIsAddModalOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Vendor
                </Button>
            </PageHeader>

            <div className="flex items-center gap-4 mb-4">
                <div className="relative flex-1 sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search vendors..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </div>

            <div className="border rounded-lg bg-background shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-16">Sr.No</TableHead>
                            <TableHead>Vendor Name</TableHead>
                            <TableHead className="w-32">Created Date</TableHead>
                            {role === 'admin' && <TableHead className="w-24 text-right">Actions</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableSpinner colSpan={role === 'admin' ? 4 : 3} />
                        ) : filteredVendors.length > 0 ? (
                            filteredVendors.map((vendor, index) => (
                                <TableRow key={vendor.id}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell className="font-medium">{vendor.name}</TableCell>
                                    <TableCell className="text-muted-foreground whitespace-nowrap">
                                        {vendor.createdAt ? format(vendor.createdAt.toDate(), 'dd-MM-yyyy') : 'N/A'}
                                    </TableCell>
                                    {role === 'admin' && (
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => handleEditOpen(vendor)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => setVendorToDelete(vendor)}>
                                                    <Trash className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={role === 'admin' ? 4 : 3} className="h-24 text-center">
                                    No vendors found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Add Modal */}
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Vendor</DialogTitle>
                        <DialogDescription>Enter the name of the new sales vendor.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            value={newVendorName}
                            onChange={e => setNewVendorName(e.target.value)}
                            placeholder="Vendor Name"
                            onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleAdd} disabled={!newVendorName.trim()}>Add Vendor</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Modal */}
            <Dialog open={!!vendorToEdit} onOpenChange={(open) => !open && setVendorToEdit(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Vendor</DialogTitle>
                        <DialogDescription>Change the name of the selected vendor.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            value={editVendorName}
                            onChange={e => setEditVendorName(e.target.value)}
                            placeholder="Vendor Name"
                            onKeyDown={e => { if (e.key === 'Enter') handleEditSubmit() }}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setVendorToEdit(null)}>Cancel</Button>
                        <Button onClick={handleEditSubmit} disabled={!editVendorName.trim() || editVendorName === vendorToEdit?.name}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!vendorToDelete} onOpenChange={(open) => !open && setVendorToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the vendor <strong>{vendorToDelete?.name}</strong> from the database.
                            Note: This will not remove the vendor name from past sales records, but it will remove it from the selectable list.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
