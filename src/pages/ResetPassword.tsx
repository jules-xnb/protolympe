import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { AUTH_ROUTES } from '@/lib/routes';
import { z } from 'zod';

const passwordSchema = z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères');

export default function ResetPassword() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRecovery, setIsRecovery] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Check hash for type=recovery
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setIsRecovery(true);
    }
    setChecked(true);
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      passwordSchema.parse(password);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    if (password !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/api/auth/update-password', { password });
      toast.success('Mot de passe mis à jour avec succès !');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la mise à jour du mot de passe');
    } finally {
      setIsLoading(false);
    }
  };

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isRecovery) {
    return (
      <div className="flex h-screen items-center justify-center bg-muted/30 p-6">
        <div className="flex w-full h-full overflow-hidden rounded-2xl bg-background shadow-xl border border-border/40">
          <div className="flex w-full lg:w-[55%] flex-col p-10">
            <div className="mb-auto">
              <span className="text-2xl font-extrabold tracking-tight text-foreground">
                DELT<span className="text-primary">▶</span>
              </span>
            </div>
            <div className="flex-1 flex flex-col justify-center max-w-[420px]">
              <h1 className="text-3xl font-semibold text-foreground mb-4">Lien invalide</h1>
              <p className="text-sm text-muted-foreground mb-6">
                Ce lien de réinitialisation est invalide ou a expiré.
              </p>
              <Button
                onClick={() => navigate(AUTH_ROUTES.LOGIN)}
                className="w-full h-11 rounded-lg text-sm font-medium"
              >
                Retour à la connexion
              </Button>
            </div>
            <div className="mt-auto" />
          </div>
          <div className="hidden lg:block lg:w-[45%] p-5">
            <div className="h-full w-full rounded-2xl bg-gradient-to-br from-[hsl(var(--primary)/0.55)] to-[hsl(var(--primary))]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-muted/30 p-6">
      <div className="flex w-full h-full overflow-hidden rounded-2xl bg-background shadow-xl border border-border/40">
        <div className="flex w-full lg:w-[55%] flex-col p-10">
          <div className="mb-auto">
            <span className="text-2xl font-extrabold tracking-tight text-foreground">
              DELT<span className="text-primary">▶</span>
            </span>
          </div>
          <div className="flex-1 flex flex-col justify-center max-w-[420px]">
            <h1 className="text-3xl font-semibold text-foreground mb-2">Nouveau mot de passe</h1>
            <p className="text-sm text-muted-foreground mb-8">
              Choisissez un nouveau mot de passe pour votre compte.
            </p>
            <form onSubmit={handleReset} className="space-y-5">
              <div className="space-y-2">
                <Label>Nouveau mot de passe</Label>
                <Input
                  type="password"
                  placeholder="Nouveau mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label>Confirmer le mot de passe</Label>
                <Input
                  type="password"
                  placeholder="Confirmer le mot de passe"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-11 rounded-lg text-sm font-medium"
                disabled={isLoading}
              >
                Mettre à jour
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              </Button>
            </form>
          </div>
          <div className="mt-auto" />
        </div>
        <div className="hidden lg:block lg:w-[45%] p-5">
          <div className="h-full w-full rounded-2xl bg-gradient-to-br from-[hsl(var(--primary)/0.55)] to-[hsl(var(--primary))]" />
        </div>
      </div>
    </div>
  );
}
