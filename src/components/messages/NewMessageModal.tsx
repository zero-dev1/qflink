import React, { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { isValidAddress } from '@/lib/utils'

interface NewMessageModalProps {
  isOpen: boolean
  onClose: () => void
  onSend: (recipient: string, content: string) => void
}

export const NewMessageModal: React.FC<NewMessageModalProps> = ({ isOpen, onClose, onSend }) => {
  const [recipient, setRecipient] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSend = () => {
    if (!recipient.trim()) {
      setError('Recipient address is required')
      return
    }
    if (!isValidAddress(recipient.trim())) {
      setError('Invalid address format')
      return
    }
    if (!message.trim()) {
      setError('Message cannot be empty')
      return
    }
    onSend(recipient.trim(), message.trim())
    setRecipient('')
    setMessage('')
    setError('')
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
          placeholder="5Grwva... or 0x..."
          value={recipient}
          onChange={(e) => {
            setRecipient(e.target.value)
            setError('')
          }}
          error={error && !message ? error : undefined}
        />
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
