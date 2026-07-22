import { redirect } from 'next/navigation';

export default function HomePage() {
  // Redirect to the /dashboard route, which will then be handled by the middleware
  // for role-based redirection.
  redirect('/dashboard');
}
