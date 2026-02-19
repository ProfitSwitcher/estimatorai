// app/estimate/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { Input } from "@/components/ui/input" // Assuming you have a Shadcn UI setup
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast" // Assuming you have a toast component

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Estimate {
  projectTitle: string
  summary: string
  lineItems: {
    category: string
    description: string
    quantity: number
    unit: string
    rate: number
    total: number
    notes?: string
  }[]
  assumptions: string[]
  recommendations: string[]
  timeline: string
  subtotal: number
  tax: number
  total: number
}

export default function EstimatePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [estimateId, setEstimateId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [photos, setPhotos] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)

  // Fetch User data for subscription checks, etc.
  // const [user, setUser] = useState<any>(null);
  // useEffect(() => {
  //   const fetchUser = async () => {
  //     if (session?.user?.id) {
  //       const { data } = await axios.get(`/api/users/${session.user.id}`);
  //       setUser(data);
  //     }
  //   };
  //   fetchUser();
  // }, [session]);

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return
    setUploading(true)
    const file = event.target.files[0]
    const formData = new FormData()
    formData.append('file', file)

    try {
      // Assuming an upload endpoint exists: POST /api/upload
      const response = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setPhotos(prev => [...prev, response.data.url])
      toast({ title: "Photo uploaded successfully!" })
    } catch (error) {
      console.error('Error uploading photo:', error)
      toast({ title: "Error uploading photo", description: "Please try again." })
    } finally {
      setUploading(false)
    }
  }

  const handleSend = async () => {
    if (!input.trim()) {
      toast({ title: "Please enter a description." })
      return
    }

    // Check subscription limits if needed
    // if (user && user.subscriptionTier === 'free' && messages.length >= PLAN_LIMITS.FREE.messageCount) {
    //   toast({ title: "Free tier limit reached", description: "Upgrade to Pro for more estimates." });
    //   return;
    // }

    setMessages(prev => [...prev, { role: 'user', content: input }])
    setInput('')
    setLoading(true)

    try {
      // ✅ Updated API endpoint (no port 3001, uses Next.js API route)
      const response = await axios.post('/api/estimates/generate', {
        description: input,
        photos, // Send uploaded photo URLs
        projectType: 'general_construction', // Example
        location: 'US', // Example
      })

      const generatedEstimate = response.data.estimate
      setEstimate(generatedEstimate)
      setEstimateId(response.data.estimateId)

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Here is the estimate for "${generatedEstimate.projectTitle}":\n${generatedEstimate.summary}`,
        }
      ])
      toast({ title: "Estimate generated successfully!" })
    } catch (error: any) {
      console.error('Error generating estimate:', error)
      const errorMessage = error.response?.data?.error || 'Sorry, I had trouble generating that estimate. Please try again.'
      toast({ title: "Error generating estimate", description: errorMessage })
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I had trouble generating that estimate.' }
      ])
    } finally {
      setLoading(false)
    }
  }

  const downloadPDF = async () => {
    if (!estimateId) {
      toast({ title: "No estimate ID available yet." })
      return
    }

    try {
      // ✅ Updated PDF endpoint
      const response = await axios.get(`/api/estimates/${estimateId}/pdf`, {
        responseType: 'blob' // Important for downloading files
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      // Use projectTitle from state if available, otherwise a default
      const filename = estimate ? `${estimate.projectTitle}-estimate.pdf` : `estimate-${estimateId}.pdf`
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url) // Clean up the URL object
      toast({ title: "Download initiated!" })
    } catch (error) {
      console.error('Error downloading PDF:', error)
      toast({ title: "Error downloading PDF", description: "Please try again." })
    }
  }

  // Handle enter key for sending message
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (status === 'loading') return <p>Loading...</p>
  if (!session) router.push('/login') // Redirect if not logged in

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-6">Generate Estimate</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Textarea
                  placeholder="Describe the project here..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="min-h-[150px]"
                  rows={6}
                />
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 dark:text-gray-400 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
                    id="file_input"
                  />
                  {uploading && <p className="text-sm text-gray-500 mt-1">Uploading...</p>}
                </div>
                <div className="flex justify-between items-center">
                  <Button onClick={handleSend} disabled={loading || uploading || !input.trim()}>
                    {loading ? 'Generating...' : 'Generate Estimate'}
                  </Button>
                  {estimateId && (
                    <Button onClick={downloadPDF} variant="outline">
                      Download PDF
                    </Button>
                  )}
                </div>
                {photos.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Uploaded Photos:</h4>
                    <div className="flex gap-2 overflow-x-auto">
                      {photos.map((photoUrl, index) => (
                        <img
                          key={index}
                          src={photoUrl}
                          alt={`Uploaded photo ${index + 1}`}
                          className="w-24 h-24 object-cover rounded-md cursor-pointer"
                          // onClick={() => window.open(photoUrl)} // Optional: view larger
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat/Result Display */}
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Conversation</CardTitle>
            </CardHeader>
            <CardContent className="h-[400px] overflow-y-auto border rounded-md p-4 bg-gray-50">
              {messages.map((msg, index) => (
                <div key={index} className={`mb-4 text-sm ${msg.role === 'user' ? 'text-right text-blue-600' : 'text-left text-gray-700'}`}>
                  <p><strong>{msg.role === 'user' ? 'You' : 'AI'}:</strong></p>
                  <p>{msg.content}</p>
                </div>
              ))}
              {loading && (
                <div className="text-center py-4">
                  <p>AI is thinking...</p>
                </div>
              )}
            </CardContent>
          </Card>

          {estimate && (
            <Card>
              <CardHeader>
                <CardTitle>Generated Estimate</CardTitle>
              </CardHeader>
              <CardContent>
                <h3 className="text-xl font-bold mb-2">{estimate.projectTitle}</h3>
                <p className="text-gray-600 mb-4">{estimate.summary}</p>
                <div className="mb-4">
                  <h4 className="font-semibold mb-2">Line Items:</h4>
                  <ul className="list-disc list-inside">
                    {estimate.lineItems.map((item, index) => (
                      <li key={index} className="flex justify-between text-sm">
                        <span>{item.description}</span>
                        <span>${item.total.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="text-right space-y-1">
                  <p>Subtotal: ${estimate.subtotal.toFixed(2)}</p>
                  <p>Tax: ${estimate.tax.toFixed(2)}</p>
                  <p className="font-bold text-lg">Total: ${estimate.total.toFixed(2)}</p>
                </div>
                {estimate.assumptions && estimate.assumptions.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Assumptions:</h4>
                    <ul className="list-disc list-inside text-sm">
                      {estimate.assumptions.map((ass, i) => <li key={i}>{ass}</li>)}
                    </ul>
                  </div>
                )}
                {estimate.recommendations && estimate.recommendations.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Recommendations:</h4>
                    <ul className="list-disc list-inside text-sm">
                      {estimate.recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
