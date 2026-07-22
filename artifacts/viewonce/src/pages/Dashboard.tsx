import { useEffect } from 'react';

/**
 * Dashboard route: mirrors the original Next.js app/page.tsx which
 * redirected to /dashboard and let middleware do role-based routing.
 *
 * Here we redirect straight to the appropriate HTML dashboard.
 * Role is read from localStorage (set by auth.html / api.js).
 */
const ROLE_DASHBOARD: Record<string, string> = {
  super_admin: 'platform-master-hub/dashboard.html',
  platform_master_hub: 'platform-master-hub/dashboard.html',
  platform_master: 'platform-master-hub/dashboard.html',
  admin: 'admin-dashboard.html',
  host: 'host-dashboard-upgraded.html',
  support: 'support-dashboard-upgraded.html',
  customer: 'customer-dashboard.html',
};

export default function Dashboard() {
  useEffect(() => {
    const role =
      localStorage.getItem('userRole') ||
      localStorage.getItem('role') ||
      'customer';
    const dest = ROLE_DASHBOARD[role] ?? 'customer-dashboard.html';
    window.location.href = `${import.meta.env.BASE_URL}${dest}`;
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-deep">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white text-lg font-medium">Redirecting to your dashboard…</p>
      </div>
    </div>
  );
}
