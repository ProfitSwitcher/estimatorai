import { TextareaHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'
const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn('flex w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]', className)} {...props} />
  )
)
Textarea.displayName = 'Textarea'
export { Textarea }
