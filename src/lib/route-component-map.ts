
import DashboardPage from '@/app/dashboard/page';
import AllNumbersPage from '@/app/numbers/page';
import PostpaidPage from '@/app/postpaid/page';
import PreBookingPage from '@/app/pre-booking/page';
import PartnersPage from '@/app/partners/page';
import SignupPage from '@/app/signup/page';
import ManageUsersPage from '@/app/users/page';
import SimLocationsPage from '@/app/sim-locations/page';
import SalesPage from '@/app/sales/page';
import ManageSalesPage from '@/app/manage-sales/page';
import DealerPurchasesPage from '@/app/dealer-purchases/page';
import RemindersPage from '@/app/reminders/page';
import CocpPage from '@/app/cocp/page';
import ActivitiesPage from '@/app/activities/page';
import ImportExportPage from '@/app/import-export/page';
import HistoryPage from '@/app/history/page';
import NewNumberPage from '@/app/numbers/new/page';
import NumberDetailsPage from '@/app/numbers/[id]/page';
import EditNumberPage from '@/app/numbers/[id]/edit/page';
import DeletedNumbersPage from '@/app/deleted-numbers/page';

const staticRouteComponentMap = {
  '/dashboard': DashboardPage,
  '/numbers': AllNumbersPage,
  '/numbers/new': NewNumberPage,
  '/history': HistoryPage,
  '/postpaid': PostpaidPage,
  '/pre-booking': PreBookingPage,
  '/partners': PartnersPage,
  '/signup': SignupPage,
  '/users': ManageUsersPage,
  '/sim-locations': SimLocationsPage,
  '/sales': SalesPage,
  '/manage-sales': ManageSalesPage,
  '/dealer-purchases': DealerPurchasesPage,
  '/reminders': RemindersPage,
  '/cocp': CocpPage,
  '/activities': ActivitiesPage,
  '/import-export': ImportExportPage,
  '/deleted-numbers': DeletedNumbersPage,
};

const dynamicRoutePatterns: { pattern: RegExp, component: React.ComponentType, getLabel: (pathname: string) => string }[] = [
  {
    pattern: /^\/numbers\/([^/]+)\/edit$/,
    component: EditNumberPage,
    getLabel: (pathname) => `Edit Number`,
  },
  {
    pattern: /^\/numbers\/([^/]+)$/,
    component: NumberDetailsPage,
    getLabel: (pathname) => `Number Details`,
  },
];

export function getRouteInfo(pathname: string): { component: React.ComponentType, label: string } | null {
  if (staticRouteComponentMap[pathname as keyof typeof staticRouteComponentMap]) {
    return {
      component: staticRouteComponentMap[pathname as keyof typeof staticRouteComponentMap],
      label: getLabelForRoute(pathname),
    };
  }

  for (const route of dynamicRoutePatterns) {
    if (route.pattern.test(pathname)) {
      return { component: route.component, label: route.getLabel(pathname) };
    }
  }
  return null;
}

const routeLabels: { [key: string]: string } = {
  '/dashboard': 'Dashboard',
  '/numbers': 'All Numbers',
  '/numbers/new': 'Add Number',
  '/history': 'Global History',
  '/postpaid': 'Postpaid Numbers',
  '/pre-booking': 'Pre-Booking',
  '/partners': 'Partners',
  '/signup': 'Create User',
  '/users': 'Manage Users',
  '/sim-locations': 'SIM Locations',
  '/sales': 'Sales',
  '/manage-sales': 'Manage Sales',
  '/dealer-purchases': 'Dealer Purchases',
  '/reminders': 'Work Reminders',
  '/cocp': 'COCP',
  '/activities': 'Activities',
  '/import-export': 'Import / Export',
  '/deleted-numbers': 'Deleted Numbers',
};

export function getLabelForRoute(href: string): string {
    const staticLabel = routeLabels[href];
    if (staticLabel) return staticLabel;

    for (const route of dynamicRoutePatterns) {
        if (route.pattern.test(href)) {
            return route.getLabel(href);
        }
    }
    return 'New Tab';
}
