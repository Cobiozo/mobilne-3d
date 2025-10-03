import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    console.log('[useAuth] Setting up auth state listener');
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[useAuth] Auth state changed:', event, 'User:', session?.user?.email || 'null');
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Load cart from database when user signs in
        if (event === 'SIGNED_IN' && session?.user) {
          setTimeout(async () => {
            try {
              const { data } = await supabase
                .from('user_carts')
                .select('cart_data')
                .eq('user_id', session.user.id)
                .single();

              if (data?.cart_data) {
                localStorage.setItem('cartItems', JSON.stringify(data.cart_data));
                window.dispatchEvent(new CustomEvent('cartUpdated', { 
                  detail: { cartItems: data.cart_data } 
                }));
                console.log('[useAuth] Loaded cart from database:', data.cart_data);
              }
            } catch (error) {
              console.error('[useAuth] Error loading cart:', error);
            }
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[useAuth] Initial session check:', session?.user?.email || 'null');
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      console.log('[useAuth] Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, displayName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          display_name: displayName
        }
      }
    });

    if (error) {
      toast({
        title: "Błąd rejestracji",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sprawdź email",
        description: "Wysłaliśmy link aktywacyjny na Twój email",
      });
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: "Błąd logowania",
        description: error.message,
        variant: "destructive",
      });
    }

    return { error };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`
      }
    });

    if (error) {
      toast({
        title: "Błąd logowania",
        description: error.message,
        variant: "destructive",
      });
    }

    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      toast({
        title: "Błąd wylogowania",
        description: error.message,
        variant: "destructive",
      });
    } else {
      // Clear cart from localStorage on logout
      localStorage.removeItem('cartItems');
      window.dispatchEvent(new CustomEvent('cartUpdated', { 
        detail: { cartItems: [] } 
      }));
    }

    return { error };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });

    if (error) {
      toast({
        title: "Błąd resetowania hasła",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sprawdź email",
        description: "Wysłaliśmy link do resetowania hasła na Twój email",
      });
    }

    return { error };
  };

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
  };
};