import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { getText } from '@/lib/i18n';

interface UserProfileProps {
  user: User;
}

interface Profile {
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
}

export const UserProfile = ({ user }: UserProfileProps) => {
  const [profile, setProfile] = useState<Profile>({
    display_name: '',
    bio: '',
    avatar_url: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'Polska'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { language } = useApp();

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, bio, avatar_url, phone, address, city, postal_code, country')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setProfile(data);
      } else if (error) {
        console.error('Error fetching profile:', error);
      }
      setIsLoading(false);
    };

    fetchProfile();
  }, [user.id]);

  const updateProfile = async () => {
    setIsSaving(true);
    
    const { error } = await supabase
      .from('profiles')
      .upsert({
        user_id: user.id,
        display_name: profile.display_name,
        bio: profile.bio,
        avatar_url: profile.avatar_url,
        phone: profile.phone,
        address: profile.address,
        city: profile.city,
        postal_code: profile.postal_code,
        country: profile.country
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      toast({
        title: getText('error', language),
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: getText('success', language),
        description: getText('profileUpdated', language),
      });
    }
    
    setIsSaving(false);
  };

  const handleInputChange = (field: keyof Profile, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{getText('userProfile', language)}</CardTitle>
        <CardDescription>
          {getText('manageProfileInfo', language)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <Avatar className="w-20 h-20">
            <AvatarImage src={profile.avatar_url || ''} />
            <AvatarFallback>
              {profile.display_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-lg font-semibold">
              {profile.display_name || user.email}
            </h3>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="display-name">
              {getText('displayName', language)}
            </Label>
            <Input
              id="display-name"
              value={profile.display_name || ''}
              onChange={(e) => handleInputChange('display_name', e.target.value)}
              placeholder={getText('enterDisplayName', language)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">{getText('bio', language)}</Label>
            <Textarea
              id="bio"
              value={profile.bio || ''}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              placeholder={getText('tellAboutYourself', language)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="avatar-url">
              {getText('avatarUrl', language)}
            </Label>
            <Input
              id="avatar-url"
              type="url"
              value={profile.avatar_url || ''}
              onChange={(e) => handleInputChange('avatar_url', e.target.value)}
              placeholder="https://example.com/avatar.jpg"
            />
          </div>

          <div className="pt-4 border-t">
            <h3 className="text-lg font-semibold mb-4">Dane do wysyłki</h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={profile.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="123 456 789"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Adres</Label>
                <Input
                  id="address"
                  value={profile.address || ''}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="ul. Przykładowa 123"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="postal-code">Kod pocztowy</Label>
                  <Input
                    id="postal-code"
                    value={profile.postal_code || ''}
                    onChange={(e) => handleInputChange('postal_code', e.target.value)}
                    placeholder="00-000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Miasto</Label>
                  <Input
                    id="city"
                    value={profile.city || ''}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="Warszawa"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Kraj</Label>
                <Input
                  id="country"
                  value={profile.country || 'Polska'}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  placeholder="Polska"
                />
              </div>
            </div>
          </div>

          <Button 
            onClick={updateProfile}
            disabled={isSaving}
            className="w-full"
          >
            {isSaving ? getText('saving', language) : getText('saveChanges', language)}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};