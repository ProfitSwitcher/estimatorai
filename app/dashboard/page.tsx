'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/components/ui/use-toast'
import { getLearningStats } from '@/lib/services/agentLearning'

interface EstimateSummary {
  id: string
  project_title: string
  total: number
  status: string
  created_at: string
}

interface CompanyProfile {
  company_name: string
  trade: string[]
  service_area_city?: string
  service_area_state?: string
  labor_rates: Record<string, number>
}

interface LearningStats {
  totalCorrections: number
  totalPreferences: number
  totalPatterns: number
  recentLearnings: Array<{ type: string; content: string; date: string }>
}

interface PhoneAssistantStats {
  phone_number: string | null
  callsToday: number
  callsThisWeek: number
  callsNeedingFollowUp: number
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [estimates, setEstimates] = useState<EstimateSummary[]>([])
  const [profile, setProfile] = useState<CompanyProfile | null>(null)
  const [learningStats, setLearningStats] = useState<LearningStats | null>(null)
  const [phoneStats, setPhoneStats] = useState<PhoneAssistantStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'authenticated') {
      loadDashboardData()
    }
  }, [status])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      // Load company profile
      const profileRes = await axios.get('/api/company-profile')
      if (!profileRes.data.profile) {
        // No profile, redirect to onboarding
        router.push('/onboarding')
        return
      }
      setProfile(profileRes.data.profile)

      // Load estimates
      const estimatesRes = await axios.get('/api/estimates')
      setEstimates(estimatesRes.data.estimates || [])

      // Load learning stats (server-side function, needs API route or direct call)
      const userId = (session!.user as any).id
      const stats = await getLearningStats(userId)
      setLearningStats(stats)

      // Load phone assistant stats
      try {
        const phoneRes = await axios.get('/api/phone-assistant')
        const callsRes = await axios.get('/api/phone-assistant/calls', { params: { limit: 100 } })
        
        const calls = callsRes.data.calls || []
        const today = new Date()
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        
        setPhoneStats({
          phone_number: phoneRes.data.phoneAssistant?.phone_number || null,
          callsToday: calls.filter((c: any) => {
            const callDate = new Date(c.created_at)
            return callDate.toDateString() === today.toDateString()
          }).length,
          callsThisWeek: calls.filter((c: any) => new Date(c.created_at) >= weekAgo).length,
          callsNeedingFollowUp: calls.filter((c: any) => c.action_needed).length
        })
      } catch (phoneError) {
        // Phone assistant not set up yet
        setPhoneStats(null)
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      toast({ title: 'Error loading dashboard' })
    } finally {
      setLoading(false)
    }
  }

  const deleteEstimate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this estimate?')) return

    try {
      await axios.delete(`/api/estimates/${id}`)
      setEstimates(prev => prev.filter(est => est.id !== id))
      toast({ title: 'Estimate deleted successfully!' })
    } catch (error) {
      console.error('Error deleting estimate:', error)
      toast({ title: 'Error deleting estimate' })
    }
  }

  if (status === 'loading' || loading) {
    return <p className="text-center p-8">Loading...</p>
  }

  if (!session) {
    router.push('/login')
    return null
  }

  if (!profile) {
    return <p className="text-center p-8">Redirecting to onboarding...</p>
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <p className="text-gray-400">Welcome back, {session.user?.name || 'User'}!</p>
          </div>
          <Link href="/estimate">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
              + New Estimate
            </Button>
          </Link>
        </div>

        {/* Company Profile Summary */}
        <Card className="bg-gray-800 border-gray-700 mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-white">Company Profile</CardTitle>
              <Link href="/onboarding">
                <Button variant="outline" size="sm">Edit Profile</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-400">Company Name</p>
                <p className="text-lg font-semibold text-white">{profile.company_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Trades</p>
                <p className="text-lg text-white">{profile.trade.join(', ')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Service Area</p>
                <p className="text-lg text-white">
                  {[profile.service_area_city, profile.service_area_state]
                    .filter(Boolean)
                    .join(', ') || 'Not specified'}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-400 mb-2">Labor Rates</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(profile.labor_rates).map(([role, rate]) => (
                  <span
                    key={role}
                    className="bg-blue-900 text-blue-200 px-3 py-1 rounded-full text-sm"
                  >
                    {role}: ${rate}/hr
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Learning Stats */}
        {learningStats && (
          <Card className="bg-gray-800 border-gray-700 mb-6">
            <CardHeader>
              <CardTitle className="text-white">🧠 AI Learning Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-green-900 p-4 rounded">
                  <p className="text-sm text-green-200">Pricing Corrections</p>
                  <p className="text-3xl font-bold text-white">{learningStats.totalCorrections}</p>
                </div>
                <div className="bg-blue-900 p-4 rounded">
                  <p className="text-sm text-blue-200">Preferences Learned</p>
                  <p className="text-3xl font-bold text-white">{learningStats.totalPreferences}</p>
                </div>
                <div className="bg-purple-900 p-4 rounded">
                  <p className="text-sm text-purple-200">Patterns Identified</p>
                  <p className="text-3xl font-bold text-white">{learningStats.totalPatterns}</p>
                </div>
              </div>

              {learningStats.recentLearnings.length > 0 && (
                <div>
                  <h4 className="font-semibold text-white mb-2">Recent Learnings</h4>
                  <div className="space-y-2">
                    {learningStats.recentLearnings.slice(0, 5).map((learning, idx) => (
                      <div key={idx} className="bg-gray-700 p-3 rounded text-sm">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs text-gray-400 uppercase">{learning.type.replace('_', ' ')}</span>
                          <span className="text-xs text-gray-400">{learning.date}</span>
                        </div>
                        <p className="text-gray-200">{learning.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {learningStats.totalCorrections + learningStats.totalPreferences + learningStats.totalPatterns === 0 && (
                <div className="text-center text-gray-400 py-4">
                  <p>The AI is ready to learn from your feedback!</p>
                  <p className="text-sm">Create estimates and make edits to teach the AI your preferences.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Business Advisor */}
        <Card className="bg-gray-800 border-gray-700 mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-white">🧠 Business Advisor</CardTitle>
              <Link href="/advisor">
                <Button variant="outline" size="sm">Open Advisor</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300 mb-4">
              Get expert guidance on building, growing, and optimizing your construction business with AI-powered consulting.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Link href="/advisor" className="block">
                <div className="bg-gray-700 p-4 rounded hover:bg-gray-600 transition-colors">
                  <p className="text-lg mb-1">📖 Business Playbook</p>
                  <p className="text-sm text-gray-400">Document your vision, processes, and strategy</p>
                </div>
              </Link>
              <Link href="/advisor" className="block">
                <div className="bg-gray-700 p-4 rounded hover:bg-gray-600 transition-colors">
                  <p className="text-lg mb-1">💰 Exit Strategy</p>
                  <p className="text-sm text-gray-400">Prepare for sale and maximize valuation</p>
                </div>
              </Link>
              <Link href="/advisor" className="block">
                <div className="bg-gray-700 p-4 rounded hover:bg-gray-600 transition-colors">
                  <p className="text-lg mb-1">🚀 Growth Strategy</p>
                  <p className="text-sm text-gray-400">Scale your business with proven tactics</p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Phone Assistant */}
        <Card className="bg-gray-800 border-gray-700 mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-white">📞 Phone Assistant</CardTitle>
              <Link href="/phone">
                <Button variant="outline" size="sm">
                  {phoneStats?.phone_number ? 'Manage' : 'Set Up'}
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {phoneStats?.phone_number ? (
              <>
                <p className="text-gray-300 mb-4">
                  Your AI phone assistant is answering calls and capturing leads 24/7.
                </p>
                <div className="bg-gray-700 p-4 rounded mb-4">
                  <p className="text-sm text-gray-400 mb-1">Your Phone Number</p>
                  <p className="text-2xl font-bold text-white">{phoneStats.phone_number}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-900 p-3 rounded">
                    <p className="text-sm text-blue-200">Calls Today</p>
                    <p className="text-2xl font-bold text-white">{phoneStats.callsToday}</p>
                  </div>
                  <div className="bg-green-900 p-3 rounded">
                    <p className="text-sm text-green-200">This Week</p>
                    <p className="text-2xl font-bold text-white">{phoneStats.callsThisWeek}</p>
                  </div>
                  <div className="bg-yellow-900 p-3 rounded">
                    <p className="text-sm text-yellow-200">Need Follow-Up</p>
                    <p className="text-2xl font-bold text-white">{phoneStats.callsNeedingFollowUp}</p>
                  </div>
                </div>
                {phoneStats.callsNeedingFollowUp > 0 && (
                  <div className="mt-4 bg-yellow-900 text-yellow-100 p-3 rounded">
                    <p className="font-semibold">⚠️ {phoneStats.callsNeedingFollowUp} call{phoneStats.callsNeedingFollowUp > 1 ? 's' : ''} need follow-up</p>
                    <Link href="/phone" className="text-sm underline">
                      View call logs →
                    </Link>
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="text-gray-300 mb-4">
                  Get a dedicated phone number with an AI assistant that answers calls, qualifies leads, and captures project details 24/7.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-gray-700 p-3 rounded">
                    <p className="text-lg mb-1">📞 Never Miss a Call</p>
                    <p className="text-xs text-gray-400">24/7 availability</p>
                  </div>
                  <div className="bg-gray-700 p-3 rounded">
                    <p className="text-lg mb-1">🎯 Qualify Leads</p>
                    <p className="text-xs text-gray-400">Capture project details</p>
                  </div>
                  <div className="bg-gray-700 p-3 rounded">
                    <p className="text-lg mb-1">💰 Save Time</p>
                    <p className="text-xs text-gray-400">Focus on real work</p>
                  </div>
                </div>
                <Link href="/phone">
                  <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700">
                    Set Up Phone Assistant
                  </Button>
                </Link>
              </>
            )}
          </CardContent>
        </Card>

        {/* Estimates List */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">My Estimates</CardTitle>
          </CardHeader>
          <CardContent>
            {estimates.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <p className="text-lg mb-2">No estimates yet</p>
                <p className="text-sm">Create your first estimate to get started!</p>
                <Link href="/estimate">
                  <Button className="mt-4">Create Estimate</Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {estimates.map(est => (
                  <Card key={est.id} className="bg-gray-700 border-gray-600">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-semibold text-white truncate flex-1">
                          {est.project_title}
                        </h3>
                        <span
                          className={`text-xs px-2 py-1 rounded ml-2 capitalize ${
                            est.status === 'approved'
                              ? 'bg-green-900 text-green-200'
                              : 'bg-yellow-900 text-yellow-200'
                          }`}
                        >
                          {est.status}
                        </span>
                      </div>
                      
                      <p className="text-gray-400 text-sm mb-3">
                        {new Date(est.created_at).toLocaleDateString()}
                      </p>
                      
                      <p className="text-2xl font-bold text-green-400 mb-4">
                        ${est.total.toFixed(2)}
                      </p>
                      
                      <div className="flex flex-col gap-2">
                        <Link href={`/estimate?id=${est.id}`} legacyBehavior>
                          <Button variant="outline" size="sm" className="w-full">
                            View/Edit
                          </Button>
                        </Link>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => window.open(`/api/estimates/${est.id}/pdf`, '_blank')}
                          >
                            PDF
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="flex-1"
                            onClick={() => deleteEstimate(est.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
