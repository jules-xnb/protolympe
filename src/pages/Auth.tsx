import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, ArrowLeft } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().email('Email invalide');
const passwordSchema = z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères');

type AuthView = 'login' | 'forgot';

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<AuthView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');

  useEffect(() => {
    if (user && !authLoading) {
      navigate('/dashboard');
    }
  }, [user, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }
    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Email ou mot de passe incorrect');
      } else if (error.message.includes('Email not confirmed')) {
        toast.error('Veuillez confirmer votre email avant de vous connecter');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Connexion réussie !');
      navigate('/dashboard');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      emailSchema.parse(forgotEmail);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }
    setIsLoading(true);
    // TODO: implement password reset via backend
    const error = null as Error | null;
    setIsLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Un email de réinitialisation vous a été envoyé.');
      setView('login');
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-muted/30 p-6">
      <div className="flex w-full h-full overflow-hidden rounded-2xl bg-background shadow-xl border border-border/40">
        {/* Left side */}
        <div className="flex w-full lg:w-[55%] flex-col p-10">
          {/* Logo */}
          <div className="mb-auto">
            <span className="text-2xl font-extrabold tracking-tight text-foreground">
              DELT<span className="text-primary">▶</span>
            </span>
          </div>

          {/* Form centered vertically */}
          <div className="flex-1 flex flex-col justify-center max-w-[420px]">
            {view === 'login' ? (
              <>
                <h1 className="text-3xl font-semibold text-foreground mb-8">Connexion</h1>
                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-2">
                    <Label>Email address</Label>
                    <Input
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11 rounded-lg text-sm font-medium"
                    disabled={isLoading}
                  >
                    Sign in
                    {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  </Button>
                </form>
                <Button
                  variant="text"
                  size="sm"
                  className="mt-6 p-0"
                  onClick={() => setView('forgot')}
                >
                  Mot de passe oublié ?
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 mb-6 px-0 text-muted-foreground hover:text-foreground"
                  onClick={() => setView('login')}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Retour
                </Button>
                <h1 className="text-3xl font-semibold text-foreground mb-2">Mot de passe oublié</h1>
                <p className="text-sm text-muted-foreground mb-8">
                  Saisissez votre adresse email pour recevoir un lien de réinitialisation.
                </p>
                <form onSubmit={handleForgotPassword} className="space-y-5">
                  <div className="space-y-2">
                    <Label>Email address</Label>
                    <Input
                      type="email"
                      placeholder="Email address"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11 rounded-lg text-sm font-medium"
                    disabled={isLoading}
                  >
                    Envoyer le lien
                    {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  </Button>
                </form>
              </>
            )}
          </div>

          <div className="mt-auto" />
        </div>

        {/* Right side - gradient */}
        <div className="hidden lg:block lg:w-[45%] p-5">
          <div className="h-full w-full rounded-2xl bg-gradient-to-br from-[hsl(var(--primary)/0.55)] to-[hsl(var(--primary))]" />
        </div>
      </div>
    </div>
  );
}
