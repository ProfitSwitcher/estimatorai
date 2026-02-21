'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/components/ui/use-toast'

const TRADES = [
  'Electrical',
  'Plumbing',
  'HVAC',
  'Carpentry',
  'Drywall',
  'Painting',
  'Roofing',
  'Concrete',
  'Landscaping',
  'General Contracting',
  'Other'
]

const LABOR_ROLES = [
  'Journeyman',
  'Apprentice',
  'Foreman',
  'Helper',
  'Project Manager',
  'Laborer'
]

export default function OnboardingPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    // Step 1: Company Basics
    company_name: '',
    trade: [] as string[],
    service_area_city: '',
    service_area_state: '',
    service_area_zip: '',

    // Step 2: Pricing
    labor_rates: {} as Record<string, number>,
    material_markup_pct: 25,
    overhead_profit_pct: 15,
    tax_rate: 0.08,

    // Step 3: Operations
    typical_crew_sizes: {} as Record<string, number>,
    equipment_owned: [] as string[],
    preferred_suppliers: [] as string[],
    min_job_size: 0,
    service_call_fee: 0,
    payment_terms: '',

    // Step 4: Job Types
    common_job_types: [] as string[]
  })

  // Temporary input states
  const [equipmentInput, setEquipmentInput] = useState('')
  const [supplierInput, setSupplierInput] = useState('')
  const [jobTypeInput, setJobTypeInput] = useState('')

  if (status === 'loading') return <p>Loading...</p>
  if (!session) {
    router.push('/login')
    return null
  }

  const handleNext = () => {
    // Validation for each step
    if (currentStep === 1) {
      if (!formData.company_name || formData.trade.length === 0) {
        toast({ title: 'Please enter company name and select at least one trade' })
        return
      }
    }

    if (currentStep === 2) {
      if (Object.keys(formData.labor_rates).length === 0) {
        toast({ title: 'Please add at least one labor rate' })
        return
      }
    }

    setCurrentStep(prev => Math.min(prev + 1, 5))
  }

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      await axios.post('/api/company-profile', {
        ...formData,
        tax_rate: formData.tax_rate
      })

      toast({ title: 'Company profile created successfully!' })
      router.push('/dashboard')
    } catch (error: any) {
      console.error('Error creating company profile:', error)
      toast({
        title: 'Error creating profile',
        description: error.response?.data?.error || 'Please try again.'
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleTrade = (trade: string) => {
    if (formData.trade.includes(trade)) {
      setFormData(prev => ({
        ...prev,
        trade: prev.trade.filter(t => t !== trade)
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        trade: [...prev.trade, trade]
      }))
    }
  }

  const addLaborRate = (role: string, rate: number) => {
    setFormData(prev => ({
      ...prev,
      labor_rates: { ...prev.labor_rates, [role]: rate }
    }))
  }

  const removeLaborRate = (role: string) => {
    const rates = { ...formData.labor_rates }
    delete rates[role]
    setFormData(prev => ({ ...prev, labor_rates: rates }))
  }

  const addArrayItem = (field: 'equipment_owned' | 'preferred_suppliers' | 'common_job_types', value: string) => {
    if (!value.trim()) return
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], value.trim()]
    }))
  }

  const removeArrayItem = (field: 'equipment_owned' | 'preferred_suppliers' | 'common_job_types', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }))
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-2xl text-white">
            Company Onboarding - Step {currentStep} of 5
          </CardTitle>
          <div className="flex gap-2 mt-4">
            {[1, 2, 3, 4, 5].map(step => (
              <div
                key={step}
                className={`flex-1 h-2 rounded ${
                  step <= currentStep ? 'bg-blue-500' : 'bg-gray-600'
                }`}
              />
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Company Basics */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white">Company Basics</h3>
              
              <div>
                <Label htmlFor="company_name" className="text-gray-200">Company Name *</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={e => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="ABC Electrical Services"
                />
              </div>

              <div>
                <Label className="text-gray-200">Trade(s) *</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                  {TRADES.map(trade => (
                    <button
                      key={trade}
                      type="button"
                      onClick={() => toggleTrade(trade)}
                      className={`px-3 py-2 rounded text-sm ${
                        formData.trade.includes(trade)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {trade}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city" className="text-gray-200">City</Label>
                  <Input
                    id="city"
                    value={formData.service_area_city}
                    onChange={e => setFormData(prev => ({ ...prev, service_area_city: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="state" className="text-gray-200">State</Label>
                  <Input
                    id="state"
                    value={formData.service_area_state}
                    onChange={e => setFormData(prev => ({ ...prev, service_area_state: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="CA"
                  />
                </div>
                <div>
                  <Label htmlFor="zip" className="text-gray-200">ZIP Code</Label>
                  <Input
                    id="zip"
                    value={formData.service_area_zip}
                    onChange={e => setFormData(prev => ({ ...prev, service_area_zip: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Pricing */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white">Pricing Configuration</h3>
              
              <div>
                <Label className="text-gray-200">Labor Rates ($/hour) *</Label>
                <div className="space-y-2 mt-2">
                  {Object.entries(formData.labor_rates).map(([role, rate]) => (
                    <div key={role} className="flex items-center gap-2">
                      <span className="flex-1 text-gray-300">{role}</span>
                      <span className="text-white font-semibold">${rate}/hr</span>
                      <Button
                        onClick={() => removeLaborRate(role)}
                        variant="destructive"
                        size="sm"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {LABOR_ROLES.filter(role => !formData.labor_rates[role]).map(role => (
                    <div key={role} className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder={`${role} rate`}
                        className="bg-gray-700 border-gray-600 text-white"
                        onBlur={e => {
                          const rate = parseFloat(e.target.value)
                          if (rate > 0) {
                            addLaborRate(role, rate)
                            e.target.value = ''
                          }
                        }}
                      />
                      <span className="text-gray-400 text-sm">{role}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="material_markup" className="text-gray-200">Material Markup (%)</Label>
                  <Input
                    id="material_markup"
                    type="number"
                    value={formData.material_markup_pct}
                    onChange={e => setFormData(prev => ({ ...prev, material_markup_pct: parseFloat(e.target.value) || 0 }))}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="overhead_profit" className="text-gray-200">Overhead & Profit (%)</Label>
                  <Input
                    id="overhead_profit"
                    type="number"
                    value={formData.overhead_profit_pct}
                    onChange={e => setFormData(prev => ({ ...prev, overhead_profit_pct: parseFloat(e.target.value) || 0 }))}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="tax_rate" className="text-gray-200">Sales Tax Rate (decimal, e.g., 0.08 for 8%)</Label>
                <Input
                  id="tax_rate"
                  type="number"
                  step="0.0001"
                  value={formData.tax_rate}
                  onChange={e => setFormData(prev => ({ ...prev, tax_rate: parseFloat(e.target.value) || 0 }))}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>
          )}

          {/* Step 3: Operations */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white">Operations</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="min_job_size" className="text-gray-200">Minimum Job Size ($)</Label>
                  <Input
                    id="min_job_size"
                    type="number"
                    value={formData.min_job_size}
                    onChange={e => setFormData(prev => ({ ...prev, min_job_size: parseFloat(e.target.value) || 0 }))}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="service_call_fee" className="text-gray-200">Service Call Fee ($)</Label>
                  <Input
                    id="service_call_fee"
                    type="number"
                    value={formData.service_call_fee}
                    onChange={e => setFormData(prev => ({ ...prev, service_call_fee: parseFloat(e.target.value) || 0 }))}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="payment_terms" className="text-gray-200">Payment Terms</Label>
                <Input
                  id="payment_terms"
                  value={formData.payment_terms}
                  onChange={e => setFormData(prev => ({ ...prev, payment_terms: e.target.value }))}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="50% deposit, balance on completion"
                />
              </div>

              <div>
                <Label className="text-gray-200">Equipment Owned</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={equipmentInput}
                    onChange={e => setEquipmentInput(e.target.value)}
                    onKeyPress={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addArrayItem('equipment_owned', equipmentInput)
                        setEquipmentInput('')
                      }
                    }}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="e.g., Bucket truck, Scissor lift"
                  />
                  <Button
                    onClick={() => {
                      addArrayItem('equipment_owned', equipmentInput)
                      setEquipmentInput('')
                    }}
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.equipment_owned.map((item, idx) => (
                    <span
                      key={idx}
                      className="bg-blue-900 text-blue-200 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                    >
                      {item}
                      <button
                        onClick={() => removeArrayItem('equipment_owned', idx)}
                        className="text-blue-300 hover:text-white"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-gray-200">Preferred Suppliers</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={supplierInput}
                    onChange={e => setSupplierInput(e.target.value)}
                    onKeyPress={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addArrayItem('preferred_suppliers', supplierInput)
                        setSupplierInput('')
                      }
                    }}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="e.g., Home Depot, Grainger"
                  />
                  <Button
                    onClick={() => {
                      addArrayItem('preferred_suppliers', supplierInput)
                      setSupplierInput('')
                    }}
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.preferred_suppliers.map((item, idx) => (
                    <span
                      key={idx}
                      className="bg-green-900 text-green-200 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                    >
                      {item}
                      <button
                        onClick={() => removeArrayItem('preferred_suppliers', idx)}
                        className="text-green-300 hover:text-white"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Job Types */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white">Common Job Types</h3>
              <p className="text-gray-400">What types of jobs do you typically do?</p>
              
              <div className="flex gap-2">
                <Input
                  value={jobTypeInput}
                  onChange={e => setJobTypeInput(e.target.value)}
                  onKeyPress={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addArrayItem('common_job_types', jobTypeInput)
                      setJobTypeInput('')
                    }
                  }}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="e.g., Panel upgrades, New construction wiring"
                />
                <Button
                  onClick={() => {
                    addArrayItem('common_job_types', jobTypeInput)
                    setJobTypeInput('')
                  }}
                >
                  Add
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {formData.common_job_types.map((type, idx) => (
                  <span
                    key={idx}
                    className="bg-purple-900 text-purple-200 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                  >
                    {type}
                    <button
                      onClick={() => removeArrayItem('common_job_types', idx)}
                      className="text-purple-300 hover:text-white"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: Review */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white">Review & Confirm</h3>
              <div className="bg-gray-700 p-4 rounded space-y-3 text-sm">
                <div>
                  <span className="font-semibold text-gray-300">Company:</span>{' '}
                  <span className="text-white">{formData.company_name}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-300">Trades:</span>{' '}
                  <span className="text-white">{formData.trade.join(', ')}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-300">Labor Rates:</span>{' '}
                  <span className="text-white">
                    {Object.entries(formData.labor_rates)
                      .map(([role, rate]) => `${role}: $${rate}/hr`)
                      .join(', ')}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-gray-300">Pricing:</span>{' '}
                  <span className="text-white">
                    {formData.material_markup_pct}% material markup, {formData.overhead_profit_pct}% overhead, {(formData.tax_rate * 100).toFixed(2)}% tax
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-gray-300">Job Types:</span>{' '}
                  <span className="text-white">{formData.common_job_types.join(', ') || 'None added'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-6">
            <Button onClick={handleBack} disabled={currentStep === 1} variant="outline">
              Back
            </Button>
            {currentStep < 5 ? (
              <Button onClick={handleNext}>Next</Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? 'Creating Profile...' : 'Complete Onboarding'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
