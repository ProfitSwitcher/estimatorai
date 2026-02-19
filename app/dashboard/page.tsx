// app/dashboard/page.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
  const router = useRouter()
import axios from 'axios'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { PLANS } from '@/lib/stripe' // Import PLANS

interface EstimateSummary {
  id: string
  project_title: string
  total: number
  status: string
  created_at: string
}

interface UserSession {
  id?: string
  name?: string
  email?: string
  subscriptionTier?: string // 'free', 'pro', 'team'
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [estimates, setEstimates] = useState<EstimateSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null) // To hold user details like subscription

  useEffect(() => {
    // Fetch user details if session is authenticated
    const fetchUser = async () => {
      if ((session?.user as any)?.id) {
        try {
          const response = await axios.get(`/api/users/${(session!.user as any).id}`) // Assuming this API route exists
          setCurrentUser(response.data)
        } catch (error) {
          console.error("Error fetching user details:", error)
          toast({ title: "Error", description: "Could not fetch user details." })
        }
      }
    }

    if (status === 'authenticated') {
      fetchUser()
      loadEstimates()
    }
  }, [status, (session?.user as any)?.id])

  const loadEstimates = async () => {
    setLoading(true)
    try {
      // Assuming an API route to fetch user's estimates
      const response = await axios.get('/api/estimates')
      setEstimates(response.data.estimates)
    } catch (error) {
      console.error('Error loading estimates:', error)
      toast({ title: "Error loading estimates", description: "Could not fetch your estimates." })
    } finally {
      setLoading(false)
    }
  }

  const deleteEstimate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this estimate?')) return

    try {
      await axios.delete(`/api/estimates/${id}`)
      setEstimates(prev => prev.filter(est => est.id !== id))
      toast({ title: "Estimate deleted successfully!" })
    } catch (error) {
      console.error('Error deleting estimate:', error)
      toast({ title: "Error deleting estimate", description: "Please try again." })
    }
  }

  const handleSubscribe = async (plan: 'pro' | 'team') => {
    try {
      const response = await axios.post('/api/stripe/checkout', { plan })
      window.location.href = response.data.url // Redirect to Stripe Checkout
    } catch (error) {
      console.error('Error subscribing:', error)
      toast({ title: "Subscription Error", description: "Could not initiate subscription. Please try again." })
    }
  }

  // Determine free tier limit
  const freeTierLimit = PLANS.FREE.estimatesLimit

  // Check if the user is on the free tier and has reached the limit
  const reachedFreeTierLimit = currentUser?.subscriptionTier === 'free' && estimates.length >= freeTierLimit

  if (status === 'loading') return <p>Loading...</p>
  if (!session) {
    router.push('/login') // Redirect if not logged in
    return null // Prevent rendering anything else
  }

  const userDisplayName = currentUser?.name || session.user?.name || 'User'
  const userEmail = currentUser?.email || session.user?.email
  const userSubscriptionTier = currentUser?.subscriptionTier || (session.user as any)?.subscriptionTier || 'free'

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-gray-600">Welcome, {userDisplayName}!</p>
            {userEmail && <p className="text-sm text-gray-500">Email: {userEmail}</p>}
            <p className="text-sm text-gray-500">
              Subscription Tier: <span className="font-medium capitalize">{userSubscriptionTier}</span>
            </p>
          </div>
          <div className="flex gap-4">
            <Link href="/estimate">
              <Button variant="default" disabled={reachedFreeTierLimit}>
                {reachedFreeTierLimit
                  ? 'Upgrade to Create'
                  : 'New Estimate'}
              </Button>
            </Link>
            {userSubscriptionTier !== 'pro' && userSubscriptionTier !== 'team' && (
              <>
                <Button onClick={() => handleSubscribe('pro')} variant="outline" className="bg-blue-100 hover:bg-blue-200">
                  Go Pro (${PLANS.PRO.price / 100}/mo)
                </Button>
                <Button onClick={() => handleSubscribe('team')} variant="outline" className="bg-green-100 hover:bg-green-200">
                  Go Team (${PLANS.TEAM.price / 100}/mo)
                </Button>
              </>
            )}
          </div>
        </div>

        <h2 className="text-2xl font-semibold mb-4">My Estimates</h2>
        {loading ? (
          <p>Loading estimates...</p>
        ) : estimates.length === 0 ? (
          <p className="text-gray-500">
            {reachedFreeTierLimit
              ? 'You have reached the free tier limit for estimates. Upgrade to create more!'
              : 'No estimates found. Create your first one!'}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {estimates.map((est) => (
              <Card key={est.id} className="relative">
                <CardContent className="pt-6">
                  <h3 className="text-xl font-semibold mb-2 truncate">{est.project_title}</h3>
                  <p className="text-gray-500 text-sm mb-4">
                    Created: {new Date(est.created_at).toLocaleDateString()}
                  </p>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-bold text-green-700">
                      ${est.total.toFixed(2)}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded capitalize ${est.status === 'draft' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-700'}`}>
                      {est.status}
                    </span>
                  </div>
                  <div className="flex flex-col md:flex-row gap-2">
                    <Link href={`/estimate/${est.id}`} legacyBehavior>
                      <Button variant="outline" size="sm" className="flex-1">View/Edit</Button>
                    </Link>
                    <Button variant="ghost" size="sm" onClick={() => window.open(`/api/estimates/${est.id}/pdf`, '_blank')} className="flex-1">PDF</Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteEstimate(est.id)} className="flex-1">Delete</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
