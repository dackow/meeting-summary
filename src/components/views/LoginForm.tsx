// src/components/views/LoginForm.tsx
import * as React from "react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/auth"; // Use the shared supabase client
import { Loader2 } from "lucide-react"; // Install lucide-react if not already: npx shadcn@latest add icon

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null); // Clear previous errors
    setIsLoading(true);

    // Call Supabase sign-in method
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Map Supabase error messages to user-friendly ones if needed
      setError(error.message);
      setIsLoading(false); // Reset loading on error
    } else {
      // On successful login, Supabase SDK manages the session in cookies/localStorage.
      // The MainLayout/middleware check on /summaries page load will see the session.
      // Force redirect immediately for better UX.
      window.location.href = "/summaries";
      // isLoading remains true briefly until the redirect happens, which is fine.
    }
  };

  return (
    <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-center">Zaloguj się</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="marian@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading} // Disable inputs while loading
          />
        </div>
        <div>
          <Label htmlFor="password">Hasło</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading} // Disable inputs while loading
          />
        </div>
        {error && <p className="text-sm font-medium text-red-500 text-center">{error}</p>}
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Zaloguj
        </Button>
      </form>
    </div>
  );
};

export default LoginForm;
