'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/use-toast'

interface PhoneAssistant {
  id: number
  phone_number: string
  assistant_name: string
  greeting_message: string
  business_hours: any
  after_hours_message: string
  services_offered: string[]
  service_area: string
  emergency_instructions: string
  transfer_number: string
  voicemail_email: string
  voice_id: string
  is_active: boolean
  created_at: string
}

interface CallLog {
  id: number
  caller_number: string
  caller_name: string
  call_duration_seconds: number
  call_status: string
  summary: string
  transcript: string
  caller_intent: string
  lead_captured: any
  action_needed: string
  created_at: string
}

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function PhonePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [phoneAssistant, setPhoneAssistant] = useState<PhoneAssistant | null>(null)
  const [loading, setLoading] = useState(true)
  const [setupStep, setSetupStep] = useState(1)
  const [saving, setSaving] = useState(false)

  // Call logs
  const [calls, setCalls] = useState<CallLog[]>([])
  const [callsFilter, setCallsFilter] = useState('all')
  const [expandedCall, setExpandedCall] = useState<number | null>(null)

  // Form data
  const [formData, setFormData] = useState<any>({
    assistant_name: '',
    greeting_message: 'Thanks for calling! How can I help you today?',
    business_hours: {
      mon: { open: '08:00', close: '17:00' },
      tue: { open: '08:00', close: '17:00' },
      wed: { open: '08:00', close: '17:00' },
      thu: { open: '08:00', close: '17:00' },
      fri: { open: '08:00', close: '17:00' },
      sat: null,
      sun: null
    },
    after_hours_message: 'We are currently closed. Please leave your name, number, and a brief message and we will get back to you.',
    services_offered: [''],
    service_area: '',
    emergency_instructions: '',
    transfer_number: '',
    voicemail_email: '',
    voice_id: 'jennifer'
  })

  useEffect(() => {
    if (status === 'authenticated') {
      loadPhoneAssistant()
    }
  }, [status])

  const loadPhoneAssistant = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/api/phone-assistant')
      setPhoneAssistant(response.data.phoneAssistant)

      if (response.data.phoneAssistant) {
        setFormData({
          assistant_name: response.data.phoneAssistant.assistant_name,
          greeting_message: response.data.phoneAssistant.greeting_message,
          business_hours: response.data.phoneAssistant.business_hours,
          after_hours_message: response.data.phoneAssistant.after_hours_message,
          services_offered: response.data.phoneAssistant.services_offered || [''],
          service_area: response.data.phoneAssistant.service_area || '',
          emergency_instructions: response.data.phoneAssistant.emergency_instructions || '',
          transfer_number: response.data.phoneAssistant.transfer_number || '',
          voicemail_email: response.data.phoneAssistant.voicemail_email || '',
          voice_id: response.data.phoneAssistant.voice_id || 'jennifer'
        })
        loadCalls()
      }
    } catch (error) {
      console.error('Error loading phone assistant:', error)
      toast({ title: 'Error loading phone assistant' })
    } finally {
      setLoading(false)
    }
  }

  const loadCalls = async () => {
    try {
      const params: any = { limit: 50 }
      if (callsFilter !== 'all') {
        if (callsFilter === 'action_needed') {
          params.action_needed = 'true'
        } else {
          params.date = callsFilter
        }
      }

      const response = await axios.get('/api/phone-assistant/calls', { params })
      setCalls(response.data.calls || [])
    } catch (error) {
      console.error('Error loading calls:', error)
    }
  }

  useEffect(() => {
    if (phoneAssistant) {
      loadCalls()
    }
  }, [callsFilter])

  const handleSetupComplete = async () => {
    setSaving(true)
    try {
      const response = await axios.post('/api/phone-assistant', formData)
      setPhoneAssistant(response.data.phoneAssistant)
      toast({ title: 'Phone assistant created successfully!' })
      loadCalls()
    } catch (error: any) {
      console.error('Error creating phone assistant:', error)
      toast({
        title: 'Error creating phone assistant',
        description: error.response?.data?.error || 'Please try again'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
    setSaving(true)
    try {
      await axios.put('/api/phone-assistant', formData)
      toast({ title: 'Settings updated successfully!' })
      loadPhoneAssistant()
    } catch (error: any) {
      console.error('Error updating phone assistant:', error)
      toast({
        title: 'Error updating settings',
        description: error.response?.data?.error || 'Please try again'
      })
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async () => {
    try {
      await axios.put('/api/phone-assistant', {
        ...formData,
        is_active: !phoneAssistant?.is_active
      })
      toast({ title: phoneAssistant?.is_active ? 'Phone assistant deactivated' : 'Phone assistant activated' })
      loadPhoneAssistant()
    } catch (error) {
      console.error('Error toggling active status:', error)
      toast({ title: 'Error updating status' })
    }
  }

  const copyPhoneNumber = () => {
    if (phoneAssistant?.phone_number) {
      navigator.clipboard.writeText(phoneAssistant.phone_number)
      toast({ title: 'Phone number copied!' })
    }
  }

  if (status === 'loading' || loading) {
    return <p className="text-center p-8">Loading...</p>
  }

  if (!session) {
    router.push('/login')
    return null
  }

  // Setup wizard
  if (!phoneAssistant) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-white">📞 Phone Assistant Setup</h1>

          <Card className="bg-gray-800 border-gray-700 mb-6">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-white">Step {setupStep} of 6</CardTitle>
                <span className="text-sm text-gray-400">{Math.round((setupStep / 6) * 100)}% complete</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${(setupStep / 6) * 100}%` }}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1: Greeting */}
              {setupStep === 1 && (
                <div>
                  <h3 className="text-xl font-semibold text-white mb-4">Customize Your Greeting</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Assistant Name
                      </label>
                      <Input
                        value={formData.assistant_name}
                        onChange={e => setFormData({ ...formData, assistant_name: e.target.value })}
                        placeholder="e.g., ABC Plumbing Assistant"
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Greeting Message
                      </label>
                      <textarea
                        value={formData.greeting_message}
                        onChange={e => setFormData({ ...formData, greeting_message: e.target.value })}
                        rows={3}
                        className="w-full bg-gray-700 border border-gray-600 rounded-md p-3 text-white"
                        placeholder="Thanks for calling! How can I help you today?"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        This is the first thing callers will hear.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Business Hours */}
              {setupStep === 2 && (
                <div>
                  <h3 className="text-xl font-semibold text-white mb-4">Set Business Hours</h3>
                  <div className="space-y-3">
                    {DAYS.map((day, idx) => (
                      <div key={day} className="flex items-center gap-4">
                        <span className="w-24 text-gray-300">{DAY_NAMES[idx]}</span>
                        {formData.business_hours[day] ? (
                          <>
                            <Input
                              type="time"
                              value={formData.business_hours[day].open}
                              onChange={e =>
                                setFormData({
                                  ...formData,
                                  business_hours: {
                                    ...formData.business_hours,
                                    [day]: { ...formData.business_hours[day], open: e.target.value }
                                  }
                                })
                              }
                              className="bg-gray-700 border-gray-600 text-white"
                            />
                            <span className="text-gray-400">to</span>
                            <Input
                              type="time"
                              value={formData.business_hours[day].close}
                              onChange={e =>
                                setFormData({
                                  ...formData,
                                  business_hours: {
                                    ...formData.business_hours,
                                    [day]: { ...formData.business_hours[day], close: e.target.value }
                                  }
                                })
                              }
                              className="bg-gray-700 border-gray-600 text-white"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setFormData({
                                  ...formData,
                                  business_hours: { ...formData.business_hours, [day]: null }
                                })
                              }
                            >
                              Closed
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            onClick={() =>
                              setFormData({
                                ...formData,
                                business_hours: {
                                  ...formData.business_hours,
                                  [day]: { open: '08:00', close: '17:00' }
                                }
                              })
                            }
                          >
                            Set Hours
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      After Hours Message
                    </label>
                    <textarea
                      value={formData.after_hours_message}
                      onChange={e => setFormData({ ...formData, after_hours_message: e.target.value })}
                      rows={3}
                      className="w-full bg-gray-700 border border-gray-600 rounded-md p-3 text-white"
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Services & Service Area */}
              {setupStep === 3 && (
                <div>
                  <h3 className="text-xl font-semibold text-white mb-4">Services & Service Area</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Services Offered
                      </label>
                      {formData.services_offered.map((service: string, idx: number) => (
                        <div key={idx} className="flex gap-2 mb-2">
                          <Input
                            value={service}
                            onChange={e => {
                              const newServices = [...formData.services_offered]
                              newServices[idx] = e.target.value
                              setFormData({ ...formData, services_offered: newServices })
                            }}
                            placeholder="e.g., Plumbing repair"
                            className="bg-gray-700 border-gray-600 text-white"
                          />
                          {idx === formData.services_offered.length - 1 && (
                            <Button
                              onClick={() =>
                                setFormData({
                                  ...formData,
                                  services_offered: [...formData.services_offered, '']
                                })
                              }
                            >
                              +
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Service Area
                      </label>
                      <Input
                        value={formData.service_area}
                        onChange={e => setFormData({ ...formData, service_area: e.target.value })}
                        placeholder="e.g., Greater Missoula area"
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Emergency & Transfer */}
              {setupStep === 4 && (
                <div>
                  <h3 className="text-xl font-semibold text-white mb-4">Emergency Instructions</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Emergency Instructions
                      </label>
                      <textarea
                        value={formData.emergency_instructions}
                        onChange={e => setFormData({ ...formData, emergency_instructions: e.target.value })}
                        rows={2}
                        className="w-full bg-gray-700 border border-gray-600 rounded-md p-3 text-white"
                        placeholder="For emergencies, call 911 or text our emergency line at..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Transfer Number (Optional)
                      </label>
                      <Input
                        value={formData.transfer_number}
                        onChange={e => setFormData({ ...formData, transfer_number: e.target.value })}
                        placeholder="e.g., +1-555-123-4567"
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        For urgent calls, the assistant can transfer to this number.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Notifications */}
              {setupStep === 5 && (
                <div>
                  <h3 className="text-xl font-semibold text-white mb-4">Email Notifications</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Voicemail Email
                    </label>
                    <Input
                      type="email"
                      value={formData.voicemail_email}
                      onChange={e => setFormData({ ...formData, voicemail_email: e.target.value })}
                      placeholder="your@email.com"
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Receive call summaries and lead notifications at this email.
                    </p>
                  </div>
                </div>
              )}

              {/* Step 6: Review */}
              {setupStep === 6 && (
                <div>
                  <h3 className="text-xl font-semibold text-white mb-4">Review & Activate</h3>
                  <div className="space-y-3 bg-gray-700 p-4 rounded">
                    <div>
                      <p className="text-sm text-gray-400">Assistant Name</p>
                      <p className="text-white">{formData.assistant_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Greeting</p>
                      <p className="text-white">{formData.greeting_message}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Services</p>
                      <p className="text-white">
                        {formData.services_offered.filter(Boolean).join(', ') || 'None specified'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Service Area</p>
                      <p className="text-white">{formData.service_area || 'Not specified'}</p>
                    </div>
                  </div>
                  <div className="mt-4 bg-yellow-900 p-4 rounded">
                    <p className="text-yellow-100">
                      ⚠️ Clicking "Activate" will purchase a phone number ($5-10/month) and set up your AI phone assistant.
                    </p>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between pt-4">
                {setupStep > 1 && (
                  <Button variant="outline" onClick={() => setSetupStep(setupStep - 1)}>
                    Previous
                  </Button>
                )}
                {setupStep < 6 ? (
                  <Button
                    onClick={() => setSetupStep(setupStep + 1)}
                    className="ml-auto"
                    disabled={setupStep === 1 && !formData.assistant_name}
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    onClick={handleSetupComplete}
                    disabled={saving}
                    className="ml-auto bg-green-600 hover:bg-green-700"
                  >
                    {saving ? 'Setting up...' : 'Activate Phone Assistant'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Management dashboard
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-white">📞 Phone Assistant</h1>
          <Button
            onClick={toggleActive}
            variant={phoneAssistant.is_active ? 'destructive' : 'default'}
          >
            {phoneAssistant.is_active ? 'Deactivate' : 'Activate'}
          </Button>
        </div>

        {/* Phone Number Card */}
        <Card className="bg-gray-800 border-gray-700 mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <p className="text-sm text-gray-400 mb-1">Your AI Phone Number</p>
                <p className="text-3xl font-bold text-white">{phoneAssistant.phone_number}</p>
                <p className={`text-sm mt-1 ${phoneAssistant.is_active ? 'text-green-400' : 'text-red-400'}`}>
                  {phoneAssistant.is_active ? '✓ Active' : '○ Inactive'}
                </p>
              </div>
              <Button onClick={copyPhoneNumber} variant="outline">
                📋 Copy Number
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="pt-6">
              <p className="text-sm text-gray-400">Calls Today</p>
              <p className="text-3xl font-bold text-white">
                {calls.filter(c => {
                  const today = new Date()
                  const callDate = new Date(c.created_at)
                  return callDate.toDateString() === today.toDateString()
                }).length}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="pt-6">
              <p className="text-sm text-gray-400">This Week</p>
              <p className="text-3xl font-bold text-white">
                {calls.filter(c => {
                  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                  return new Date(c.created_at) >= weekAgo
                }).length}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="pt-6">
              <p className="text-sm text-gray-400">Needs Follow-Up</p>
              <p className="text-3xl font-bold text-yellow-400">
                {calls.filter(c => c.action_needed).length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Call Logs */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-white">Recent Calls</CardTitle>
              <div className="flex gap-2">
                {['all', 'today', 'week', 'action_needed'].map(filter => (
                  <Button
                    key={filter}
                    variant={callsFilter === filter ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCallsFilter(filter)}
                  >
                    {filter === 'action_needed' ? 'Action Needed' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {calls.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <p>No calls yet. Share your phone number with customers!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {calls.map(call => (
                  <div key={call.id} className="bg-gray-700 p-4 rounded">
                    <div
                      className="flex justify-between items-start cursor-pointer"
                      onClick={() => setExpandedCall(expandedCall === call.id ? null : call.id)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-white font-semibold">
                            {call.caller_name || call.caller_number || 'Unknown'}
                          </span>
                          <span className="text-xs px-2 py-1 rounded bg-blue-900 text-blue-200">
                            {call.caller_intent || 'general'}
                          </span>
                          {call.action_needed && (
                            <span className="text-xs px-2 py-1 rounded bg-yellow-900 text-yellow-200">
                              {call.action_needed}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-300">{call.summary}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(call.created_at).toLocaleString()} · {call.call_duration_seconds}s
                        </p>
                      </div>
                      <span className="text-gray-400">{expandedCall === call.id ? '▼' : '▶'}</span>
                    </div>

                    {expandedCall === call.id && (
                      <div className="mt-4 pt-4 border-t border-gray-600 space-y-3">
                        {call.lead_captured && (
                          <div>
                            <p className="text-sm font-semibold text-white mb-2">Lead Information</p>
                            <div className="bg-gray-800 p-3 rounded text-sm space-y-1">
                              {call.lead_captured.name && (
                                <p><span className="text-gray-400">Name:</span> {call.lead_captured.name}</p>
                              )}
                              {call.lead_captured.phone && (
                                <p><span className="text-gray-400">Phone:</span> {call.lead_captured.phone}</p>
                              )}
                              {call.lead_captured.email && (
                                <p><span className="text-gray-400">Email:</span> {call.lead_captured.email}</p>
                              )}
                              {call.lead_captured.address && (
                                <p><span className="text-gray-400">Address:</span> {call.lead_captured.address}</p>
                              )}
                              {call.lead_captured.project_description && (
                                <p><span className="text-gray-400">Project:</span> {call.lead_captured.project_description}</p>
                              )}
                            </div>
                          </div>
                        )}
                        {call.transcript && (
                          <div>
                            <p className="text-sm font-semibold text-white mb-2">Transcript</p>
                            <div className="bg-gray-800 p-3 rounded text-sm text-gray-300 max-h-64 overflow-y-auto whitespace-pre-wrap">
                              {call.transcript}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Settings Section */}
        <Card className="bg-gray-800 border-gray-700 mt-6">
          <CardHeader>
            <CardTitle className="text-white">Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Greeting Message</label>
              <textarea
                value={formData.greeting_message}
                onChange={e => setFormData({ ...formData, greeting_message: e.target.value })}
                rows={2}
                className="w-full bg-gray-700 border border-gray-600 rounded-md p-3 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Services Offered</label>
              <Input
                value={formData.services_offered.join(', ')}
                onChange={e => setFormData({ ...formData, services_offered: e.target.value.split(',').map(s => s.trim()) })}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Voicemail Email</label>
              <Input
                type="email"
                value={formData.voicemail_email}
                onChange={e => setFormData({ ...formData, voicemail_email: e.target.value })}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <Button onClick={handleUpdate} disabled={saving}>
              {saving ? 'Saving...' : 'Update Settings'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
