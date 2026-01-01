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
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
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
              }
            } catch (error) {
              // Silent fail - cart loading is not critical
            }
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
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
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: "Błąd logowania",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }

    // Check if email verification is required
    const { data: settings } = await supabase
      .from('site_settings')
      .select('setting_value')
      .eq('setting_key', 'email_verification_required')
      .single();

    const emailVerificationRequired = settings?.setting_value ?? true;

    // If email verification is required and email is not verified
    if (emailVerificationRequired && data.user && !data.user.email_confirmed_at) {
      // Sign out the user
      await supabase.auth.signOut();
      
      toast({
        title: "Wymagana weryfikacja email",
        description: "Musisz potwierdzić swój adres email przed zalogowaniem. Sprawdź swoją skrzynkę pocztową.",
        variant: "destructive",
      });
      
      return { error: new Error('Email not verified') };
    }

    return { error: null };
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
    try {
      // Save cart to database before logout
      if (user) {
        const savedCart = localStorage.getItem('cartItems');
        const cartData = savedCart ? JSON.parse(savedCart) : [];
        
        await supabase
          .from('user_carts')
          .upsert({
            user_id: user.id,
            cart_data: cartData
          }, {
            onConflict: 'user_id'
          });
          
        // Clean up only THIS session, not all user sessions
        const sessionId = sessionStorage.getItem('session_id');
        if (sessionId) {
          await supabase
            .from('active_sessions')
            .delete()
            .eq('user_id', user.id)
            .eq('session_id', sessionId);
        }
        
        // Clear session storage
        sessionStorage.removeItem('session_id');
      }
    } catch (error) {
      console.error('Error saving cart before logout:', error);
    }

    // Sign out only from this specific session/scope
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    
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