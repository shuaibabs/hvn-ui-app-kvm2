
"use client";

import { useState } from 'react';
import { useApp } from '@/context/app-context';
import { PageHeader } from '@/components/page-header';
import { useAuth } from '@/context/auth-context';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft, Trash, User as UserIcon, Send, Edit } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useNavigation } from '@/context/navigation-context';
import type { User } from '@/lib/data';
import { EditUserModal } from '@/components/edit-user-modal';

export default function ManageUsersPage() {
  const { users: allUsers, deleteUser, loading } = useApp();
  const { user: currentUser, role: adminRole } = useAuth();
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const { navigate } = useNavigation();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);

  const handleEditClick = (user: User) => {
    setUserToEdit(user);
    setIsEditModalOpen(true);
  };

  if (adminRole !== 'admin') {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>You do not have permission to manage users.</AlertDescription>
        </Alert>
        <Button variant="link" asChild className="mt-4" onClick={() => navigate('/dashboard')}>
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
    );
  }

  const handleConfirmDelete = () => {
    if (userToDelete) {
      deleteUser(userToDelete.uid);
      setUserToDelete(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Manage Users"
        description="View, edit, and remove user accounts from the system."
      />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {allUsers.map((user) => (
          <Card key={user.id}>
            <CardHeader className="flex flex-row items-center gap-4">
              <Avatar>
                <AvatarFallback>{user.displayName?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
              <div className='flex-1'>
                <CardTitle className="text-lg">{user.displayName}</CardTitle>
                <CardDescription>
                  {user.email}
                  {user.telegramUsername && (
                    <div className="flex items-center gap-1.5 pt-1 text-muted-foreground">
                      <Send className="h-3.5 w-3.5" />
                      <span className="text-xs">{user.telegramUsername}</span>
                    </div>
                  )}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className='capitalize'>{user.role}</Badge>
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button variant="outline" size="sm" className="w-full" onClick={() => handleEditClick(user)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                disabled={user.uid === currentUser?.uid}
                onClick={() => setUserToDelete(user)}
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      {allUsers.length === 0 && !loading && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No other users found.</p>
          </CardContent>
        </Card>
      )}
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user account for <span className='font-semibold'>{userToDelete?.displayName}</span> and remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              Yes, delete user
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {userToEdit && (
        <EditUserModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          user={userToEdit}
        />
      )}
    </>
  );
}
