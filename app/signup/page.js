import AuthForm from '@/components/AuthForm';

export const metadata = { title: 'Sign Up — Stitchhouse' };

export default function SignupPage() {
  return <AuthForm initialMode="signup" />;
}
