import React, { useState, useEffect, useRef } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { isValidAddress } from '@/lib/utils'
import { resolveQFName, isQFName, normalizeQFName } from '@/lib/qns'
import { truncateAddress } from '@/lib/utils'

interface NewMessageModalProps {
  isOpen: boolean
  onClose: () => void
  onSend: (recipient: string, content: string) => void
}

export const NewMessageModal: React.FC<NewMessageModalProps> = ({ isOpen, onClose, onSend }) => {
  const [recipient, setRecipient] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null)
  const [resolutionStatus, setResolutionStatus] = useState<'idle' | 'resolving' | 'success' | 'error'>('idle')
  const [resolutionError, setResolutionError] = useState('')
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Clear any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Reset state
    setResolvedAddress(null)
    setResolutionStatus('idle')
    setResolutionError('')

    const trimmed = recipient.trim()
    if (!trimmed) return

    // Already a valid address - no resolution needed
    if (isValidAddress(trimmed)) {
      setResolvedAddress(trimmed)
      setResolutionStatus('success')
      return
    }

    // Use shared helper to normalize QF name (auto-append .qf if needed)
    const nameToResolve = normalizeQFName(trimmed)
    if (!nameToResolve) {
      setResolutionStatus('error')
      setResolutionError('Invalid input')
      return
    }
    
    setResolutionStatus('resolving')
    
    // Debounce the resolution
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const addr = await resolveQFName(nameToResolve)
        if (addr) {
          setResolvedAddress(addr)
          setResolutionStatus('success')
          setResolutionError('')
        } else {
          setResolvedAddress(null)
          setResolutionStatus('error')
          setResolutionError('Name not found')
        }
      } catch {
        setResolvedAddress(null)
        setResolutionStatus('error')
        setResolutionError('Name not found')
      }
    }, 500)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [recipient])

  const handleSend = () => {
    const trimmedRecipient = recipient.trim()
    if (!trimmedRecipient) {
      setError('Recipient address is required')
      return
    }

    // Determine the actual address to send to
    const finalAddress = trimmedRecipient.startsWith('0x')
      ? trimmedRecipient
      : resolvedAddress

    if (!finalAddress || !finalAddress.startsWith('0x')) {
      setError('Please enter a valid address or .qf name')
      return
    }

    if (!message.trim()) {
      setError('Message cannot be empty')
      return
    }
    onSend(finalAddress, message.trim())
    setRecipient('')
    setMessage('')
    setError('')
    setResolvedAddress(null)
    setResolutionStatus('idle')
    setResolutionError('')
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="New Message"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSend}>Send</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input
          label="Recipient Address"
          placeholder="quantums.qf, 5Grwva... or 0x..."
          value={recipient}
          onChange={(e) => {
            setRecipient(e.target.value)
            setError('')
          }}
          error={error && !message ? error : undefined}
        />
        {/* Resolution status display */}
        {resolutionStatus === 'resolving' && (
          <p className="text-xs text-qx-text-muted">Resolving...</p>
        )}
        {!recipient.trim().startsWith('0x') && resolvedAddress && (
          <p className="text-sm text-[#0991B2]">
            {recipient.trim()} → {resolvedAddress.slice(0, 6)}...{resolvedAddress.slice(-4)}
          </p>
        )}
        {resolutionStatus === 'error' && (
          <p className="text-xs text-red-500">Could not resolve name</p>
        )}
        <Textarea
          label="Message"
          placeholder="Type your message..."
          value={message}
          onChange={(e) => {
            setMessage(e.target.value)
            setError('')
          }}
          error={error && message ? error : undefined}
        />
      </div>
    </Modal>
  )
}
