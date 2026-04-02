import './globals.css';
import { Inter } from 'next/font/google';
import { cookies } from 'next/headers';
import Sidebar from './components/Sidebar';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Airbnb Stays Dashboard',
  description: 'Role-based dashboards for Airbnb Stays',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const userRole = cookieStore.get?.('user-role')?.value || null;

  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex">
          <Sidebar userRole={userRole} />
          <div className="flex-grow">{children}</div>
        </div>
      </body>
    </html>
  );
}