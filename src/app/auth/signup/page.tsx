"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Cpu, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!supabase) {
      router.push("/dashboard");
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setIsLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_hsl(199_89%_10%),_hsl(222_47%_6%)_60%)] px-4">
      <Card className="w-full max-w-sm border-jarvis/20 bg-card/80 backdrop-blur">
        <CardHeader className="items-center text-center">
          <Cpu className="mb-2 h-8 w-8 text-jarvis" />
          <CardTitle>Crear cuenta en V.E.R.A</CardTitle>
          <CardDescription>
            {supabase ? "Empieza a diseñar con IA" : "Modo demo: no se requiere registro"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <p className="text-center text-sm text-emerald-400">
              Revisa tu correo para confirmar la cuenta.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {supabase && (
                <>
                  <Input
                    type="email"
                    placeholder="tu@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <Input
                    type="password"
                    placeholder="Contraseña (mín. 6 caracteres)"
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" variant="jarvis" className="w-full gap-2" disabled={isLoading}>
                <UserPlus className="h-4 w-4" />
                {isLoading ? "Creando cuenta…" : supabase ? "Registrarme" : "Entrar en modo demo"}
              </Button>
            </form>
          )}
          <p className="mt-4 text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{" "}
            <Link href="/auth/login" className="text-jarvis hover:underline">
              Inicia sesión
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
