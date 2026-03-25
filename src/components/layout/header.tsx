
"use client";

import { Bell, LogOut, Moon, Sun, UserPlus, Users } from "lucide-react";
import { Button } from "../ui/button";
import { SidebarTrigger } from "../ui/sidebar";
import { ThemeToggle } from "../theme-toggle";
import { useApp } from "@/context/app-context";
import { Badge } from "../ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from "../ui/scroll-area";
import Link from "next/link";
import { Separator } from "../ui/separator";
import { useState, useEffect } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { useAuth } from "@/context/auth-context";
import { getAuth, signOut } from "firebase/auth";
import { useFirebaseApp } from "@/firebase";
import { useNavigation } from "@/context/navigation-context";
import { usePathname } from "next/navigation";

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


export function AppHeader() {
    const { activities, seenActivitiesCount, markActivitiesAsSeen } = useApp();
    const { user, role } = useAuth();
    const app = useFirebaseApp();
    const { navigate } = useNavigation();
    const pathname = usePathname();
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    
    const sortedActivities = [...activities]
        .filter(activity => activity.timestamp) // Ensure timestamp is not null
        .sort((a, b) => b.timestamp.toDate().getTime() - a.timestamp.toDate().getTime());

    const newActivityCount = sortedActivities.length - seenActivitiesCount;

    const handleLogout = async () => {
        if (!app) return;
        const auth = getAuth(app);
        await signOut(auth);
        navigate('/login', { replace: true });
    };

    const handleViewAllActivities = () => {
        navigate('/activities');
        setIsNotificationsOpen(false);
    }

    const handleAdminNavigation = (path: string) => {
        navigate(path);
    }

    return (
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
            <div className="flex items-center gap-4">
                <div className="md:hidden">
                    <SidebarTrigger />
                </div>
                {user && (
                    <div className="hidden md:flex flex-col items-start">
                        <p className="text-sm font-medium leading-none">{user.displayName || user.email}</p>
                        <p className="text-xs leading-none text-muted-foreground capitalize">
                            {role}
                        </p>
                    </div>
                )}
            </div>
            
            <div className="flex-1">
                {/* Optional: Add page title or breadcrumbs here */}
            </div>

            <div className="flex items-center gap-4">
                <Popover open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="relative" onClick={markActivitiesAsSeen}>
                            <Bell className="h-5 w-5" />
                            {newActivityCount > 0 && (
                                <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 justify-center p-0 text-[10px]">
                                    {newActivityCount > 9 ? '9+' : newActivityCount}
                                </Badge>
                            )}
                            <span className="sr-only">Notifications</span>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0">
                       <div className="p-4">
                         <h4 className="font-medium text-sm">Notifications</h4>
                       </div>
                       <Separator />
                       <ScrollArea className="h-96">
                        <div className="p-4 space-y-4">
                        {sortedActivities.length === 0 && (
                            <p className="text-sm text-center text-muted-foreground py-8">No new notifications.</p>
                        )}
                        {sortedActivities.slice(0, 20).map((activity, index) => (
                            <div key={`${activity.id}-${index}`} className="flex items-start gap-4">
                                <Avatar className="h-8 w-8 border">
                                    <AvatarFallback>{activity.employeeName?.[0].toUpperCase() || 'A'}</AvatarFallback>
                                </Avatar>
                                <div className="grid gap-1 flex-1">
                                    <p className="text-sm font-medium leading-none">
                                    <span className="font-semibold">{activity.employeeName}</span> {activity.action.toLowerCase()}
                                    </p>
                                    <p className="text-sm text-muted-foreground">{activity.description}</p>
                                     <p className="text-xs text-muted-foreground">
                                        <ActivityTime timestamp={activity.timestamp.toDate()} />
                                    </p>
                                </div>
                            </div>
                        ))}
                        </div>
                       </ScrollArea>
                       <Separator />
                       <div className="p-2">
                           <Button variant="link" size="sm" className="w-full" onClick={handleViewAllActivities}>
                               View all activities
                           </Button>
                       </div>
                    </PopoverContent>
                </Popover>
                <ThemeToggle />
                 {user && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                                <Avatar className="h-9 w-9">
                                    <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? ''} />
                                    <AvatarFallback>{user.displayName?.[0].toUpperCase() || user.email?.[0].toUpperCase() || 'U'}</AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end" forceMount>
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium leading-none">{user.displayName || user.email}</p>
                                    <p className="text-xs leading-none text-muted-foreground capitalize">
                                        {role}
                                    </p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                             {role === 'admin' && (
                                <>
                                    <DropdownMenuItem onClick={() => handleAdminNavigation('/signup')}>
                                        <UserPlus className="mr-2 h-4 w-4" />
                                        <span>Create User</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleAdminNavigation('/users')}>
                                        <Users className="mr-2 h-4 w-4" />
                                        <span>Manage Users</span>
                                    </DropdownMenuItem>
                                </>
                             )}
                            <DropdownMenuItem onClick={handleLogout}>
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>Log out</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                 )}
            </div>
        </header>
    );
}
