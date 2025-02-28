'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ShareDialog } from '@/components/ui/share-dialog';
import { Lock, Timer, Share2, QrCode, Download, Check, Copy } from 'lucide-react';
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
import { Input } from '@/components/ui/input';

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
  const [copied, setCopied] = useState(false);
  const [localVotes, setLocalVotes] = useState(votes);
  const [localTotalVotes, setLocalTotalVotes] = useState(totalVotes);
  const { toast } = useToast();
  const router = useRouter();

  // Update local state when props change
  useEffect(() => {
    console.log("PollVoting received new props:", { votes, totalVotes });
    setLocalVotes(votes);
    setLocalTotalVotes(totalVotes);
  }, [votes, totalVotes]);

  // Get the shortened URL for sharing
  const getShareableUrl = () => {
    if (typeof window === 'undefined') return '';
    // Use just the origin and path, no query parameters
    const url = new URL(window.location.href);
    return `${url.origin}/poll/${pollId}`;
  };

  const copyToClipboard = async () => {
    const url = getShareableUrl();
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast({ title: "Link copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

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
              const voteCount = localVotes[option.id] || 0;
              const votePercentage = localTotalVotes > 0 ? (voteCount / localTotalVotes) * 100 : 0;
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

  // Render the appropriate component based on user role
  if (isAdmin) {
    // Admin View - Desktop Optimized
    return (
      <>
        {showConfetti && <Confetti recycle={false} numberOfPieces={200} />}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 w-full max-w-screen-2xl mx-auto">
          {/* Poll Information and Voting Panel */}
          <div className="lg:col-span-3">
            <Card className="shadow-lg overflow-hidden h-full">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-2xl">
                      {poll.title}
                      {poll.require_auth && <Lock className="h-4 w-4 text-muted-foreground" />}
                    </CardTitle>
                    <CardDescription className="text-base">{poll.description || "Cast your vote and see real-time results"}</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export Results
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6 pb-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Voting options with real-time results always visible */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-lg">Results</h3>
                    {options.map((option) => {
                      const voteCount = localVotes[option.id] || 0;
                      const percentage = localTotalVotes > 0 ? (voteCount / localTotalVotes) * 100 : 0;
                      const isSelected = selectedOption === option.id;

                      return (
                        <div key={option.id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{option.text}</span>
                            <span className="text-sm text-muted-foreground">{voteCount} votes</span>
                          </div>
                          <Progress value={percentage} className="h-3" />
                          <div className="text-sm text-muted-foreground">
                            {percentage.toFixed(1)}%
                          </div>
                        </div>
                      );
                    })}
                    
                    <div className="pt-4">
                      <div className="text-base font-medium mb-2">Total Votes: {localTotalVotes}</div>
                    </div>
                  </div>

                  {/* Charts Section */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-lg">Visualization</h3>
                    <PollCharts 
                      options={options}
                      votes={localVotes}
                      totalVotes={localTotalVotes}
                      metrics={poll.metrics}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Sharing and QR Panel */}
          <div>
            <Card className="shadow-lg h-full">
              <CardHeader>
                <CardTitle className="text-lg">Share Poll</CardTitle>
                <CardDescription>
                  Share this poll with your audience
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* QR code - always visible for admin */}
                <div className="flex justify-center bg-white dark:bg-gray-800 rounded-lg p-6">
                  <QRCodeSVG
                    value={getShareableUrl()}
                    size={200}
                    includeMargin
                  />
                </div>
                
                {/* Shareable link */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Shareable Link</label>
                  <div className="flex">
                    <Input
                      value={getShareableUrl()}
                      readOnly
                      className="rounded-r-none"
                    />
                    <Button 
                      className="rounded-l-none"
                      onClick={copyToClipboard}
                      variant={copied ? "default" : "secondary"}
                    >
                      {copied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                {/* Poll Stats */}
                <div className="space-y-2 pt-4 border-t">
                  <h3 className="font-medium">Poll Information</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Created:</div>
                    <div>{new Date(poll.created_at).toLocaleDateString()}</div>
                    
                    <div>Results Visible:</div>
                    <div>{poll.show_results ? 'Yes' : 'No'}</div>
                    
                    <div>Authentication:</div>
                    <div>{poll.require_auth ? 'Required' : 'Not Required'}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }
  
  // Standard voter view - Mobile optimized
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
              <ShareDialog url={getShareableUrl()}>
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
                value={getShareableUrl()}
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
            renderVotingComponent()
          )}
        </CardContent>
      </Card>
    </>
  );
}
