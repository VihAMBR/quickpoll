'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { PlusCircle, BarChart3, Vote, Users, Clock } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Navigation } from '@/components/navigation'

interface DashboardStats {
  totalPolls: number
  totalVotes: number
  activePolls: number
  completedPolls: number
}

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentPolls, setRecentPolls] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      if (!supabase) {
        router.push('/')
        return
      }
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/')
        return
      }
      fetchDashboardData(session.user.id)
    }
    checkUser()
  }, [router])

  const fetchDashboardData = async (userId: string) => {
    if (!supabase) return
    
    try {
      // Fetch polls created by user
      const { data: polls } = await supabase
        .from('polls')
        .select('*')
        .eq('created_by', userId)

      // Fetch total votes
      const { data: votes } = await supabase
        .from('votes')
        .select('poll_id')
        .in('poll_id', polls?.map(p => p.id) || [])

      const now = new Date()
      const stats: DashboardStats = {
        totalPolls: polls?.length || 0,
        totalVotes: votes?.length || 0,
        activePolls: polls?.filter(p => {
          // If no end_date, poll is active
          if (!p.end_date) return true
          const endDate = new Date(p.end_date)
          return endDate > now
        })?.length || 0,
        completedPolls: polls?.filter(p => p.end_date && new Date(p.end_date) <= now)?.length || 0
      }

      // Get 5 most recent polls
      const recentPolls = polls
        ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        ?.slice(0, 5)

      setStats(stats)
      setRecentPolls(recentPolls || [])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <main>
        <Navigation />
        <div className="container mx-auto pt-24 pb-12 space-y-8">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      </main>
    )
  }

  return (
    <main>
      <Navigation hideAuth />
      <div className="container mx-auto pt-32 pb-16 space-y-12">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold">Dashboard</h1>
          <Button asChild>
            <Link href="/create">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create New Poll
            </Link>
          </Button>
        </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Polls</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalPolls}</div>
            <p className="text-xs text-muted-foreground">Polls created</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Votes</CardTitle>
            <Vote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalVotes}</div>
            <p className="text-xs text-muted-foreground">Votes received</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Polls</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activePolls}</div>
            <p className="text-xs text-muted-foreground">Currently running</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.completedPolls}</div>
            <p className="text-xs text-muted-foreground">Ended polls</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Polls */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Polls</CardTitle>
          <CardDescription>Your 5 most recently created polls</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentPolls.length > 0 ? (
              recentPolls.map((poll) => (
                <div key={poll.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">{poll.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      Created {new Date(poll.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button variant="outline" asChild>
                    <Link href={`/poll/${poll.id}`}>View Results</Link>
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No polls created yet</p>
                <Button className="mt-4" asChild>
                  <Link href="/create">Create Your First Poll</Link>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" className="w-full" asChild>
            <Link href="/my-polls">View All Polls</Link>
          </Button>
        </CardFooter>
      </Card>
      </div>
    </main>
  )
}
