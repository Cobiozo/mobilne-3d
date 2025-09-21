import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/contexts/AppContext';
import { getText } from '@/lib/i18n';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Mail, Calendar, MessageSquare, Plus, Edit, Trash2 } from 'lucide-react';

interface Customer {
  id: string;
  email: string;
  created_at: string;
  display_name: string | null;
  bio: string | null;
  role: 'admin' | 'user';
  last_sign_in_at?: string;
  orders_count: number;
  total_spent: number;
}

interface CustomerNote {
  id: string;
  note: string;
  note_type: 'general' | 'support' | 'billing' | 'technical';
  created_at: string;
  created_by: string;
  creator_name: string;
}

export const CustomersManagement = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerNotes, setCustomerNotes] = useState<CustomerNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [newNoteType, setNewNoteType] = useState<'general' | 'support' | 'billing' | 'technical'>('general');
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const { language } = useApp();
  const { user } = useAuth();

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      fetchCustomerNotes(selectedCustomer.id);
    }
  }, [selectedCustomer]);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      // Fetch profiles with user roles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          user_id,
          display_name,
          bio
        `);

      // Fetch user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      // Fetch order statistics
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('user_id, total_price');

      if (profilesError || rolesError) {
        throw new Error('Failed to fetch customer data');
      }

      // Combine data
      const formattedCustomers = profilesData?.map(profile => {
        const userRole = rolesData?.find(role => role.user_id === profile.user_id);
        const userOrders = ordersData?.filter(order => order.user_id === profile.user_id) || [];
        const totalSpent = userOrders.reduce((sum, order) => sum + (parseFloat(order.total_price?.toString() || '0') || 0), 0);

        return {
          id: profile.user_id,
          email: '', // We don't have direct access to auth.users email
          created_at: new Date().toISOString(),
          display_name: profile.display_name,
          bio: profile.bio,
          role: (userRole?.role || 'user') as 'admin' | 'user',
          orders_count: userOrders.length,
          total_spent: totalSpent
        };
      }) || [];

      setCustomers(formattedCustomers);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        title: getText('error', language),
        description: 'Failed to load customers',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCustomerNotes = async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from('customer_notes')
        .select(`
          id,
          note,
          note_type,
          created_at,
          created_by
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedNotes = data?.map(note => ({
        id: note.id,
        note: note.note,
        note_type: note.note_type as 'general' | 'support' | 'billing' | 'technical',
        created_at: note.created_at,
        created_by: note.created_by,
        creator_name: 'Admin'
      })) || [];

      setCustomerNotes(formattedNotes);
    } catch (error) {
      console.error('Error fetching customer notes:', error);
    }
  };

  const addCustomerNote = async () => {
    if (!selectedCustomer || !newNote.trim()) return;

    try {
      const { error } = await supabase
        .from('customer_notes')
        .insert({
          customer_id: selectedCustomer.id,
          note: newNote.trim(),
          note_type: newNoteType,
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;

      setNewNote('');
      setNewNoteType('general');
      fetchCustomerNotes(selectedCustomer.id);
      
      toast({
        title: getText('success', language),
        description: 'Notatka została dodana',
      });
    } catch (error) {
      console.error('Error adding note:', error);
      toast({
        title: getText('error', language),
        description: 'Failed to add note',
        variant: "destructive",
      });
    }
  };

  const toggleUserRole = async (customer: Customer) => {
    // Zabezpieczenie: administrator nie może usunąć sobie uprawnień
    if (user && customer.id === user.id && customer.role === 'admin') {
      toast({
        title: getText('error', language),
        description: getText('cannotSelfDemote', language),
        variant: "destructive",
      });
      return;
    }

    const newRole = customer.role === 'admin' ? 'user' : 'admin';
    
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', customer.id);

      if (error) {
        // Sprawdź czy to błąd zabezpieczenia
        if (error.message.includes('Cannot change admin role')) {
          toast({
            title: getText('error', language),
            description: getText('cannotSelfDemote', language),
            variant: "destructive",
          });
          return;
        }
        throw error;
      }

      setCustomers(customers.map(c => 
        c.id === customer.id ? { ...c, role: newRole } : c
      ));

      if (selectedCustomer?.id === customer.id) {
        setSelectedCustomer({ ...selectedCustomer, role: newRole });
      }

      toast({
        title: getText('success', language),
        description: `${getText('userRoleUpdated', language)} ${newRole}`,
      });
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: getText('error', language),
        description: getText('error', language),
        variant: "destructive",
      });
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{getText('customerManagement', language)}</h2>
          <p className="text-muted-foreground">
            {getText('viewAndManageCustomers', language)}
          </p>
        </div>
        <Badge variant="outline">
          {customers.length} {getText('customers', language)}
        </Badge>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Customers List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>{getText('customersList', language)}</CardTitle>
              <div className="space-y-2">
                <Input
                  placeholder={getText('searchCustomers', language)}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedCustomer?.id === customer.id 
                        ? 'bg-primary/10 border-primary' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedCustomer(customer)}
                  >
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {customer.display_name || 'Użytkownik bez nazwy'}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {customer.email}
                        </p>
                      </div>
                      <Badge variant={customer.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                        {customer.role}
                      </Badge>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <span>{customer.orders_count} zamówień</span>
                      <span>{customer.total_spent.toFixed(2)} zł</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Customer Details */}
        <div className="lg:col-span-2">
          {selectedCustomer ? (
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">Szczegóły</TabsTrigger>
                <TabsTrigger value="notes">Notatki</TabsTrigger>
                <TabsTrigger value="orders">Zamówienia</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Szczegóły klienta
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                      <div>
                        <Label>Nazwa wyświetlana</Label>
                        <p className="mt-1 p-2 bg-muted rounded">
                          {selectedCustomer.display_name || 'Nie podano'}
                        </p>
                      </div>
                      <div>
                        <Label>Email</Label>
                        <p className="mt-1 p-2 bg-muted rounded">
                          {selectedCustomer.email || 'Nie dostępny'}
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <Label>Bio</Label>
                      <p className="mt-1 p-2 bg-muted rounded min-h-16">
                        {selectedCustomer.bio || 'Brak opisu'}
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <Label>Rola</Label>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge variant={selectedCustomer.role === 'admin' ? 'default' : 'secondary'}>
                            {selectedCustomer.role}
                          </Badge>
                          {user && selectedCustomer.id === user.id && selectedCustomer.role === 'admin' ? (
                            <Badge variant="outline" className="text-xs">
                              {getText('cannotSelfDemote', language)}
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleUserRole(selectedCustomer)}
                            >
                              {getText('changeRole', language)}
                            </Button>
                          )}
                        </div>
                      </div>
                      <div>
                        <Label>Liczba zamówień</Label>
                        <p className="mt-1 p-2 bg-muted rounded">
                          {selectedCustomer.orders_count}
                        </p>
                      </div>
                      <div>
                        <Label>Łączne wydatki</Label>
                        <p className="mt-1 p-2 bg-muted rounded">
                          {selectedCustomer.total_spent.toFixed(2)} zł
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notes">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      Notatki klienta
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Add Note */}
                    <div className="space-y-3 p-4 border rounded-lg">
                      <div className="flex gap-2">
                        <Select value={newNoteType} onValueChange={(value: any) => setNewNoteType(value)}>
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">Ogólne</SelectItem>
                            <SelectItem value="support">Wsparcie</SelectItem>
                            <SelectItem value="billing">Płatności</SelectItem>
                            <SelectItem value="technical">Techniczne</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button onClick={addCustomerNote} disabled={!newNote.trim()}>
                          <Plus className="w-4 h-4 mr-2" />
                          Dodaj
                        </Button>
                      </div>
                      <Textarea
                        placeholder="Dodaj nową notatkę..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        rows={3}
                      />
                    </div>

                    {/* Notes List */}
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {customerNotes.map((note) => (
                        <div key={note.id} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline">{note.note_type}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(note.created_at).toLocaleDateString()} - {note.creator_name}
                            </span>
                          </div>
                          <p className="text-sm">{note.note}</p>
                        </div>
                      ))}
                      {customerNotes.length === 0 && (
                        <p className="text-center text-muted-foreground py-4">
                          Brak notatek dla tego klienta
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="orders">
                <Card>
                  <CardHeader>
                    <CardTitle>Historia zamówień</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-center text-muted-foreground py-4">
                      Historia zamówień zostanie wkrótce dodana
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Wybierz klienta</h3>
                  <p className="text-muted-foreground">
                    Wybierz klienta z listy aby zobaczyć szczegóły
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};