import { useState } from "react";
import AuthForm from "@/components/AuthForm";

export default function Auth() {
  const [mode, setMode] = useState<"login" | "signup">("login");

  const handleSubmit = async (data: { email: string; password: string }) => {
    console.log("Submitting login:", data);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: data.email }),
      });

      const json = await res.json();
      console.log("Login response:", json);

      if (json.success) {
        // redirect to dashboard
        window.location.href = "/dashboard";
      } else {
        alert(json.message || "Login failed");
      }
    } catch (error) {
      console.error("Login request error:", error);
      alert("Something went wrong. Try again.");
    }
  };

  return (
    <AuthForm
      mode={mode}
      onSubmit={handleSubmit}
      onToggleMode={() => setMode(mode === "login" ? "signup" : "login")}
    />
  );
}

// import { useState } from 'react';
// import AuthForm from '@/components/AuthForm';

// export default function Auth() {
//   const [mode, setMode] = useState<'login' | 'signup'>('login');

//   const handleSubmit = (data: { name?: string; email: string; password: string }) => {
//     console.log('Auth submitted:', data);
//   };

//   return (
//     <AuthForm
//       mode={mode}
//       onSubmit={handleSubmit}
//       onToggleMode={() => setMode(mode === 'login' ? 'signup' : 'login')}
//     />
//   );
// }
