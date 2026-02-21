'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/components/ui/use-toast'
import { analyzeEstimateFeedback } from '@/lib/services/agentLearning'

type ModelTier = 'fast' | 'pro' | 'expert'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface Attachment {
  id?: string
  fileName: string
  fileType: string
  fileSize: number
  url: string
  isImage: boolean
}

interface LineItem {
  category: string
  description: string
  quantity: number
  unit: string
  rate: number
  total: number
  confidence: 'high' | 'medium' | 'low'
  notes?: string
}

interface Estimate {
  projectTitle: string
  summary: string
  lineItems: LineItem[]
  assumptions: string[]
  siteVisitRequired: boolean
  siteVisitReason?: string
  recommendations: string[]
  timeline: string
  disclaimers: string[]
  subtotal: number
  tax: number
  total: number
}

const MODEL_TIERS = [
  {
    tier: 'fast' as ModelTier,
    icon: '⚡',
    name: 'Fast',
    description: 'Quick estimates, great accuracy',
    model: 'Claude Sonnet 4.5'
  },
  {
    tier: 'pro' as ModelTier,
    icon: '🎯',
    name: 'Pro',
    description: 'Detailed estimates, top-tier accuracy',
    model: 'Claude Opus 4.6'
  },
  {
    tier: 'expert' as ModelTier,
    icon: '🧠',
    name: 'Expert',
    description: 'Maximum reasoning power',
    model: 'GPT-5.3 Codex'
  }
]

