'use client';

import { useState, useRef } from 'react';
import axios from 'axios';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface LineItem {
  category: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  total: number;
  notes?: string;
}

interface Estimate {
  projectTitle: string;
  summary: string;
  lineItems: LineItem[];
  subtotal: number;
  tax: number;
  total: number;
  assumptions: string[];
  timeline: string;
}

export default function EstimatePage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hi! I\'m your AI estimator. Describe your project and I\'ll generate a detailed estimate. You can also upload photos!'
    }
  ]);
  const [input, setInput] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: input
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Call backend API
      const response = await axios.post('/api/estimates/generate', {
        description: input,
        photos,
        projectType: 'general',
        location: 'US'
      });

      const generatedEstimate = response.data.estimate;
      setEstimate(generatedEstimate);

      const aiMessage: Message = {
        role: 'assistant',
        content: `Great! I've generated an estimate for "${generatedEstimate.projectTitle}".\n\n${generatedEstimate.summary}\n\nTotal: $${generatedEstimate.total.toFixed(2)}\n\nYou can review the line items below and export to PDF.`
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error('Error generating estimate:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I had trouble generating that estimate. Can you provide more details about the project?'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Convert to base64 for sending to API
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotos(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const downloadPDF = async () => {
    if (!estimate) return;

    try {
      const response = await axios.post(
        '/api/estimates/123/pdf', // Replace with actual estimate ID
        {},
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${estimate.projectTitle}-estimate.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();

    } catch (error) {
      console.error('Error downloading PDF:', error);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Chat Panel */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b p-4 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-800">EstimatorAI</h1>
          <p className="text-sm text-gray-500">AI-Powered Construction Estimating</p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-4 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-800 shadow-md'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white rounded-lg p-4 shadow-md">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-3 h-3 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                  <div className="w-3 h-3 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Photo Preview */}
        {photos.length > 0 && (
          <div className="px-6 pb-2">
            <div className="flex gap-2 overflow-x-auto">
              {photos.map((photo, idx) => (
                <img
                  key={idx}
                  src={photo}
                  alt={`Upload ${idx + 1}`}
                  className="h-20 w-20 object-cover rounded border"
                />
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="bg-white border-t p-4 shadow-lg">
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handlePhotoUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3 rounded-lg bg-gray-200 hover:bg-gray-300 transition"
              title="Upload photos"
            >
              📷
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Describe your project..."
              className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Estimate Panel */}
      {estimate && (
        <div className="w-[500px] bg-white border-l overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{estimate.projectTitle}</h2>
                <p className="text-sm text-gray-500 mt-1">{estimate.timeline}</p>
              </div>
              <button
                onClick={downloadPDF}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                Download PDF
              </button>
            </div>

            <p className="text-gray-700 mb-6">{estimate.summary}</p>

            {/* Line Items */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Line Items</h3>
              <div className="space-y-3">
                {estimate.lineItems.map((item, idx) => (
                  <div key={idx} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                            {item.category}
                          </span>
                          <span className="font-medium">{item.description}</span>
                        </div>
                        {item.notes && (
                          <p className="text-sm text-gray-500 mt-1">{item.notes}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-bold">${item.total.toFixed(2)}</div>
                        <div className="text-xs text-gray-500">
                          {item.quantity} {item.unit} × ${item.rate}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-gray-700">
                <span>Subtotal</span>
                <span>${estimate.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Tax</span>
                <span>${estimate.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold">
                <span>Total</span>
                <span>${estimate.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Assumptions */}
            {estimate.assumptions && estimate.assumptions.length > 0 && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-semibold text-sm mb-2">Assumptions</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  {estimate.assumptions.map((assumption, idx) => (
                    <li key={idx}>• {assumption}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
