"use client"
import { useState, useCallback } from 'react'
interface ToastOptions { title?: string; description?: string; variant?: 'default' | 'destructive' }
export function useToast() {
  const [toasts, setToasts] = useState<ToastOptions[]>([])
  const toast = useCallback((t: ToastOptions) => {
    setToasts(prev => [...prev, t])
    setTimeout(() => setToasts(prev => prev.slice(1)), 3000)
  }, [])
  return { toast, toasts }
}
export function toast(t: ToastOptions) {
  if (t.variant === 'destructive') console.error(t.title, t.description)
  else console.log(t.title, t.description)
}
