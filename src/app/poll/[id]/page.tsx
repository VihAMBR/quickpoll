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

    // Setup realtime subscriptions with broadcast
    const channelId = `poll_${params.id}`
    console.log('Setting up realtime subscriptions:', channelId)

    const channel = supabase.channel(channelId)
      // Subscribe to vote changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'votes',
          filter: `poll_id=eq.${params.id}`
        },
        (payload) => {
          console.log('Vote change detected:', payload)
          if (payload.eventType === 'INSERT') {
            // Handle new vote
            const newVote = payload.new as { option_id: string }
            setVotes(prev => ({
              ...prev,
              [newVote.option_id]: (prev[newVote.option_id] || 0) + 1
            }))
            setTotalVotes(prev => prev + 1)
          } else if (payload.eventType === 'DELETE') {
            // Handle vote removal
            const oldVote = payload.old as { option_id: string }
            setVotes(prev => ({
              ...prev,
              [oldVote.option_id]: Math.max(0, (prev[oldVote.option_id] || 0) - 1)
            }))
            setTotalVotes(prev => Math.max(0, prev - 1))
          }
          // Check if the current user's vote status has changed
          checkUserVote()
        }
      )
      // Subscribe to poll changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'polls',
          filter: `id=eq.${params.id}`
        },
        (payload) => {
          console.log('Poll change detected:', payload)
          if (payload.eventType === 'UPDATE') {
            // Update poll data
            setPoll(payload.new as Poll)
          } else {
            // For other changes, refresh all data
            fetchPollData()
          }
        }
      )

    // Subscribe to presence for active users (optional)
    channel.subscribe(async (status) => {
      console.log('Subscription status:', status)
      if (status === 'SUBSCRIBED') {
        console.log('Successfully subscribed to real-time updates')
        // Initial data fetch after successful subscription
        await fetchPollData()
        await checkUserVote()
      }
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
    
    // Check for authenticated user vote
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user?.id) {
      const { data } = await supabase
        .from('votes')
        .select('option_id')
        .eq('poll_id', params.id)
        .eq('user_id', session.user.id)
        .single()

      if (data) {
        setHasVoted(true)
        setSelectedOption(data.option_id)
        return
      }
    }

    // Check for anonymous vote in local storage
    const localVotes = JSON.parse(localStorage.getItem('anonymous_votes') || '{}')
    const hasVotedAnonymously = localVotes[params.id]
    if (hasVotedAnonymously) {
      setHasVoted(true)
      setSelectedOption(hasVotedAnonymously.option_id)
    }
  }

  const submitVote = async (optionId: string): Promise<void> => {
    if (!supabase) return
    
    try {
      // Check if poll has ended
      if (poll?.end_date && new Date(poll.end_date) < new Date()) {
        toast({
          title: "Error",
          description: "This poll has ended",
          variant: "destructive"
        })
        return
      }

      // Get user session
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id

      // Check for existing vote
      if (userId) {
        const { data: existingVote } = await supabase
          .from('votes')
          .select('id')
          .eq('poll_id', params.id)
          .eq('user_id', userId)
          .maybeSingle()

        if (existingVote) {
          toast({
            title: "Error",
            description: "You have already voted in this poll",
            variant: "destructive"
          })
          return
        }
      } else {
        // Check for anonymous vote in local storage
        const localVotes = JSON.parse(localStorage.getItem('anonymous_votes') || '{}')
        if (localVotes[params.id]) {
          toast({
            title: "Error",
            description: "You have already voted in this poll",
            variant: "destructive"
          })
          return
        }
      }

      // Create vote object
      const newVote = {
        poll_id: params.id,
        option_id: optionId,
        user_id: userId || null,
        created_at: new Date().toISOString(),
        anonymous: !userId
      }

      // Optimistically update UI
      setHasVoted(true)
      setSelectedOption(optionId)
      setVotes(prev => ({
        ...prev,
        [optionId]: (prev[optionId] || 0) + 1
      }))
      setTotalVotes(prev => prev + 1)

      // Submit to database
      const { error } = await supabase
        .from('votes')
        .insert(newVote)

      if (error) {
        // Revert optimistic updates on error
        setHasVoted(false)
        setSelectedOption(null)
        setVotes(prev => ({
          ...prev,
          [optionId]: Math.max(0, (prev[optionId] || 0) - 1)
        }))
        setTotalVotes(prev => Math.max(0, prev - 1))
        throw error
      }

      // Store anonymous vote in local storage
      if (!userId) {
        const localVotes = JSON.parse(localStorage.getItem('anonymous_votes') || '{}')
        localVotes[params.id] = {
          option_id: optionId,
          created_at: newVote.created_at
        }
        localStorage.setItem('anonymous_votes', JSON.stringify(localVotes))
      }

      toast({
        title: "Success",
        description: "Your vote has been recorded"
      })
    } catch (error) {
      console.error('Error submitting vote:', error)
      toast({
        title: "Error",
        description: "Failed to submit vote. Please try again.",
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