export default function EstimatePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [estimateId, setEstimateId] = useState<string | null>(null)
  const [editingLineItem, setEditingLineItem] = useState<number | null>(null)
  const [originalEstimate, setOriginalEstimate] = useState<Estimate | null>(null)
  
  // Model picker state
  const [modelTier, setModelTier] = useState<ModelTier>('pro')
  
  // File upload state
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (status === 'loading') return <p className="text-center p-8">Loading...</p>
  if (!session) {
    router.push('/login')
    return null
  }

  const handleModelChange = (newTier: ModelTier) => {
    const oldTierName = MODEL_TIERS.find(m => m.tier === modelTier)?.name
    const newTierName = MODEL_TIERS.find(m => m.tier === newTier)?.name
    
    setModelTier(newTier)
    
    // Add system message to chat
    if (messages.length > 0) {
      setMessages(prev => [
        ...prev,
        { 
          role: 'system', 
          content: `Switched from ${oldTierName} to ${newTierName} model` 
        }
      ])
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const maxFiles = 5 - attachments.length
    if (files.length > maxFiles) {
      toast({ 
        title: `Maximum ${5} files allowed`, 
        description: `You can upload ${maxFiles} more file(s)` 
      })
      return
    }

    setUploading(true)

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const formData = new FormData()
        formData.append('file', file)
        if (estimateId) {
          formData.append('estimateId', estimateId)
        }

        const response = await axios.post('/api/uploads', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })

        setAttachments(prev => [
          ...prev,
          {
            id: response.data.attachmentId,
            fileName: response.data.fileName,
            fileType: response.data.fileType,
            fileSize: response.data.fileSize,
            url: response.data.url,
            isImage: response.data.isImage
          }
        ])

        // If PDF with extracted text, add to conversation
        if (response.data.extractedText) {
          setMessages(prev => [
            ...prev,
            {
              role: 'system',
              content: `📎 Attached PDF: ${file.name}\n\nExtracted content:\n${response.data.extractedText.substring(0, 500)}${response.data.extractedText.length > 500 ? '...' : ''}`
            }
          ])
        }
      }

      toast({ title: 'Files uploaded successfully!' })
    } catch (error: any) {
      console.error('Upload error:', error)
      toast({ 
        title: 'Upload failed', 
        description: error.response?.data?.error || 'Please try again' 
      })
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const removeAttachment = async (index: number) => {
    const attachment = attachments[index]
    
    if (attachment.id) {
      try {
        await axios.delete(`/api/uploads?attachmentId=${attachment.id}`)
      } catch (error) {
        console.error('Error deleting attachment:', error)
      }
    }
    
    setAttachments(prev => prev.filter((_, i) => i !== index))
    toast({ title: 'Attachment removed' })
  }

  const handleSend = async () => {
    if ((!input.trim() && attachments.length === 0) || loading) return

    const userMessage = input.trim() || '[Sent attachments]'
    setInput('')
    
    // Show user message
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    
    // Show attachment indicators in chat
    if (attachments.length > 0) {
      const attachmentMsg = attachments
        .map(a => `📎 ${a.isImage ? '🖼️' : '📄'} ${a.fileName}`)
        .join('\n')
      setMessages(prev => [...prev, { role: 'system', content: attachmentMsg }])
    }
    
    setLoading(true)

    try {
      const response = await axios.post('/api/estimates/chat', {
        message: userMessage,
        estimateId: estimateId,
        conversationHistory: messages.filter(m => m.role !== 'system'),
        modelTier: modelTier,
        photos: attachments.filter(a => a.isImage).map(a => a.url)
      })

      // Add AI response to messages
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: response.data.message }
      ])

      // If estimate was generated, save it
      if (response.data.isEstimate && response.data.estimate) {
        setEstimate(response.data.estimate)
        setOriginalEstimate(response.data.estimate)
        setEstimateId(response.data.estimateId)
      }

      // Update estimateId if new
      if (response.data.estimateId) {
        setEstimateId(response.data.estimateId)
      }

      // Clear attachments after sending
      setAttachments([])
    } catch (error: any) {
      console.error('Error sending message:', error)
      const errorMsg = error.response?.data?.error || 'Sorry, something went wrong.'
      
      if (error.response?.data?.redirectTo === '/onboarding') {
        toast({ 
          title: 'Complete onboarding first',
          description: 'Please set up your company profile to use the estimator.'
        })
        router.push('/onboarding')
        return
      }

      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: errorMsg }
      ])
      toast({ title: 'Error', description: errorMsg })
    } finally {
      setLoading(false)
    }
  }

  const handleLineItemEdit = (index: number, field: keyof LineItem, value: any) => {
    if (!estimate) return

    const updatedLineItems = [...estimate.lineItems]
    updatedLineItems[index] = {
      ...updatedLineItems[index],
      [field]: value
    }

    if (field === 'quantity' || field === 'rate') {
      updatedLineItems[index].total =
        updatedLineItems[index].quantity * updatedLineItems[index].rate
    }

    const subtotal = updatedLineItems.reduce((sum, item) => sum + item.total, 0)
    const tax = subtotal * (estimate.tax / estimate.subtotal)
    const total = subtotal + tax

    setEstimate({
      ...estimate,
      lineItems: updatedLineItems,
      subtotal,
      tax,
      total
    })
  }

  const handleApprove = async () => {
    if (!estimate || !estimateId) return

    try {
      if (originalEstimate && JSON.stringify(estimate.lineItems) !== JSON.stringify(originalEstimate.lineItems)) {
        await analyzeEstimateFeedback(
          (session.user as any).id,
          estimateId,
          originalEstimate.lineItems,
          estimate.lineItems
        )
        toast({ title: 'Changes saved! AI will learn from your edits.' })
      }

      await axios.put(`/api/estimates/${estimateId}`, {
        status: 'approved'
      })

      toast({ title: 'Estimate approved!' })
      router.push('/dashboard')
    } catch (error) {
      console.error('Error approving estimate:', error)
      toast({ title: 'Error approving estimate' })
    }
  }

  const downloadPDF = async () => {
    if (!estimateId) return

    try {
      const response = await axios.get(`/api/estimates/${estimateId}/pdf`, {
        responseType: 'blob'
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${estimate?.projectTitle || 'estimate'}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast({ title: 'PDF downloaded!' })
    } catch (error) {
      console.error('Error downloading PDF:', error)
      toast({ title: 'Error downloading PDF' })
    }
  }

  const confidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'bg-green-900 text-green-200'
      case 'medium':
        return 'bg-yellow-900 text-yellow-200'
      case 'low':
        return 'bg-red-900 text-red-200'
      default:
        return 'bg-gray-700 text-gray-200'
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const currentModel = MODEL_TIERS.find(m => m.tier === modelTier)

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-white">AI Estimator</h1>

        {/* Model Picker */}
        <Card className="bg-gray-800 border-gray-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white text-sm">Select AI Model</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {MODEL_TIERS.map(model => (
                <button
                  key={model.tier}
                  onClick={() => handleModelChange(model.tier)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    modelTier === model.tier
                      ? 'border-blue-500 bg-blue-900/30'
                      : 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{model.icon}</span>
                    <span className="font-bold text-white">{model.name}</span>
                  </div>
                  <p className="text-sm text-gray-300 mb-1">{model.description}</p>
                  <p className="text-xs text-gray-400">{model.model}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chat Panel */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-white">Conversation</CardTitle>
                {currentModel && (
                  <span className="text-xs px-3 py-1 rounded-full bg-blue-900 text-blue-200">
                    {currentModel.icon} {currentModel.name}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[500px] overflow-y-auto space-y-4 mb-4 p-4 bg-gray-900 rounded">
                {messages.length === 0 && (
                  <div className="text-center text-gray-400 py-8">
                    <p className="text-lg mb-2">👋 Hi! I'm your AI estimator.</p>
                    <p>Describe the project you need estimated, and I'll ask you some questions to get the details right.</p>
                    <p className="text-sm mt-4">💡 You can attach photos or PDFs to help me understand the project better.</p>
                  </div>
                )}
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${
                      msg.role === 'user' ? 'justify-end' : 
                      msg.role === 'system' ? 'justify-center' : 
                      'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : msg.role === 'system'
                          ? 'bg-gray-700/50 text-gray-300 text-xs italic max-w-[90%]'
                          : 'bg-gray-700 text-gray-100'
                      }`}
                    >
                      {msg.role !== 'system' && (
                        <p className="text-sm font-semibold mb-1">
                          {msg.role === 'user' ? 'You' : 'AI Estimator'}
                        </p>
                      )}
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-700 text-gray-100 p-3 rounded-lg">
                      <p className="text-sm font-semibold mb-1">AI Estimator</p>
                      <p className="animate-pulse">Thinking...</p>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Attachments Preview */}
              {attachments.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {attachments.map((att, idx) => (
                    <div
                      key={idx}
                      className="relative bg-gray-700 p-2 rounded flex items-center gap-2 text-sm"
                    >
                      {att.isImage ? (
                        <img
                          src={att.url}
                          alt={att.fileName}
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 flex items-center justify-center bg-gray-600 rounded">
                          <span className="text-2xl">📄</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-white truncate text-xs">{att.fileName}</p>
                        <p className="text-gray-400 text-xs">{formatFileSize(att.fileSize)}</p>
                      </div>
                      <button
                        onClick={() => removeAttachment(idx)}
                        className="text-red-400 hover:text-red-300 text-lg leading-none"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Input Area */}
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading || uploading || attachments.length >= 5}
                  variant="outline"
                  size="icon"
                  title="Attach files (max 5)"
                >
                  {uploading ? '⏳' : '📎'}
                </Button>
                <Input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyPress={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  placeholder="Describe your project or answer the question..."
                  className="bg-gray-700 border-gray-600 text-white"
                  disabled={loading}
                />
                <Button onClick={handleSend} disabled={loading || (!input.trim() && attachments.length === 0)}>
                  Send
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Estimate Panel */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">
                {estimate ? estimate.projectTitle : 'Estimate Preview'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!estimate ? (
                <div className="text-center text-gray-400 py-8">
                  <p>Your estimate will appear here once generated.</p>
                </div>
              ) : (
                <div className="space-y-6 max-h-[500px] overflow-y-auto">
                  {/* Summary */}
                  <div>
                    <h4 className="font-semibold text-white mb-2">Summary</h4>
                    <p className="text-gray-300 text-sm">{estimate.summary}</p>
                  </div>

                  {/* Line Items */}
                  <div>
                    <h4 className="font-semibold text-white mb-2">Line Items</h4>
                    <div className="space-y-2">
                      {estimate.lineItems.map((item, idx) => (
                        <div
                          key={idx}
                          className="bg-gray-700 p-3 rounded text-sm"
                          onDoubleClick={() => setEditingLineItem(idx)}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-semibold text-white">
                              {editingLineItem === idx ? (
                                <Input
                                  value={item.description}
                                  onChange={e =>
                                    handleLineItemEdit(idx, 'description', e.target.value)
                                  }
                                  onBlur={() => setEditingLineItem(null)}
                                  autoFocus
                                  className="bg-gray-600 border-gray-500 text-white text-sm"
                                />
                              ) : (
                                item.description
                              )}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded ${confidenceColor(item.confidence)}`}>
                              {item.confidence}
                            </span>
                          </div>
                          <div className="flex justify-between text-gray-300">
                            <span>
                              {editingLineItem === idx ? (
                                <>
                                  <Input
                                    type="number"
                                    value={item.quantity}
                                    onChange={e =>
                                      handleLineItemEdit(idx, 'quantity', parseFloat(e.target.value) || 0)
                                    }
                                    className="inline-block w-16 bg-gray-600 border-gray-500 text-white text-sm mr-1"
                                  />
                                  {item.unit} @ $
                                  <Input
                                    type="number"
                                    value={item.rate}
                                    onChange={e =>
                                      handleLineItemEdit(idx, 'rate', parseFloat(e.target.value) || 0)
                                    }
                                    className="inline-block w-20 bg-gray-600 border-gray-500 text-white text-sm ml-1"
                                  />
                                </>
                              ) : (
                                `${item.quantity} ${item.unit} @ $${item.rate.toFixed(2)}`
                              )}
                            </span>
                            <span className="font-semibold text-white">${item.total.toFixed(2)}</span>
                          </div>
                          {item.notes && (
                            <p className="text-xs text-gray-400 mt-1">{item.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">💡 Double-click any item to edit</p>
                  </div>

                  {/* Totals */}
                  <div className="bg-gray-700 p-4 rounded space-y-2">
                    <div className="flex justify-between text-gray-300">
                      <span>Subtotal:</span>
                      <span>${estimate.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Tax:</span>
                      <span>${estimate.tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-white font-bold text-lg">
                      <span>Total:</span>
                      <span>${estimate.total.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Assumptions */}
                  {estimate.assumptions.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-white mb-2">Assumptions</h4>
                      <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                        {estimate.assumptions.map((assumption, idx) => (
                          <li key={idx}>{assumption}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Site Visit Flag */}
                  {estimate.siteVisitRequired && (
                    <div className="bg-yellow-900 text-yellow-100 p-3 rounded">
                      <p className="font-semibold">⚠️ Site Visit Required</p>
                      <p className="text-sm">{estimate.siteVisitReason}</p>
                    </div>
                  )}

                  {/* Recommendations */}
                  {estimate.recommendations.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-white mb-2">Recommendations</h4>
                      <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                        {estimate.recommendations.map((rec, idx) => (
                          <li key={idx}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Timeline */}
                  <div>
                    <h4 className="font-semibold text-white mb-2">Estimated Timeline</h4>
                    <p className="text-gray-300 text-sm">{estimate.timeline}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 pt-4 border-t border-gray-600">
                    <Button onClick={handleApprove} className="w-full">
                      ✅ Approve Estimate
                    </Button>
                    <Button onClick={downloadPDF} variant="outline" className="w-full">
                      📄 Download PDF
                    </Button>
                    <Button
                      onClick={() => router.push('/dashboard')}
                      variant="outline"
                      className="w-full"
                    >
                      💾 Save as Draft
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
