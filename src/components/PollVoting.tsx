'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ShareDialog } from '@/components/ui/share-dialog';
import { Lock, Timer, Share2, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import Confetti from 'react-confetti';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';


import type { Poll, Option } from '@/types/database.types';

interface PollVotingProps {
  poll: Poll | null;
  pollId: string;
  options: Option[];
  votes: Record<string, number>;
  totalVotes: number;
  hasVoted: boolean;
  selectedOption: string | null;
  isAdmin: boolean;
  submitVote: (optionId: string) => Promise<void>;
}

export function PollVoting({ 
  poll,
  pollId,
  options,
  votes,
  totalVotes,
  hasVoted,
  selectedOption,
  isAdmin,
  submitVote
}: PollVotingProps) {
  const [showQR, setShowQR] = useState(false);
  const [showConfetti] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  if (!poll) {
    console.log('No poll data');
    return <LoadingSpinner />;
  }

  if (!options || options.length === 0) {
    console.log('No options available');
    return (
      <Card className="w-full max-w-lg mx-auto shadow-lg overflow-hidden relative">
        <CardHeader>
          <CardTitle>{poll.title}</CardTitle>
          <CardDescription>No options available for this poll</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  console.log('PollVoting props:', {
    poll,
    pollId,
    options,
    votes,
    totalVotes,
    hasVoted,
    selectedOption,
    isAdmin
  });

  const shouldShowResults = () => {
    if (!poll) return false;
    return isAdmin || hasVoted;
  };

  const isPollEnded = () => {
    if (!poll?.end_date) return false;
    return new Date(poll.end_date) < new Date();
  };

  return (
    <>
      {showConfetti && <Confetti recycle={false} numberOfPieces={200} />}
      <Card className="w-full max-w-lg mx-auto shadow-lg overflow-hidden relative">

        <CardHeader className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                {poll.title}
                {poll.require_auth && <Lock className="h-4 w-4 text-muted-foreground" />}
                {poll.end_date && <Timer className="h-4 w-4 text-muted-foreground" />}
              </CardTitle>
              <CardDescription>{poll.description || "Cast your vote and see real-time results"}</CardDescription>
              {poll.end_date && (
                <p className="text-sm text-muted-foreground mt-1">
                  Ends {format(new Date(poll.end_date), 'PPp')}
                </p>
              )}
            </div>
            <div className="flex gap-2 self-start sm:self-auto">

              <Button
                variant="outline"
                size="icon"
                className="shrink-0 hover:bg-blue-600/10 w-8 h-8"
                onClick={() => setShowQR(!showQR)}
              >
                <QrCode className="h-4 w-4" />
              </Button>
              <ShareDialog url={typeof window !== 'undefined' ? window.location.href : ''}>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0 hover:bg-blue-600/10 w-8 h-8"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </ShareDialog>
            </div>
          </div>
          {showQR && (
            <div className="flex justify-center p-4 bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
              <QRCodeSVG
                value={typeof window !== 'undefined' ? window.location.href : ''}
                size={200}
                includeMargin
              />
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-6 pb-6 sm:pb-0">
          {poll.require_auth && !isAuthenticated ? (
            <div className="text-center py-8 space-y-4">
              <div className="flex flex-col items-center gap-2">
                <Lock className="h-12 w-12 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Authentication Required</h3>
                <p className="text-muted-foreground max-w-sm">
                  This poll requires you to sign in before voting.
                </p>
              </div>
              <Button 
                onClick={() => router.push('/login')} 
                className="mt-4"
                size="lg"
              >
                Sign In to Vote
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
            {options.map((option) => {
              const voteCount = votes[option.id] || 0;
              const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
              const isDisabled = hasVoted || isPollEnded();

              return (
                <div key={option.id} className="space-y-3">
                  <Button
                    onClick={() => !isDisabled && setSelectedChoice(option.id)}
                    disabled={isDisabled}
                    variant={selectedChoice === option.id || selectedOption === option.id ? "secondary" : "outline"}
                    className={`w-full justify-between h-auto py-3 px-4 text-left break-words ${isDisabled ? 'opacity-80' : 'hover:bg-blue-600/10'}`}
                  >
                    <span className="font-normal break-words flex-1 mr-2">{option.text}</span>
                    {shouldShowResults() && (
                      <span className="font-medium text-muted-foreground whitespace-nowrap text-sm">{voteCount} votes</span>
                    )}
                  </Button>
                  {shouldShowResults() && (
                    <div className="space-y-1">
                      <Progress value={percentage} className="h-2" />
                      <div className="text-sm text-muted-foreground">
                        {percentage.toFixed(1)}%
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          )}
          
          {!hasVoted && !isPollEnded() && (
            <div className="sticky bottom-0 left-0 right-0 p-4 bg-background border-t mt-6 -mx-6 -mb-6 sm:bg-transparent sm:border-0 sm:p-0 sm:m-0 sm:static">
              <Button
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (selectedChoice) {
                    setIsSubmitting(true);
                    try {
                      await submitVote(selectedChoice);
                      setSelectedChoice(null);
                    } catch (error) {
                      console.error('Error submitting vote:', error);
                    } finally {
                      setIsSubmitting(false);
                    }
                  }
                }}
                disabled={!selectedChoice || isSubmitting || hasVoted || isPollEnded()}
                className="w-full sm:w-auto shadow-sm active:scale-95 transition-transform"
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner className="mr-2 h-4 w-4 animate-spin" showText={false} />
                    Submitting...
                  </>
                ) : (
                  'Submit Vote'
                )}
              </Button>
            </div>
          )}

          {shouldShowResults() && (
            <div className="text-center text-sm text-muted-foreground pt-4 border-t border-border">
              Total votes: {totalVotes}
              {isPollEnded() && (
                <p className="mt-1 text-destructive">This poll has ended</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
