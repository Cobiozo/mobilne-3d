import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { useApp } from '@/contexts/AppContext';
import { getText } from '@/lib/i18n';

interface ModelRatingProps {
  modelId: string;
  modelOwnerId: string;
  currentUserId?: string;
  compact?: boolean;
}

interface Rating {
  rating: number;
  comment?: string;
  user_id: string;
}

export const ModelRating = ({ modelId, modelOwnerId, currentUserId, compact = false }: ModelRatingProps) => {
  const { language } = useApp();
  const [averageRating, setAverageRating] = useState<number>(0);
  const [totalRatings, setTotalRatings] = useState<number>(0);
  const [userRating, setUserRating] = useState<number>(0);
  const [userComment, setUserComment] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [hoveredStar, setHoveredStar] = useState<number>(0);
  const { toast } = useToast();

  // Check if current user is the owner
  const isOwner = currentUserId === modelOwnerId;

  useEffect(() => {
    fetchRatings();
  }, [modelId]);

  const fetchRatings = async () => {
    // Fetch all ratings for the model
    const { data: ratings, error } = await supabase
      .from('model_ratings')
      .select('rating, comment, user_id')
      .eq('model_id', modelId);

    if (error) {
      console.error('Error fetching ratings:', error);
      return;
    }

    if (ratings && ratings.length > 0) {
      const avg = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
      setAverageRating(avg);
      setTotalRatings(ratings.length);

      // Find user's rating if exists
      const userRate = ratings.find((r: Rating) => r.user_id === currentUserId);
      if (userRate) {
        setUserRating(userRate.rating);
        setUserComment(userRate.comment || '');
      }
    } else {
      setAverageRating(0);
      setTotalRatings(0);
    }
  };

  const handleRatingSubmit = async () => {
    if (!currentUserId) {
      toast({
        title: 'Błąd',
        description: 'Musisz być zalogowany aby ocenić model',
        variant: 'destructive',
      });
      return;
    }

    if (isOwner) {
      toast({
        title: 'Błąd',
        description: 'Nie możesz ocenić własnego modelu',
        variant: 'destructive',
      });
      return;
    }

    if (userRating === 0) {
      toast({
        title: 'Błąd',
        description: 'Wybierz ocenę od 1 do 5 gwiazdek',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await supabase
      .from('model_ratings')
      .upsert({
        model_id: modelId,
        user_id: currentUserId,
        rating: userRating,
        comment: userComment || null,
      });

    if (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się zapisać oceny',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Sukces',
      description: 'Ocena została zapisana',
    });

    setIsDialogOpen(false);
    fetchRatings();
  };

  const renderStars = (rating: number, interactive: boolean = false) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-5 h-5 ${
              interactive ? 'cursor-pointer' : ''
            } ${
              star <= (interactive && hoveredStar > 0 ? hoveredStar : rating)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
            onClick={() => interactive && setUserRating(star)}
            onMouseEnter={() => interactive && setHoveredStar(star)}
            onMouseLeave={() => interactive && setHoveredStar(0)}
          />
        ))}
      </div>
    );
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          {renderStars(averageRating)}
          <span className="text-muted-foreground">
            {averageRating > 0 ? averageRating.toFixed(1) : 'Brak ocen'} 
            {totalRatings > 0 && ` (${totalRatings})`}
          </span>
        </div>
        
        {currentUserId && !isOwner && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                <Star className="w-3 h-3 mr-1" />
                {userRating > 0 ? getText('editRating', language) : getText('rate', language)}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{getText('rateThisModel', language)}</DialogTitle>
                <DialogDescription>
                  {getText('yourRatingHelps', language)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{getText('yourRating', language)}</label>
                  {renderStars(userRating, true)}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Komentarz (opcjonalnie)
                  </label>
                  <Textarea
                    value={userComment}
                    onChange={(e) => setUserComment(e.target.value)}
                    placeholder={getText('writeWhatYouThink', language)}
                    rows={4}
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    {getText('cancel', language)}
                  </Button>
                  <Button onClick={handleRatingSubmit}>{getText('saveRating', language)}</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        {renderStars(averageRating)}
        <span className="text-sm text-muted-foreground">
          {averageRating > 0 ? (
            <>
              {averageRating.toFixed(1)} / 5 ({totalRatings}{' '}
              {totalRatings === 1 ? 'ocena' : 'ocen'})
            </>
          ) : (
            getText('noRatings', language)
          )}
        </span>
      </div>

      {currentUserId && !isOwner && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              {userRating > 0 ? getText('editYourRating', language) : getText('rateModel', language)}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
                <DialogTitle>{getText('rateThisModel', language)}</DialogTitle>
                <DialogDescription>
                  {getText('yourRatingHelps', language)}
                </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{getText('yourRating', language)}</label>
                {renderStars(userRating, true)}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Komentarz (opcjonalnie)
                </label>
                <Textarea
                  value={userComment}
                  onChange={(e) => setUserComment(e.target.value)}
                  placeholder={getText('writeWhatYouThink', language)}
                  rows={4}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {getText('cancel', language)}
                </Button>
                <Button onClick={handleRatingSubmit}>{getText('saveRating', language)}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};