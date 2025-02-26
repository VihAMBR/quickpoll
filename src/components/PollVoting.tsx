'use client';

import { useState } from 'react';
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
  submitVote: (optionId: string) => void;
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
  const { toast } = useToast();

  if (!poll) {
    console.log('No poll data');
    return <LoadingSpinner />;
  }

  if (!options || options.length === 0) {
    console.log('No options available');
    return (
      <Card className="max-w-lg mx-auto">
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
      <Card className="max-w-lg mx-auto">

        <CardHeader className="space-y-4">
          <div className="flex justify-between items-start">
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
            <div className="flex gap-2">

              <Button
                variant="outline"
                size="icon"
                className="shrink-0 hover:bg-muted"
                onClick={() => setShowQR(!showQR)}
              >
                <QrCode className="h-4 w-4" />
              </Button>
              <ShareDialog url={typeof window !== 'undefined' ? window.location.href : ''}>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0 hover:bg-muted"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </ShareDialog>
            </div>
          </div>
          {showQR && (
            <div className="flex justify-center p-4 bg-white rounded-lg">
              <QRCodeSVG
                value={typeof window !== 'undefined' ? window.location.href : ''}
                size={200}
                includeMargin
              />
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {options.map((option) => {
              const voteCount = votes[option.id] || 0;
              const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
              const isDisabled = hasVoted || isPollEnded();

              return (
                <div key={option.id} className="space-y-3">
                  <Button
                    onClick={() => !isDisabled && submitVote(option.id)}
                    disabled={isDisabled}
                    variant={selectedOption === option.id ? "secondary" : "outline"}
                    className={`w-full justify-between h-auto py-3 px-4 ${isDisabled ? 'opacity-80' : 'hover:bg-muted'}`}
                  >
                    <span className="font-normal">{option.text}</span>
                    {shouldShowResults() && (
                      <span className="font-medium ml-2 text-muted-foreground">{voteCount} votes</span>
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
