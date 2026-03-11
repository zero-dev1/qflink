import { getPublicClient, getWalletClient, qfChain } from './viemClient'
import { reverseResolve } from './qns'
import { parseAbi } from 'viem'

// QNS Contract addresses
const QNS_REGISTRAR_ADDRESS = (import.meta.env.VITE_QNS_REGISTRAR_ADDRESS ||
  '0x0000000000000000000000000000000000000000') as `0x${string}`

// Registrar ABI matching the actual contract
const registrarAbi = parseAbi([
  'function register(string name, uint256 durationInYears, bool permanent) payable',
  'function available(string name) view returns (bool)',
  'function price3Char() view returns (uint256)',
  'function price4Char() view returns (uint256)',
  'function price5PlusChar() view returns (uint256)',
  'function permanentMultiplier() view returns (uint256)',
])

// Hardcoded fallback prices (in wei)
function getFallbackAnnualPrice(nameLength: number): bigint {
  if (nameLength === 3) return 1000n * 10n ** 18n  // 1000 QF
  if (nameLength === 4) return 300n * 10n ** 18n   // 300 QF
  return 100n * 10n ** 18n                        // 100 QF
}

function getFallbackPermanentPrice(nameLength: number): bigint {
  return getFallbackAnnualPrice(nameLength) * 15n  // 15x multiplier
}

// Fetch price from contract by reading public variables
async function fetchPriceFromContract(
  nameLength: number, 
  durationYears: number, 
  permanent: boolean
): Promise<bigint> {
  try {
    const publicClient = getPublicClient()
    
    // Read the right price variable based on name length
    const functionName = nameLength === 3 ? 'price3Char' 
      : nameLength === 4 ? 'price4Char' 
      : 'price5PlusChar'
    
    const annualPrice = await publicClient.readContract({
      address: QNS_REGISTRAR_ADDRESS,
      abi: registrarAbi,
      functionName,
    }) as bigint
    
    if (permanent) {
      const multiplier = await publicClient.readContract({
        address: QNS_REGISTRAR_ADDRESS,
        abi: registrarAbi,
        functionName: 'permanentMultiplier',
      }) as bigint
      return annualPrice * multiplier
    }
    
    return annualPrice * BigInt(durationYears)
  } catch (error) {
    console.error('Error fetching price from contract:', error)
    // Fallback to hardcoded prices
    if (permanent) {
      return getFallbackPermanentPrice(nameLength)
    }
    return getFallbackAnnualPrice(nameLength) * BigInt(durationYears)
  }
}

export async function checkAvailability(name: string): Promise<boolean> {
  if (!name || name.length < 3) return false

  try {
    const publicClient = getPublicClient()
    const available = await publicClient.readContract({
      address: QNS_REGISTRAR_ADDRESS,
      abi: registrarAbi,
      functionName: 'available',
      args: [name],
    }) as boolean
    return available
  } catch (error) {
    console.error('Error checking availability:', error)
    throw new Error('Failed to check name availability. Please try again.')
  }
}

// Get price for display (fetches from contract with fallback)
export async function getPriceForName(
  name: string, 
  durationYears: number, 
  permanent: boolean
): Promise<bigint> {
  if (!name || name.length < 3) return 0n
  return fetchPriceFromContract(name.length, durationYears, permanent)
}

// Register a .qf name (annual or permanent)
export async function registerQFName(
  name: string, 
  durationYears: number, 
  permanent: boolean
): Promise<`0x${string}`> {
  if (!name || name.length < 3) {
    throw new Error('Name must be at least 3 characters')
  }

  const walletClient = await getWalletClient()
  const [account] = await walletClient.getAddresses()
  if (!account) {
    throw new Error('No EVM account available. Please enable Ethereum accounts in your wallet.')
  }

  const price = await fetchPriceFromContract(name.length, durationYears, permanent)

  try {
    const hash = await walletClient.writeContract({
      account,
      chain: qfChain,
      address: QNS_REGISTRAR_ADDRESS,
      abi: registrarAbi,
      functionName: 'register',
      args: [name, BigInt(durationYears), permanent],
      value: price,
    })
    return hash
  } catch (error) {
    console.error('Error registering name:', error)
    throw error
  }
}

// Check if user has already registered a name
export async function hasRegisteredName(address: string): Promise<string | null> {
  if (!address) return null
  return await reverseResolve(address)
}

// Validate name format
export function isValidName(name: string): boolean {
  if (!name || name.length < 3) return false
  // Alphanumeric + hyphens only, no leading/trailing hyphens
  return /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(name) && !name.includes('--')
}

// Get validation error message
export function getValidationError(name: string): string | null {
  if (!name || name.length < 3) return 'Name must be at least 3 characters'
  if (name.length > 63) return 'Name must be 63 characters or less'
  if (name.startsWith('-') || name.endsWith('-')) return 'Name cannot start or end with a hyphen'
  if (!/^[a-z0-9-]+$/.test(name)) return 'Name can only contain lowercase letters, numbers, and hyphens'
  if (name.includes('--')) return 'Name cannot contain consecutive hyphens'
  return null
}

// Legacy exports for backward compatibility (internal calculations only, no contract calls)
export function getPrice(name: string, isPermanent: boolean): bigint {
  if (!name || name.length < 3) return 0n
  if (isPermanent) {
    return getFallbackPermanentPrice(name.length)
  }
  return getFallbackAnnualPrice(name.length)
}

export function getAnnualPriceWithDuration(name: string, durationYears: number): bigint {
  if (!name || name.length < 3) return 0n
  return getFallbackAnnualPrice(name.length) * BigInt(durationYears)
}

// Deprecated: use getPriceForName instead
export async function getAnnualPriceFromContract(name: string): Promise<bigint> {
  return fetchPriceFromContract(name.length, 1, false)
}

// Deprecated: use getPriceForName instead  
export async function getPermanentPriceFromContract(name: string): Promise<bigint> {
  return fetchPriceFromContract(name.length, 1, true)
}

// Deprecated: use registerQFName instead
export async function registerName(name: string, durationYears: number): Promise<`0x${string}`> {
  return registerQFName(name, durationYears, false)
}

// Deprecated: use registerQFName instead
export async function registerPermanentName(name: string): Promise<`0x${string}`> {
  return registerQFName(name, 1, true)
}
