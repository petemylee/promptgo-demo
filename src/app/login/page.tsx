import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import LoginForm from './LoginForm';

function getHomePathByRole(role: string): string {
  if (role === 'Admin') return '/admin';
  if (role === 'Driver') return '/driver';
  if (role === 'Executive') return '/executive';
  return '/requester';
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reset?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role) {
    redirect(getHomePathByRole(session.user.role));
  }

  const params = await searchParams;
  return (
    <LoginForm
      initialLineError={params?.error}
      resetSuccess={params?.reset === 'success'}
    />
  );
}
