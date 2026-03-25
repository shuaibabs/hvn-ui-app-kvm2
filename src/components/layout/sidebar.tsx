
"use client";

import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Smartphone,
  RadioTower,
  MapPin,
  DollarSign,
  ClipboardList,
  History,
  FileOutput,
  Signal,
  ShoppingCart,
  LogOut,
  UserPlus,
  Users,
  Database,
  Handshake,
  Bookmark,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { Separator } from '../ui/separator';
import { useAuth } from '@/context/auth-context';
import { useNavigation } from '@/context/navigation-context';
import TrionexLogo from '../icons/trionex-logo';

const navItems: {
  href: string;
  label: string;
  icon: React.ElementType;
  adminOnly: boolean;
  devOnly?: boolean;
}[] = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, adminOnly: false },
    { href: '/numbers', label: 'All Numbers', icon: Smartphone, adminOnly: false },
    { href: '/history', label: 'Global History', icon: History, adminOnly: false },
    { href: '/postpaid', label: 'Postpaid Numbers', icon: Signal, adminOnly: false },
    { href: '/pre-booking', label: 'Pre-Booking', icon: Bookmark, adminOnly: false },
    { href: '/partners', label: 'Partners', icon: Handshake, adminOnly: false },
    { href: '/signup', label: 'Create User', icon: UserPlus, adminOnly: true },
    { href: '/users', label: 'Manage Users', icon: Users, adminOnly: true },
    { href: '/sim-locations', label: 'SIM Locations', icon: MapPin, adminOnly: false },
    { href: '/sales', label: 'Sales', icon: DollarSign, adminOnly: false },
    { href: '/manage-sales', label: 'Manage Sales', icon: Database, adminOnly: false },
    { href: '/dealer-purchases', label: 'Dealer Purchases', icon: ShoppingCart, adminOnly: false },
    { href: '/dealers', label: 'Manage Dealers', icon: Users, adminOnly: false },
    { href: '/reminders', label: 'Work Reminders', icon: ClipboardList, adminOnly: false },
    { href: '/cocp', label: 'COCP', icon: RadioTower, adminOnly: false },
    { href: '/deleted-numbers', label: 'Deleted Numbers', icon: Trash2, adminOnly: false },
    { href: '/activities', label: 'Activities', icon: History, adminOnly: false },
    { href: '/import-export', label: 'Import / Export', icon: FileOutput, adminOnly: false },
  ];

export function AppSidebar() {
  const pathname = usePathname();
  const { role } = useAuth();
  const { isMobile, setOpenMobile } = useSidebar();
  const { navigate } = useNavigation();

  const handleLinkClick = (href: string) => {
    navigate(href);
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <Sidebar >
      <SidebarHeader>
        <div className="flex items-center gap-3 p-2">
          <img
            src="\assets\icons\icon.png"
            alt="App Icon"
            className="h-8 w-8 object-contain"
          />
          <h1 className="text-xl font-bold text-sidebar-foreground">
            Hashmi VIP Numbers
          </h1>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => {
            if (item.devOnly && !isDevelopment) return null;

            return (!item.adminOnly || role === 'admin') && (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  tooltip={item.label}
                  onClick={() => handleLinkClick(item.href)}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <Separator className="my-2 bg-sidebar-border" />
        <div className="p-4 text-center text-xs text-sidebar-foreground/70 space-y-2 group-data-[collapsible=icon]:hidden">
          <div className="flex flex-col items-center">
            <div className="w-full text-left">
              <span>Developed by</span>
            </div>

            <a
              href="https://trionexdigital.netlify.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 flex justify-center font-semibold text-sidebar-foreground/90 hover:text-sidebar-foreground transition-colors"
            >
              <TrionexLogo />
            </a>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
