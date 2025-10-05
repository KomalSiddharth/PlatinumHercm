import { useState } from 'react';
import AuthForm from '../AuthForm';

export default function AuthFormExample() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  return (
    <AuthForm
      mode={mode}
      onSubmit={(data) => console.log('Auth submitted:', data)}
      onToggleMode={() => setMode(mode === 'login' ? 'signup' : 'login')}
    />
  );
}
