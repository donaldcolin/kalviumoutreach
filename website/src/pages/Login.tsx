import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

export default function Login() {
  const { login, isAuthenticated, isLoading, error } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login(email, password);
  };

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-transparent relative">
      <Card className="w-full max-w-md border border-border shadow-sm bg-card animate-in fade-in zoom-in-95 duration-500 rounded-3xl p-4">
        <CardHeader className="space-y-2 pb-8 pt-4">
          <CardTitle className="text-3xl font-bold tracking-tight text-foreground">Sign In</CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            Enter your credentials to manage your team.
          </CardDescription>
        </CardHeader>

        <CardContent className="pb-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-xl mb-6 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground" htmlFor="email">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                required
                className="h-12 bg-background border-border focus-visible:ring-1 focus-visible:ring-ring transition-all placeholder:text-muted-foreground/50 rounded-xl px-4"
                placeholder="Eg. admin@kalvium.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground" htmlFor="password">
                Password
              </label>
              <Input
                id="password"
                type="password"
                required
                className="h-12 bg-background border-border focus-visible:ring-1 focus-visible:ring-ring transition-all placeholder:text-muted-foreground/50 rounded-xl px-4"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 mt-4 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                'Continue'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
