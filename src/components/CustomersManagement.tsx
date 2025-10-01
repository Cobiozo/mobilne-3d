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
import { User, Mail, Calendar, MessageSquare, Plus, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';

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
  email_confirmed_at?: string;
  confirmed_at?: string;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_price: number;
  created_at: string;
  material: string | null;
  delivery_method: string | null;
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
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
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
      fetchCustomerOrders(selectedCustomer.id);
    }
  }, [selectedCustomer]);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      // Fetch all users from edge function
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(`https://rzupsyhyoztaekcwmels.supabase.co/functions/v1/list-users`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch users');
      }

      const { users: authUsers } = await response.json();

      // Fetch profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, display_name, bio');

      // Fetch user roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role');

      // Fetch order statistics
      const { data: ordersData } = await supabase
        .from('orders')
        .select('user_id, total_price');

      // Combine data
      const formattedCustomers = authUsers.map(authUser => {
        const profile = profilesData?.find(p => p.user_id === authUser.id);
        const userRole = rolesData?.find(role => role.user_id === authUser.id);
        const userOrders = ordersData?.filter(order => order.user_id === authUser.id) || [];
        const totalSpent = userOrders.reduce((sum, order) => sum + (parseFloat(order.total_price?.toString() || '0') || 0), 0);

        return {
          id: authUser.id,
          email: authUser.email || '',
          created_at: authUser.created_at,
          display_name: profile?.display_name || null,
          bio: profile?.bio || null,
          role: (userRole?.role || 'user') as 'admin' | 'user',
          last_sign_in_at: authUser.last_sign_in_at,
          orders_count: userOrders.length,
          total_spent: totalSpent,
          email_confirmed_at: authUser.email_confirmed_at,
          confirmed_at: authUser.confirmed_at
        };
      });

      setCustomers(formattedCustomers);
    } catch (error: any) {
      console.error('Error fetching customers:', error);
      toast({
        title: getText('error', language),
        description: 'Błąd ładowania klientów: ' + error.message,
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

  const fetchCustomerOrders = async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          total_price,
          created_at,
          material,
          delivery_method
        `)
        .eq('user_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCustomerOrders(data || []);
    } catch (error) {
      console.error('Error fetching customer orders:', error);
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

  const confirmEmail = async (customer: Customer) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(`https://rzupsyhyoztaekcwmels.supabase.co/functions/v1/confirm-user-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: customer.id }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to confirm email');
      }

      // Refresh customers list
      await fetchCustomers();

      toast({
        title: getText('success', language),
        description: 'Email został potwierdzony',
      });
    } catch (error: any) {
      console.error('Error confirming email:', error);
      toast({
        title: getText('error', language),
        description: error.message,
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
    } catch (error: any) {
      console.error('Error updating role:', error);
      
      let errorMessage = getText('error', language);
      
      // Sprawdź czy to błąd związany z zabezpieczeniami ról
      if (error.message && error.message.includes('Cannot change admin role')) {
        if (error.message.includes('self-demotion')) {
          errorMessage = getText('cannotSelfDemote', language);
        } else if (error.message.includes('removing last admin')) {
          errorMessage = getText('lastAdminWarning', language);
        }
      }
      
      toast({
        title: getText('error', language),
        description: errorMessage,
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
                        <div className="mt-1 flex items-center gap-2">
                          <p className="p-2 bg-muted rounded flex-1">
                            {selectedCustomer.email || 'Nie dostępny'}
                          </p>
                          {selectedCustomer.email_confirmed_at || selectedCustomer.confirmed_at ? (
                            <Badge variant="default" className="flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Potwierdzony
                            </Badge>
                          ) : (
                            <>
                              <Badge variant="destructive" className="flex items-center gap-1">
                                <XCircle className="w-3 h-3" />
                                Niepotwierdzony
                              </Badge>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => confirmEmail(selectedCustomer)}
                              >
                                <Mail className="w-4 h-4 mr-2" />
                                Potwierdź email
                              </Button>
                            </>
                          )}
                        </div>
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
                          <SelectContent sideOffset={5}>
                            <SelectItem value="general">{getText('generalNote', language)}</SelectItem>
                            <SelectItem value="support">{getText('supportNote', language)}</SelectItem>
                            <SelectItem value="billing">{getText('billingNote', language)}</SelectItem>
                            <SelectItem value="technical">{getText('technicalNote', language)}</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button onClick={addCustomerNote} disabled={!newNote.trim()}>
                          <Plus className="w-4 h-4 mr-2" />
                          {getText('addNote', language)}
                        </Button>
                      </div>
                      <Textarea
                        placeholder={getText('addNote', language) + '...'}
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
                    <CardDescription>
                      Wszystkie zamówienia klienta
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {customerOrders.length > 0 ? (
                      <div className="space-y-3">
                        {customerOrders.map((order) => (
                          <div key={order.id} className="p-4 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <p className="font-medium">{order.order_number}</p>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(order.created_at).toLocaleDateString('pl-PL', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                              <Badge variant={
                                order.status === 'completed' ? 'default' :
                                order.status === 'pending' ? 'secondary' :
                                order.status === 'cancelled' ? 'destructive' : 'outline'
                              }>
                                {order.status === 'pending' ? 'Oczekujące' :
                                 order.status === 'processing' ? 'W realizacji' :
                                 order.status === 'shipped' ? 'Wysłane' :
                                 order.status === 'completed' ? 'Zrealizowane' :
                                 order.status === 'cancelled' ? 'Anulowane' : order.status}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-3">
                              <div>
                                <p className="text-sm text-muted-foreground">Kwota</p>
                                <p className="font-medium">{parseFloat(order.total_price.toString()).toFixed(2)} zł</p>
                              </div>
                              {order.material && (
                                <div>
                                  <p className="text-sm text-muted-foreground">Materiał</p>
                                  <p className="font-medium">{order.material}</p>
                                </div>
                              )}
                              {order.delivery_method && (
                                <div>
                                  <p className="text-sm text-muted-foreground">Dostawa</p>
                                  <p className="font-medium">{order.delivery_method}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">
                          Brak zamówień dla tego klienta
                        </p>
                      </div>
                    )}
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