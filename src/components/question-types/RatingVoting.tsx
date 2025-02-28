'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { useFingerprint } from '@/lib/fingerprint';
import { Star } from 'lucide-react';

interface RatingVotingProps {
  pollId: string;
  maxRating: number;
  userId?: string;
  onVoteSubmitted?: () => void;
}

export function RatingVoting({ pollId, maxRating, userId, onVoteSubmitted }: RatingVotingProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { deviceId } = useFingerprint();

  const handleSubmit = async () => {
    if (rating === null) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('rating_answers')
        .insert({
          poll_id: pollId,
          rating,
          created_by: userId,
          device_id: deviceId
        });

      if (error) throw error;

      toast({
        title: 'Success!',
        description: 'Your rating has been submitted.',
      });

      onVoteSubmitted?.();
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit rating. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-center gap-2">
        {Array.from({ length: maxRating }).map((_, i) => {
          const starValue = i + 1;
          const isFilled = (hoveredRating || rating || 0) >= starValue;

          return (
            <button
              key={i}
              type="button"
              className={`p-1 transition-colors ${isFilled ? 'text-yellow-400' : 'text-gray-300'} hover:scale-110`}
              onMouseEnter={() => setHoveredRating(starValue)}
              onMouseLeave={() => setHoveredRating(null)}
              onClick={() => setRating(starValue)}
            >
              <Star className="h-8 w-8 fill-current" />
            </button>
          );
        })}
      </div>

      {rating && (
        <div className="text-center text-muted-foreground">
          You selected: {rating} star{rating !== 1 ? 's' : ''}
        </div>
      )}

      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || rating === null}
        className="w-full"
      >
        Submit Rating
      </Button>
    </div>
  );
}
