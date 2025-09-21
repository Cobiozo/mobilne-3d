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
}

export const UserProfile = ({ user }: UserProfileProps) => {
  const [profile, setProfile] = useState<Profile>({
    display_name: '',
    bio: '',
    avatar_url: ''
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
        .select('display_name, bio, avatar_url')
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
        avatar_url: profile.avatar_url
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