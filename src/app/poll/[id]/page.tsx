"use client"

import { useEffect, useState } from 'react'
import { PollVoting } from "@/components/PollVoting"
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import type { Poll, Option } from '@/types/database.types'
import { useToast } from '@/components/ui/use-toast'

export default function PollPage({ params }: { params: { id: string } }) {
  console.log('Poll ID:', params.id);
  const [poll, setPoll] = useState<Poll | null>(null)
  const [options, setOptions] = useState<Option[]>([])
  const [votes, setVotes] = useState<Record<string, number>>({})
  const [totalVotes, setTotalVotes] = useState(0)
  const [hasVoted, setHasVoted] = useState(false)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    if (!supabase) {
      console.error('No Supabase client available')
      return
    }

    const loadData = async () => {
      await fetchPollData()
      await checkUserVote()
    }

    loadData()

    // Setup realtime subscription
    const channelId = `poll_votes_${params.id}`
    console.log('Setting up realtime subscription:', channelId)

    const channel = supabase.channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'votes',
          filter: `poll_id=eq.${params.id}`
        },
        (payload) => {
          console.log('Vote change:', payload)
          
          // Re-fetch all votes to ensure consistency
          const fetchVotes = async () => {
            if (!supabase) return

            const { data: votesData, error: votesError } = await supabase
              .from('votes')
              .select('option_id')
              .eq('poll_id', params.id)

            if (votesError) {
              console.error('Error fetching votes:', votesError)
              return
            }

            // Count votes per option
            const voteCounts: Record<string, number> = {}
            votesData?.forEach(vote => {
              voteCounts[vote.option_id] = (voteCounts[vote.option_id] || 0) + 1
            })
            
            console.log('Updated vote counts:', voteCounts)
            setVotes(voteCounts)
            setTotalVotes(votesData?.length || 0)
          }

          fetchVotes()
        }
      )

    channel.subscribe((status) => {
      console.log('Subscription status:', status)
    })

    return () => {
      console.log('Cleaning up realtime subscription:', channelId)
      channel.unsubscribe()
    }
  }, [params.id])

  const fetchPollData = async () => {
    if (!supabase) {
      console.error('Supabase client not available')
      return
    }
    
    try {
      // First, check if Supabase is initialized
      const { data: authData, error: authError } = await supabase.auth.getSession()
      if (authError) {
        console.error('Auth error:', authError)
        return
      }
      console.log('Auth data:', authData)

      // Fetch poll
      const { data: pollData, error: pollError } = await supabase
        .from('polls')
        .select('*')
        .eq('id', params.id)
        .single()

      if (pollError) {
        console.error('Error fetching poll:', pollError)
        throw pollError
      }
      
      console.log('Poll data:', pollData)
      setPoll(pollData)

      // Check if user is admin
      setIsAdmin(authData.session?.user?.id === pollData.created_by)

      // Fetch options
      const { data: optionsData, error: optionsError } = await supabase
        .from('poll_options')
        .select('id, poll_id, text')
        .eq('poll_id', params.id)

      if (optionsError) {
        console.error('Error fetching options:', optionsError)
        throw optionsError
      }
      
      console.log('Options data:', optionsData)
      if (!optionsData || optionsData.length === 0) {
        console.warn('No options found for poll:', params.id)
      }
      setOptions(optionsData || [])

      // Fetch votes
      const { data: votesData, error: votesError } = await supabase
        .from('votes')
        .select('option_id')
        .eq('poll_id', params.id)

      if (votesError) {
        console.error('Error fetching votes:', votesError)
        throw votesError
      }

      // Count votes per option
      const voteCounts: Record<string, number> = {}
      votesData?.forEach(vote => {
        voteCounts[vote.option_id] = (voteCounts[vote.option_id] || 0) + 1
      })
      
      console.log('Vote counts:', voteCounts)
      setVotes(voteCounts)
      setTotalVotes(votesData?.length || 0)
    } catch (error) {
      console.error('Error fetching poll data:', error)
      toast({
        title: "Error",
        description: "Failed to load poll data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const checkUserVote = async () => {
    if (!supabase) return
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    const { data } = await supabase
      .from('votes')
      .select('option_id')
      .eq('poll_id', params.id)
      .eq('user_id', session.user.id)
      .single()

    if (data) {
      setHasVoted(true)
      setSelectedOption(data.option_id)
    }
  }

  const submitVote = async (optionId: string) => {
    if (!supabase) return
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.id) {
        toast({
          title: "Error",
          description: "You must be signed in to vote",
          variant: "destructive"
        })
        return
      }

      const { error } = await supabase
        .from('votes')
        .insert({
          poll_id: params.id,
          option_id: optionId,
          user_id: session.user.id
        })

      if (error) {
        console.error('Error submitting vote:', error)
        throw error
      }

      setHasVoted(true)
      setSelectedOption(optionId)
      toast({
        title: "Success",
        description: "Your vote has been recorded"
      })
    } catch (error) {
      console.error('Error submitting vote:', error)
      toast({
        title: "Error",
        description: "Failed to submit vote",
        variant: "destructive"
      })
    }
  }

  return loading ? (
    <LoadingSpinner />
  ) : (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <PollVoting
          poll={poll}
          pollId={params.id}
          options={options}
          votes={votes}
          totalVotes={totalVotes}
          hasVoted={hasVoted}
          selectedOption={selectedOption}
          isAdmin={isAdmin}
          submitVote={submitVote}
        />
      </div>
    </div>
  )
}
