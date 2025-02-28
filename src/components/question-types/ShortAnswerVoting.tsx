'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { useFingerprint } from '@/lib/fingerprint';

interface ShortAnswerVotingProps {
  pollId: string;
  userId?: string;
  onVoteSubmitted?: () => void;
}

export function ShortAnswerVoting({ pollId, userId, onVoteSubmitted }: ShortAnswerVotingProps) {
  const [answer, setAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { deviceId } = useFingerprint();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('text_answers')
        .insert({
          poll_id: pollId,
          answer: answer.trim(),
          created_by: userId,
          device_id: deviceId
        });

      if (error) throw error;

      toast({
        title: 'Success!',
        description: 'Your answer has been submitted.',
      });

      setAnswer('');
      onVoteSubmitted?.();
    } catch (error) {
      console.error('Error submitting answer:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit answer. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Type your answer here..."
        required
        className="min-h-[100px]"
      />
      <Button
        type="submit"
        disabled={isSubmitting || !answer.trim()}
        className="w-full"
      >
        Submit Answer
      </Button>
    </form>
  );
}
