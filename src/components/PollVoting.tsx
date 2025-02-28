'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ShareDialog } from '@/components/ui/share-dialog';
import { Lock, Timer, Share2, QrCode, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import Confetti from 'react-confetti';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { PollCharts } from '@/components/ui/poll-charts';
import { ShortAnswerVoting } from '@/components/question-types/ShortAnswerVoting';
import { RankingVoting } from '@/components/question-types/RankingVoting';
import { RatingVoting } from '@/components/question-types/RatingVoting';


import type { Poll, Option, PollMetrics } from '@/types/database.types';

interface PollVotingProps {
  poll: Poll | null;
  pollId: string;
  options: Option[];
  votes: Record<string, number>;
  totalVotes: number;
  hasVoted: boolean;
  selectedOption: string | null;
  isAdmin: boolean;
  metrics?: PollMetrics;
  submitVote: (optionId: string) => Promise<void>;
  userId?: string;
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
  submitVote,
  userId
}: PollVotingProps) {
  const [showQR, setShowQR] = useState(false);
  const [showConfetti] = useState(false);
  const [selectedChoices, setSelectedChoices] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleVoteClick = async (optionId: string) => {
    try {
      await submitVote(optionId);
      router.refresh();
    } catch (error) {
      console.error('Error submitting vote:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit vote. Please try again.',
        variant: 'destructive'
      });
    }
  };

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
    return isAdmin || hasVoted || poll.show_results;
  };

  const isPollEnded = () => {
    if (!poll?.end_date) return false;
    return new Date(poll.end_date) < new Date();
  };

  const handleExport = async () => {
    try {
      const response = await fetch(`/api/polls/${pollId}/export`);
      if (!response.ok) throw new Error('Failed to export results');

      // Create a blob from the CSV data
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      // Create a temporary link and click it to download
      const a = document.createElement('a');
      a.href = url;
      a.download = `poll-${pollId}-results.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting results:', error);
      toast({
        title: 'Error',
        description: 'Failed to export results. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const renderVotingComponent = () => {
    if (!poll) return null;

    switch (poll.question_type) {
      case 'short_answer':
        return (
          <ShortAnswerVoting
            pollId={pollId}
            userId={userId || undefined}
            onVoteSubmitted={() => router.refresh()}
          />
        );

      case 'ranking':
        return (
          <RankingVoting
            pollId={pollId}
            options={options}
            userId={userId}
            onVoteSubmitted={() => router.refresh()}
          />
        );

      case 'rating':
        return (
          <RatingVoting
            pollId={pollId}
            maxRating={poll.rating_scale_max || 5}
            userId={userId}
            onVoteSubmitted={() => router.refresh()}
          />
        );

      case 'true_false':
      case 'multiple_choice':
      default:
        return (
          <div className="space-y-4">
            {options.map((option) => {
              const voteCount = votes[option.id] || 0;
              const votePercentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
              const isSelected = poll.allow_multiple_choices 
                ? selectedChoices.has(option.id)
                : selectedOption === option.id;

              return (
                <div key={option.id} className="space-y-2">
                  <Button
                    variant={isSelected ? "default" : "outline"}
                    className="w-full justify-start h-auto py-4 px-4"
                    onClick={() => {
                      if (poll.allow_multiple_choices) {
                        const newChoices = new Set(selectedChoices);
                        if (newChoices.has(option.id)) {
                          newChoices.delete(option.id);
                        } else if (newChoices.size < poll.max_choices) {
                          newChoices.add(option.id);
                        }
                        setSelectedChoices(newChoices);
                      } else {
                        submitVote(option.id);
                      }
                    }}
                    disabled={hasVoted || isPollEnded()}
                  >
                    <div className="flex flex-col items-start gap-2 w-full">
                      <div className="flex items-center gap-2 w-full">
                        <span>{option.text}</span>
                      </div>
                      {option.image_url && (
                        <img
                          src={option.image_url}
                          alt={option.text}
                          className="w-full h-40 object-cover rounded-md"
                        />
                      )}
                    </div>
                  </Button>

                  {shouldShowResults() && (
                    <div className="space-y-1">
                      <Progress value={votePercentage} />
                      <div className="text-sm text-muted-foreground">
                        {voteCount} vote{voteCount !== 1 ? 's' : ''} ({votePercentage.toFixed(1)}%)
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {poll.allow_multiple_choices && selectedChoices.size > 0 && (
              <Button
                className="w-full"
                onClick={async () => {
                  setIsSubmitting(true);
                  try {
                    const choicesArray = Array.from(selectedChoices);
                    for (const optionId of choicesArray) {
                      await submitVote(optionId);
                    }
                    setSelectedChoices(new Set());
                  } catch (error) {
                    console.error('Error submitting votes:', error);
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                disabled={isSubmitting}
              >
                Submit Votes ({selectedChoices.size}/{poll.max_choices})
              </Button>
            )}
          </div>
        );
    }
  };

  return (
    <>
      {showConfetti && <Confetti recycle={false} numberOfPieces={200} />}
      <Card className="w-full max-w-lg mx-auto shadow-lg overflow-hidden relative">
        <CardHeader className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  {poll.title}
                  {poll.require_auth && <Lock className="h-4 w-4 text-muted-foreground" />}
                  {poll.end_date && <Timer className="h-4 w-4 text-muted-foreground" />}
                </CardTitle>
                <CardDescription>{poll.description || "Cast your vote and see real-time results"}</CardDescription>
              </div>
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export Results
                </Button>
              )}
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
                onClick={() => router.push(`/login?returnTo=${encodeURIComponent(window.location.href)}`)} 
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
              const isSelected = selectedChoices.has(option.id) || selectedOption === option.id;

              return (
                <div key={option.id} className="space-y-3">
                  <Button
                    onClick={() => !isDisabled && handleVoteClick(option.id)}
                    disabled={isDisabled}
                    variant={isSelected ? "secondary" : "outline"}
                    className={`w-full justify-between h-auto py-3 px-4 text-left break-words ${isDisabled ? 'opacity-80' : 'hover:bg-blue-600/10'}`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {option.image_url && (
                        <img 
                          src={option.image_url} 
                          alt={option.text}
                          className="w-12 h-12 object-cover rounded"
                        />
                      )}
                      <span className="font-normal break-words flex-1">{option.text}</span>
                    </div>
                    {shouldShowResults() && (
                      <span className="font-medium text-muted-foreground whitespace-nowrap text-sm ml-2">{voteCount} votes</span>
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
              {poll.allow_multiple_choices ? (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-muted-foreground">
                    Select up to {poll.max_choices} options
                  </p>
                  <Button
                    onClick={async () => {
                      if (selectedChoices.size === 0) return;
                      setIsSubmitting(true);
                      try {
                        // Submit each selected choice
                        const choicesArray = Array.from(selectedChoices);
                        for (const optionId of choicesArray) {
                          await submitVote(optionId);
                        }
                        setSelectedChoices(new Set());
                      } catch (error) {
                        console.error('Error submitting votes:', error);
                        toast({
                          title: "Error",
                          description: "Failed to submit votes. Please try again.",
                          variant: "destructive"
                        });
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                    disabled={selectedChoices.size === 0 || isSubmitting || hasVoted || isPollEnded()}
                    className="w-full sm:w-auto shadow-sm active:scale-95 transition-transform"
                  >
                    {isSubmitting ? (
                      <>
                        <LoadingSpinner className="mr-2 h-4 w-4 animate-spin" showText={false} />
                        Submitting...
                      </>
                    ) : (
                      `Submit Votes (${selectedChoices.size}/${poll.max_choices})`
                    )}
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={async () => {
                    const selectedChoice = Array.from(selectedChoices)[0];
                    if (!selectedChoice) return;
                    setIsSubmitting(true);
                    try {
                      await submitVote(selectedChoice);
                      setSelectedChoices(new Set());
                    } catch (error) {
                      console.error('Error submitting vote:', error);
                      toast({
                        title: "Error",
                        description: "Failed to submit vote. Please try again.",
                        variant: "destructive"
                      });
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  disabled={selectedChoices.size === 0 || isSubmitting || hasVoted || isPollEnded()}
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
              )}
            </div>
          )}

          {shouldShowResults() && (
            <div className="space-y-6 pt-4 border-t border-border">
              <div className="text-center text-sm text-muted-foreground">
                Total votes: {totalVotes}
                {isPollEnded() && (
                  <p className="mt-1 text-destructive">This poll has ended</p>
                )}
              </div>
              <PollCharts 
                options={options}
                votes={votes}
                totalVotes={totalVotes}
                metrics={poll.metrics}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
