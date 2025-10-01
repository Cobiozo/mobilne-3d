import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Users, Shield, Mail, CheckCircle } from 'lucide-react';

interface User {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  created_at: string;
  display_name: string | null;
  role: 'admin' | 'user';
}

export const UsersManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    
    try {
      // Fetch all users from auth.users using admin API
      const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();

      if (authError) throw authError;

      // Fetch profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, display_name');

      // Fetch roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role');

      const formattedUsers = authUsers.map(user => {
        const profile = profilesData?.find(p => p.user_id === user.id);
        const userRole = rolesData?.find(r => r.user_id === user.id);
        
        return {
          id: user.id,
          email: user.email || '',
          email_confirmed_at: user.email_confirmed_at,
          created_at: user.created_at,
          display_name: profile?.display_name || null,
          role: (userRole?.role || 'user') as 'admin' | 'user'
        };
      });

      setUsers(formattedUsers);
    } catch (error: any) {
      toast.error('Błąd ładowania użytkowników: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const confirmEmail = async (userId: string) => {
    try {
      const { error } = await supabase.auth.admin.updateUserById(
        userId,
        { 
          email_confirm: true 
        }
      );

      if (error) throw error;

      toast.success('Email został potwierdzony');
      fetchUsers(); // Refresh the list
    } catch (error: any) {
      toast.error('Błąd potwierdzania emaila: ' + error.message);
    }
  };

  const toggleUserRole = async (userId: string, currentRole: 'admin' | 'user') => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;

      setUsers(users.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ));
      toast.success('Rola użytkownika została zaktualizowana');
    } catch (error: any) {
      toast.error('Błąd zmiany roli: ' + error.message);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Zarządzanie użytkownikami
        </CardTitle>
        <CardDescription>
          Zarządzaj użytkownikami, potwierdź emaile i przydzielaj role
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium">
                    {user.display_name || 'Użytkownik bez nazwy'}
                  </p>
                  {user.email_confirmed_at ? (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Potwierdzony
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <Mail className="w-3 h-3 mr-1" />
                      Niepotwierdzony
                    </Badge>
                  )}
                  <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                    {user.role}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <p className="text-xs text-muted-foreground">
                  Zarejestrowany: {new Date(user.created_at).toLocaleDateString('pl-PL')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!user.email_confirmed_at && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => confirmEmail(user.id)}
                  >
                    <Mail className="w-4 h-4 mr-1" />
                    Potwierdź email
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleUserRole(user.id, user.role)}
                >
                  <Shield className="w-4 h-4 mr-1" />
                  {user.role === 'admin' ? 'Usuń admina' : 'Nadaj admina'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
