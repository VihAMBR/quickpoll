"use client"

import { useEffect, useState } from 'react'
import { PollVoting } from "@/components/PollVoting"
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import type { Poll, Option } from '@/types/database.types'
import { useToast } from '@/components/ui/use-toast'
import { NameDialog } from '@/components/ui/name-dialog'
import { getDeviceFingerprint } from '@/lib/fingerprint'

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
  const [showNameDialog, setShowNameDialog] = useState(false)
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

    if (!supabase) return

    // Setup realtime subscriptions with broadcast
    const channelId = `poll_${params.id}`
    console.log('Setting up realtime subscriptions:', channelId)

    const channel = supabase.channel(channelId, {
      config: {
        broadcast: {
          self: true
        }
      }
    })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'votes',
          filter: `poll_id=eq.${params.id}`
        },
        async (payload) => {
          console.log('Received vote:', payload)
          // Update vote counts immediately
          setVotes(prev => ({
            ...prev,
            [payload.new.option_id]: (prev[payload.new.option_id] || 0) + 1
          }))
          setTotalVotes(prev => prev + 1)
          
          // Then fetch fresh vote counts
          if (!supabase) return

          try {
            // Fetch fresh vote counts to ensure accuracy
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
            options.forEach(option => {
              voteCounts[option.id] = 0
            })
            
            votesData?.forEach(vote => {
              voteCounts[vote.option_id] = (voteCounts[vote.option_id] || 0) + 1
            })
            
            console.log('Updated vote counts:', voteCounts)
            setVotes(voteCounts)
            setTotalVotes(votesData?.length || 0)
            
            // Check if the current user's vote status has changed
            await checkUserVote()
          } catch (error) {
            console.error('Error processing vote update:', error)
          }
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

    const cleanup = () => {
      console.log('Cleaning up realtime subscription:', channelId)
      channel.unsubscribe()
    }

    return cleanup
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

      // Initialize vote counts for all options to 0
      const voteCounts: Record<string, number> = {}
      optionsData.forEach(option => {
        voteCounts[option.id] = 0
      })

      // Count actual votes
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

  // Validate if a string is a valid UUID
  const isValidUUID = (uuid: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(uuid)
  }

  const checkUserVote = async () => {
    if (!supabase) return
    
    // Get user session and client ID
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id
    const fingerprint = await getDeviceFingerprint()
    const userName = localStorage.getItem('anonymous_user_name')

    // Show name dialog only if we don't have a username
    if (!userId && !userName) {
      setShowNameDialog(true)
      return
    }

    // Check for existing vote
    const { data, error } = await supabase
      .from('votes')
      .select('option_id')
      .eq('poll_id', params.id)
      .eq(userId ? 'user_id' : 'device_fingerprint', userId || fingerprint)
      .maybeSingle()

    if (error) {
      console.error('Error checking vote:', error)
      return
    }

    if (data) {
      setHasVoted(true)
      setSelectedOption(data.option_id)
    }
  }

  const handleNameSubmit = (name: string) => {
    localStorage.setItem('anonymous_user_name', name)
    setShowNameDialog(false)
    checkUserVote()
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

      // Get user session and client ID
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id
      const userName = localStorage.getItem('anonymous_user_name')
      const fingerprint = await getDeviceFingerprint()
      
      // Show name dialog for anonymous users without a name
      if (!userId && !userName) {
        setShowNameDialog(true)
        return
      }

      // Log the current state
      console.log('Current state:', {
        userId,
        fingerprint,
        userName,
        pollId: params.id,
        optionId
      })

      // Check for existing vote
      const { data: existingVote, error: checkError } = await supabase
        .from('votes')
        .select('id')
        .eq('poll_id', params.id)
        .eq(userId ? 'user_id' : 'device_fingerprint', userId || fingerprint)
        .maybeSingle()

      if (checkError) {
        console.error('Error checking vote:', checkError)
        toast({
          title: "Error",
          description: "Failed to check existing vote",
          variant: "destructive"
        })
        return
      }

      console.log('Checking vote:', {
        pollId: params.id,
        userId,
        fingerprint,
        existingVote
      })

      if (existingVote) {
        toast({
          title: "Error",
          description: "You have already voted in this poll",
          variant: "destructive"
        })
        return
      }

      // Prepare vote data
      const voteData = {
        poll_id: params.id,
        option_id: optionId,
        created_at: new Date().toISOString()
      }

      // Add either user_id or device_fingerprint, but not both
      if (userId) {
        Object.assign(voteData, { user_id: userId, device_fingerprint: null })
      } else {
        Object.assign(voteData, { user_id: null, device_fingerprint: fingerprint })
      }

      console.log('Submitting vote:', voteData)

      const { data: insertData, error: insertError } = await supabase
        .from('votes')
        .insert([voteData])
        .select('id, poll_id, option_id')

      if (insertError) {
        console.error('Error submitting vote:', insertError)
        toast({
          title: "Error",
          description: "Failed to submit vote. Please try again.",
          variant: "destructive"
        })
        return
      }

      console.log('Vote submitted successfully:', insertData)

      // Update local state
      setHasVoted(true)
      setSelectedOption(optionId)
      setVotes(prev => ({
        ...prev,
        [optionId]: (prev[optionId] || 0) + 1
      }))
      setTotalVotes(prev => prev + 1)

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
      <NameDialog open={showNameDialog} onSubmit={handleNameSubmit} />
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
