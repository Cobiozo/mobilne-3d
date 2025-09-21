import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/contexts/AppContext';
import { getText } from '@/lib/i18n';
import { Check, X } from 'lucide-react';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user, loading, signUp, signIn, signInWithGoogle } = useAuth();
  const { language } = useApp();
  const navigate = useNavigate();

  // Password validation state
  const [passwordFocus, setPasswordFocus] = useState(false);
  
  const validatePassword = (pass: string) => {
    return {
      minLength: pass.length >= 6,
      hasLowercase: /[a-z]/.test(pass),
      hasUppercase: /[A-Z]/.test(pass),
      hasDigit: /\d/.test(pass)
    };
  };

  const passwordValidation = validatePassword(password);
  const isPasswordValid = Object.values(passwordValidation).every(Boolean);

  useEffect(() => {
    if (user && !loading) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return <LoadingSpinner />;
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid) {
      return;
    }
    setIsLoading(true);
    await signUp(email, password, displayName);
    setIsLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await signIn(email, password);
    setIsLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    await signInWithGoogle();
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            {getText('welcome', language)}
          </CardTitle>
          <CardDescription>
            {getText('authDescription', language)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">
                {getText('signIn', language)}
              </TabsTrigger>
              <TabsTrigger value="signup">
                {getText('signUp', language)}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">
                    {getText('password', language)}
                  </Label>
                  <Input
                    id="signin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <LoadingSpinner /> : getText('signIn', language)}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">
                    {getText('displayName', language)}
                  </Label>
                  <Input
                    id="signup-name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">
                    {getText('password', language)}
                  </Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setPasswordFocus(true)}
                    onBlur={() => setPasswordFocus(false)}
                    required
                    minLength={6}
                    className={!isPasswordValid && password.length > 0 ? 'border-destructive' : ''}
                  />
                  
                  {/* Password Requirements */}
                  {(passwordFocus || password.length > 0) && (
                    <div className="space-y-2 p-3 bg-muted rounded-md text-sm">
                      <p className="font-medium text-muted-foreground">Wymagania hasła:</p>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {passwordValidation.minLength ? 
                            <Check className="h-4 w-4 text-green-600" /> : 
                            <X className="h-4 w-4 text-destructive" />
                          }
                          <span className={passwordValidation.minLength ? 'text-green-600' : 'text-muted-foreground'}>
                            Minimum 6 znaków (zalecane 8 lub więcej)
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {passwordValidation.hasLowercase ? 
                            <Check className="h-4 w-4 text-green-600" /> : 
                            <X className="h-4 w-4 text-destructive" />
                          }
                          <span className={passwordValidation.hasLowercase ? 'text-green-600' : 'text-muted-foreground'}>
                            Małe litery (a-z)
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {passwordValidation.hasUppercase ? 
                            <Check className="h-4 w-4 text-green-600" /> : 
                            <X className="h-4 w-4 text-destructive" />
                          }
                          <span className={passwordValidation.hasUppercase ? 'text-green-600' : 'text-muted-foreground'}>
                            Wielkie litery (A-Z)
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {passwordValidation.hasDigit ? 
                            <Check className="h-4 w-4 text-green-600" /> : 
                            <X className="h-4 w-4 text-destructive" />
                          }
                          <span className={passwordValidation.hasDigit ? 'text-green-600' : 'text-muted-foreground'}>
                            Cyfry (0-9)
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-xs text-muted-foreground mt-2">
                        Hasła niespełniające tych wymagań zostaną odrzucone jako zbyt słabe.
                      </p>
                    </div>
                  )}
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading || !isPasswordValid}
                >
                  {isLoading ? <LoadingSpinner /> : getText('signUp', language)}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          
          <div className="mt-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  {getText('orContinueWith', language)}
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
            >
              {getText('continueWithGoogle', language)}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;