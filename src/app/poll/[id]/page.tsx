"use client"

import { useEffect, useState } from 'react'
import { PollVoting } from "@/components/PollVoting"
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import type { Poll, Option } from '@/types/database.types'
import { useToast } from '@/components/ui/use-toast'

export default function PollPage({ params }: { params: { id: string } }) {
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
    fetchPollData()
    checkUserVote()
    setupRealtimeSubscription()
  }, [])

  const fetchPollData = async () => {
    try {
      // Fetch poll
      const { data: pollData, error: pollError } = await supabase
        .from('polls')
        .select('*')
        .eq('id', params.id)
        .single()

      if (pollError) throw pollError
      setPoll(pollData)

      // Check if user is admin
      const { data: { session } } = await supabase.auth.getSession()
      setIsAdmin(session?.user?.id === pollData.user_id)

      // Fetch options
      const { data: optionsData, error: optionsError } = await supabase
        .from('options')
        .select('*')
        .eq('poll_id', params.id)
        .order('order')

      if (optionsError) throw optionsError
      setOptions(optionsData)

      // Fetch votes
      const { data: votesData, error: votesError } = await supabase
        .from('votes')
        .select('option_id')
        .eq('poll_id', params.id)

      if (votesError) throw votesError

      // Count votes per option
      const voteCounts: Record<string, number> = {}
      votesData.forEach(vote => {
        voteCounts[vote.option_id] = (voteCounts[vote.option_id] || 0) + 1
      })
      setVotes(voteCounts)
      setTotalVotes(votesData.length)
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

  const setupRealtimeSubscription = () => {
    const votesSubscription = supabase
      .channel('votes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'votes',
        filter: `poll_id=eq.${params.id}`
      }, () => {
        fetchPollData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(votesSubscription)
    }
  }

  const submitVote = async (optionId: string) => {
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

      if (error) throw error

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

  if (loading) return <LoadingSpinner />

  return (
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
  )
}
