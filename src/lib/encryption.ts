import nacl from 'tweetnacl'
import { decodeUTF8, encodeUTF8, encodeBase64, decodeBase64 } from 'tweetnacl-util'
import { keccak256, toHex } from 'viem'

export interface EncryptionKeyPair {
  publicKey: Uint8Array
  secretKey: Uint8Array
}

export async function generateEncryptionKeyPair(
  signMessage: (message: string) => Promise<Uint8Array>,
  address: string
): Promise<EncryptionKeyPair> {
  const message = `QFLink encryption key generation for ${address}`
  const signature = await signMessage(message)

  const hashBuffer = await crypto.subtle.digest('SHA-256', signature.buffer as ArrayBuffer)
  const seed = new Uint8Array(hashBuffer)

  const keyPair = nacl.box.keyPair.fromSecretKey(seed)
  return {
    publicKey: keyPair.publicKey,
    secretKey: keyPair.secretKey,
  }
}

export function encryptMessage(
  message: string,
  recipientPublicKey: Uint8Array,
  senderSecretKey: Uint8Array
): Uint8Array {
  const messageBytes = decodeUTF8(message)
  const nonce = nacl.randomBytes(nacl.box.nonceLength)
  const encrypted = nacl.box(messageBytes, nonce, recipientPublicKey, senderSecretKey)

  if (!encrypted) {
    throw new Error('Encryption failed')
  }

  const fullMessage = new Uint8Array(nonce.length + encrypted.length)
  fullMessage.set(nonce)
  fullMessage.set(encrypted, nonce.length)

  return fullMessage
}

export function decryptMessage(
  encryptedData: Uint8Array,
  senderPublicKey: Uint8Array,
  recipientSecretKey: Uint8Array
): string {
  const nonce = encryptedData.slice(0, nacl.box.nonceLength)
  const ciphertext = encryptedData.slice(nacl.box.nonceLength)

  const decrypted = nacl.box.open(ciphertext, nonce, senderPublicKey, recipientSecretKey)

  if (!decrypted) {
    throw new Error('Decryption failed - invalid key or corrupted message')
  }

  return encodeUTF8(decrypted)
}

export function publicKeyToBase64(publicKey: Uint8Array): string {
  return encodeBase64(publicKey)
}

export function base64ToPublicKey(base64: string): Uint8Array {
  return decodeBase64(base64)
}

export interface ContentStore {
  put(hash: string, data: Uint8Array): Promise<void>
  get(hash: string): Promise<Uint8Array | null>
  has(hash: string): Promise<boolean>
}

class LocalContentStore implements ContentStore {
  private readonly prefix = 'qflink-content-'

  async put(hash: string, data: Uint8Array): Promise<void> {
    try {
      const base64 = encodeBase64(data)
      localStorage.setItem(this.prefix + hash, base64)
    } catch (err) {
      console.error('Failed to store content:', err)
      throw new Error('Content storage failed')
    }
  }

  async get(hash: string): Promise<Uint8Array | null> {
    try {
      const base64 = localStorage.getItem(this.prefix + hash)
      if (!base64) return null
      return decodeBase64(base64)
    } catch (err) {
      console.error('Failed to retrieve content:', err)
      return null
    }
  }

  async has(hash: string): Promise<boolean> {
    return localStorage.getItem(this.prefix + hash) !== null
  }
}

export const contentStore: ContentStore = new LocalContentStore()

export function hashContent(data: Uint8Array): string {
  return keccak256(data)
}

export async function encryptDirectMessage(
  plaintext: string,
  recipientPublicKey: Uint8Array,
  senderSecretKey: Uint8Array
): Promise<{ contentHash: string; nonce: Uint8Array; encrypted: Uint8Array }> {
  const messageBytes = decodeUTF8(plaintext)
  const nonce = nacl.randomBytes(nacl.box.nonceLength)
  const encrypted = nacl.box(messageBytes, nonce, recipientPublicKey, senderSecretKey)

  if (!encrypted) {
    throw new Error('Encryption failed')
  }

  const contentHash = hashContent(encrypted)
  await contentStore.put(contentHash, encrypted)

  return { contentHash, nonce, encrypted }
}

export async function decryptDirectMessage(
  contentHash: string,
  nonce: Uint8Array,
  senderPublicKey: Uint8Array,
  recipientSecretKey: Uint8Array
): Promise<string> {
  const encrypted = await contentStore.get(contentHash)
  if (!encrypted) {
    throw new Error('Content not found in storage')
  }

  const decrypted = nacl.box.open(encrypted, nonce, senderPublicKey, recipientSecretKey)
  if (!decrypted) {
    throw new Error('Decryption failed - invalid key or corrupted message')
  }

  return encodeUTF8(decrypted)
}

export async function deriveEncryptionKeypair(
  signMessage: (message: string) => Promise<Uint8Array>
): Promise<EncryptionKeyPair> {
  const message = 'QFLink Encryption Key Derivation v1'
  const signature = await signMessage(message)
  const seed = signature.slice(0, 32)
  const keyPair = nacl.box.keyPair.fromSecretKey(seed)
  return {
    publicKey: keyPair.publicKey,
    secretKey: keyPair.secretKey,
  }
}
