import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Poll, Option, Vote } from '../types/database.types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, QrCode, Eye, EyeOff, Lock, Timer, Users, Trash2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ShareDialog } from "@/components/ui/share-dialog";
import { QRCodeSVG } from 'qrcode.react';
import { useToast } from "@/components/ui/use-toast";
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PollAdminProps {
  pollId: string;
}

export default function PollAdmin({ pollId }: PollAdminProps) {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [options, setOptions] = useState<Option[]>([]);
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [totalVotes, setTotalVotes] = useState(0);
  const [uniqueVoters, setUniqueVoters] = useState(0);
  const [showQR, setShowQR] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPollData();
    subscribeToVotes();
  }, [pollId]);

  const fetchPollData = async () => {
    if (!supabase) {
      console.error('Supabase client not available');
      return;
    }

    try {
      // Fetch poll details
      const { data: pollData, error: pollError } = await supabase
        .from('polls')
        .select('*')
        .eq('id', pollId)
        .single();

      if (pollError) {
        console.error('Error fetching poll:', pollError);
        return;
      }

      if (pollData) setPoll(pollData);

      // Fetch poll options
      const { data: optionsData, error: optionsError } = await supabase
        .from('poll_options')
        .select('*')
        .eq('poll_id', pollId);

      if (optionsError) {
        console.error('Error fetching options:', optionsError);
        return;
      }

      if (optionsData) {
        setOptions(optionsData);
        
        // Fetch current votes
        const { data: votesData, error: votesError } = await supabase
          .from('votes')
          .select('option_id, user_id')
          .eq('poll_id', pollId);

        if (votesError) {
          console.error('Error fetching votes:', votesError);
          return;
        }

        if (votesData) {
          const voteCounts: Record<string, number> = {};
          const uniqueUsers = new Set();
          
          votesData.forEach((vote: Vote) => {
            voteCounts[vote.option_id] = (voteCounts[vote.option_id] || 0) + 1;
            if (vote.user_id) uniqueUsers.add(vote.user_id);
          });
          
          setVotes(voteCounts);
          setTotalVotes(votesData.length);
          setUniqueVoters(uniqueUsers.size);
        }
      }
    } catch (error) {
      console.error('Error fetching poll data:', error);
      toast({
        title: "Error",
        description: "Failed to load poll data",
        variant: "destructive"
      });
    }
  };

  const subscribeToVotes = () => {
    if (!supabase) {
      console.error('Supabase client not available');
      return;
    }

    const subscription = supabase
      .channel(`poll_${pollId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'votes',
        filter: `poll_id=eq.${pollId}`
      }, fetchPollData)
      .subscribe();

    return () => {
      subscription?.unsubscribe();
    };
  };

  const toggleShowResults = async () => {
    if (!supabase) {
      console.error('Supabase client not available');
      return;
    }

    try {
      const { error } = await supabase
        .from('polls')
        .update({ show_results: !poll?.show_results })
        .eq('id', pollId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Poll settings updated"
      });
    } catch (error) {
      console.error('Error updating poll settings:', error);
      toast({
        title: "Error",
        description: "Failed to update poll settings",
        variant: "destructive"
      });
    }
  };

  const deletePoll = async () => {
    if (!supabase) {
      console.error('Supabase client not available');
      return;
    }

    try {
      const { error } = await supabase
        .from('polls')
        .delete()
        .eq('id', pollId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Poll deleted successfully",
      });

      // Redirect to home
      window.location.href = '/';
    } catch (error) {
      console.error('Error deleting poll:', error);
      toast({
        title: "Error",
        description: "Failed to delete poll",
        variant: "destructive"
      });
    }
  };

  const isPollEnded = () => {
    if (!poll?.end_date) return false;
    return new Date(poll.end_date) < new Date();
  };

  if (!poll) return <LoadingSpinner />;

  return (
    <>
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                {poll.title}
                {poll.require_auth && <Lock className="h-4 w-4 text-muted-foreground" />}
                {poll.end_date && <Timer className="h-4 w-4 text-muted-foreground" />}
              </CardTitle>
              {poll.description && (
                <CardDescription>{poll.description}</CardDescription>
              )}
              {poll.end_date && (
                <p className="text-sm text-muted-foreground mt-1">
                  {isPollEnded() ? 'Ended' : 'Ends'} {format(new Date(poll.end_date), 'PPp')}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 hover:bg-muted"
                onClick={toggleShowResults}
              >
                {poll.show_results ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </Button>
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
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => setShowDeleteAlert(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <Card>
              <CardHeader className="p-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Total Votes
                </CardTitle>
                <CardDescription className="text-2xl font-bold">{totalVotes}</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="p-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Unique Voters
                </CardTitle>
                <CardDescription className="text-2xl font-bold">{uniqueVoters}</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="p-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Results Visible
                </CardTitle>
                <CardDescription className="text-2xl font-bold">
                  {poll.show_results ? 'Yes' : 'No'}
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-4">
            {options.map((option) => {
              const voteCount = votes[option.id] || 0;
              const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;

              return (
                <div key={option.id} className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{option.text}</span>
                    <span className="text-muted-foreground">{voteCount} votes</span>
                  </div>
                  <div className="space-y-1">
                    <Progress value={percentage} className="h-2" />
                    <div className="text-sm text-muted-foreground">
                      {percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the poll
              and all associated votes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deletePoll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Poll
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
