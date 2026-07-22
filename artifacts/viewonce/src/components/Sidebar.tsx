import { Link, useLocation } from 'wouter';

interface NavLink {
  href: string;
  label: string;
  roles: string[];
  icon?: string;
}

const navLinks: NavLink[] = [
  { href: '/customer-dashboard.html', label: 'Customer Dashboard', roles: ['customer'], icon: '🏠' },
  { href: '/host-dashboard-upgraded.html', label: 'Host Dashboard', roles: ['host'], icon: '🏡' },
  { href: '/admin-dashboard.html', label: 'Admin Dashboard', roles: ['admin'], icon: '⚙️' },
  { href: '/support-dashboard-upgraded.html', label: 'Support Center', roles: ['support'], icon: '📞' },
  {
    href: '/platform-master-hub/dashboard.html',
    label: 'Platform Master Hub',
    roles: ['super_admin', 'platform_master_hub', 'platform_master'],
    icon: '🚀',
  },
  { href: '/profile.html', label: 'Profile', roles: ['customer', 'host', 'admin', 'support', 'super_admin', 'platform_master_hub', 'platform_master'], icon: '👤' },
  { href: '/settings.html', label: 'Settings', roles: ['customer', 'host', 'admin', 'support', 'super_admin', 'platform_master_hub', 'platform_master'], icon: '🛠️' },
  { href: '/auth.html', label: 'Logout', roles: ['customer', 'host', 'admin', 'support', 'super_admin', 'platform_master_hub', 'platform_master'], icon: '🚪' },
];

interface SidebarProps {
  userRole: string | null;
}

export default function Sidebar({ userRole }: SidebarProps) {
  const [pathname] = useLocation();

  const filteredLinks = navLinks.filter(
    (link) => userRole && link.roles.includes(userRole),
  );

  return (
    <aside className="w-64 bg-gray-800 text-white p-4 min-h-screen flex flex-col">
      <div className="text-2xl font-bold mb-8">Dashboard</div>
      <nav className="flex-grow">
        <ul>
          {filteredLinks.map((link) => (
            <li key={link.href} className="mb-2">
              <a
                href={link.href}
                className={`flex items-center p-2 rounded-md transition-colors duration-200 ${
                  pathname.startsWith(link.href)
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-gray-700'
                }`}
              >
                {link.icon && <span className="mr-3">{link.icon}</span>}
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-auto pt-4 border-t border-gray-700 text-sm text-gray-400">
        Logged in as: <span className="capitalize">{userRole ?? 'Guest'}</span>
      </div>
    </aside>
  );
}
