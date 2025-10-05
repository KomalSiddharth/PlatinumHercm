import { useState } from 'react';
import AuthForm from '@/components/AuthForm';

export default function Auth() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  const handleSubmit = (data: { name?: string; email: string; password: string }) => {
    console.log('Auth submitted:', data);
  };

  return (
    <AuthForm
      mode={mode}
      onSubmit={handleSubmit}
      onToggleMode={() => setMode(mode === 'login' ? 'signup' : 'login')}
    />
  );
}
