"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { EyeIcon, Share2, Trash2 } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import Link from 'next/link'

interface Poll {
  id: string
  title: string
  description: string | null
  created_at: string
  question_type: string
  show_results: boolean
}

export default function MyPolls() {
  const [polls, setPolls] = useState<Poll[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    fetchPolls()
  }, [])

  async function fetchPolls() {
    if (!supabase) return
    
    try {
      // Get user session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('Error getting session:', sessionError)
        router.push('/')
        return
      }
      
      if (!session) {
        console.log('No active session, redirecting to home')
        router.push('/')
        return
      }

      // Fetch polls created by the user
      const { data, error } = await supabase
        .from('polls')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching polls:', error)
        toast({
          title: 'Error',
          description: 'Failed to load your polls',
          variant: 'destructive',
        })
        return
      }

      console.log('User polls:', data)
      setPolls(data || [])
    } catch (error) {
      console.error('Error in fetchPolls:', error)
      toast({
        title: 'Error',
        description: 'Failed to load your polls',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const deletePoll = async (pollId: string) => {
    if (!supabase) return
    
    try {
      const { error } = await supabase
        .from('polls')
        .delete()
        .eq('id', pollId)

      if (error) {
        console.error('Error deleting poll:', error)
        toast({
          title: 'Error',
          description: 'Failed to delete poll',
          variant: 'destructive',
        })
        return
      }

      // Update polls state to remove the deleted poll
      setPolls(polls.filter(poll => poll.id !== pollId))
      
      toast({
        title: 'Success',
        description: 'Poll deleted successfully',
      })
    } catch (error) {
      console.error('Error in deletePoll:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete poll',
        variant: 'destructive',
      })
    }
  }

  const sharePoll = (pollId: string) => {
    const url = `${window.location.origin}/poll/${pollId}`
    navigator.clipboard.writeText(url)
    toast({
      title: 'Link copied!',
      description: 'Poll link copied to clipboard',
    })
  }

  const toggleResults = async (pollId: string, currentShowResults: boolean) => {
    if (!supabase) return
    
    try {
      const { error } = await supabase
        .from('polls')
        .update({ show_results: !currentShowResults })
        .eq('id', pollId)

      if (error) {
        console.error('Error toggling results visibility:', error)
        toast({
          title: 'Error',
          description: 'Failed to update poll settings',
          variant: 'destructive',
        })
        return
      }

      // Update polls state to reflect the change
      setPolls(polls.map(poll => 
        poll.id === pollId 
          ? { ...poll, show_results: !currentShowResults }
          : poll
      ))
      
      toast({
        title: 'Success',
        description: `Results are now ${!currentShowResults ? 'visible' : 'hidden'} to voters`,
      })
    } catch (error) {
      console.error('Error in toggleResults:', error)
      toast({
        title: 'Error',
        description: 'Failed to update poll settings',
        variant: 'destructive',
      })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="container mx-auto py-6 max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Polls</h1>
        <Button onClick={() => router.push('/create')}>Create New Poll</Button>
      </div>

      {polls.length === 0 ? (
        <Card className="text-center p-10">
          <CardHeader>
            <CardTitle>No Polls Found</CardTitle>
            <CardDescription>
              You haven't created any polls yet. Create your first poll to get started!
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button onClick={() => router.push('/create')}>Create Poll</Button>
          </CardFooter>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {polls.map((poll) => (
            <Card key={poll.id} className="overflow-hidden flex flex-col h-full">
              <CardHeader className="pb-3">
                <CardTitle className="truncate text-xl">{poll.title}</CardTitle>
                <CardDescription className="line-clamp-2 min-h-[2.5rem]">
                  {poll.description || 'No description'}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="py-2 flex-grow">
                <div className="text-sm text-muted-foreground space-y-2">
                  <div>
                    <span className="font-medium">Created:</span> {formatDate(poll.created_at)}
                  </div>
                  <div>
                    <span className="font-medium">Type:</span> {poll.question_type.replace('_', ' ')}
                  </div>
                  <div>
                    <span className="font-medium">Results:</span> {poll.show_results ? 'Visible' : 'Hidden'}
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="flex flex-wrap gap-2 justify-between pt-3">
                <Link href={`/poll/${poll.id}`} passHref>
                  <Button variant="outline" size="sm" className="flex-1">
                    <EyeIcon className="h-4 w-4 mr-1" /> View Poll
                  </Button>
                </Link>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => toggleResults(poll.id, poll.show_results)}
                    title={poll.show_results ? 'Hide results from voters' : 'Show results to voters'}
                  >
                    <EyeIcon className="h-4 w-4" />
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => sharePoll(poll.id)}
                    title="Share poll link"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => deletePoll(poll.id)}
                    title="Delete poll"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
