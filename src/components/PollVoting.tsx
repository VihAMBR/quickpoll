import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Poll, PollOption, Vote } from '../types/database.types';

interface PollVotingProps {
  pollId: string;
}

export default function PollVoting({ pollId }: PollVotingProps) {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [options, setOptions] = useState<PollOption[]>([]);
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [totalVotes, setTotalVotes] = useState(0);

  useEffect(() => {
    fetchPollData();
    subscribeToVotes();
  }, [pollId]);

  const fetchPollData = async () => {
    // Fetch poll details
    const { data: pollData } = await supabase
      .from('polls')
      .select('*')
      .eq('id', pollId)
      .single();

    if (pollData) setPoll(pollData);

    // Fetch poll options
    const { data: optionsData } = await supabase
      .from('poll_options')
      .select('*')
      .eq('poll_id', pollId);

    if (optionsData) {
      setOptions(optionsData);
      
      // Fetch current votes
      const { data: votesData } = await supabase
        .from('votes')
        .select('option_id')
        .eq('poll_id', pollId);

      if (votesData) {
        const voteCounts: Record<string, number> = {};
        votesData.forEach((vote: Vote) => {
          voteCounts[vote.option_id] = (voteCounts[vote.option_id] || 0) + 1;
        });
        setVotes(voteCounts);
        setTotalVotes(votesData.length);
      }
    }
  };

  const subscribeToVotes = () => {
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
      subscription.unsubscribe();
    };
  };

  const submitVote = async (optionId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      alert('Please sign in to vote');
      return;
    }

    const { error } = await supabase
      .from('votes')
      .insert([
        {
          poll_id: pollId,
          option_id: optionId,
          user_id: user.id
        }
      ]);

    if (error) {
      console.error('Error submitting vote:', error);
      alert('Failed to submit vote');
    } else {
      setHasVoted(true);
      setSelectedOption(optionId);
    }
  };

  if (!poll) return <div>Loading...</div>;

  return (
    <div className="max-w-lg mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">{poll.title}</h2>
      <div className="space-y-4">
        {options.map((option) => {
          const voteCount = votes[option.id] || 0;
          const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;

          return (
            <div key={option.id} className="space-y-2">
              <button
                onClick={() => !hasVoted && submitVote(option.id)}
                disabled={hasVoted}
                className={`w-full p-4 rounded-md border ${
                  selectedOption === option.id
                    ? 'bg-blue-100 border-blue-500'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span>{option.text}</span>
                  <span>{voteCount} votes</span>
                </div>
                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {percentage.toFixed(1)}%
                </div>
              </button>
            </div>
          );
        })}
      </div>
      <div className="mt-4 text-center text-gray-600">
        Total votes: {totalVotes}
      </div>
    </div>
  );
}
