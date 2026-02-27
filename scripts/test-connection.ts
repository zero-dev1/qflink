/**
 * Test connection to QF Network nodes.
 * Run with: npx tsx scripts/test-connection.ts
 */
import { ApiPromise, WsProvider } from '@polkadot/api'

const NETWORKS = {
  local:   { url: 'ws://127.0.0.1:9944',        label: 'Local Dev' },
  testnet: { url: 'wss://test.qfnetwork.xyz',    label: 'Testnet' },
  mainnet: { url: 'wss://rpc.qfnetwork.xyz',     label: 'Mainnet' },
} as const

async function testConnection(url: string, label: string): Promise<boolean> {
  console.log(`\n--- ${label} ---`)
  console.log(`Connecting to ${url}...`)

  try {
    const provider = new WsProvider(url, false)
    // Attempt connection with 5s timeout
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Connection timeout (5s)')), 5000)
      provider.on('connected', () => { clearTimeout(timer); resolve() })
      provider.on('error', () => { clearTimeout(timer); reject(new Error('WebSocket error')) })
      provider.connect()
    })

    const api = await ApiPromise.create({ provider, noInitWarn: true })

    const [chain, version, properties] = await Promise.all([
      api.rpc.system.chain(),
      api.rpc.system.version(),
      api.rpc.system.properties(),
    ])

    console.log(`  Chain:      ${chain}`)
    console.log(`  Version:    ${version}`)
    console.log(`  Token:      ${properties.tokenSymbol.unwrapOr('QF')}`)
    console.log(`  Decimals:   ${properties.tokenDecimals.unwrapOr(18)}`)

    // Check latest block
    const header = await api.rpc.chain.getHeader()
    const blockNum = header.number.toNumber()
    console.log(`  Block:      #${blockNum}`)

    // Test balance query with Alice dev address
    const testAddr = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
    const { data } = await api.query.system.account(testAddr) as any
    const free = BigInt(data.free.toString())
    const decimals = 18
    const display = Number(free) / 10 ** decimals
    console.log(`  Alice bal:  ${display.toFixed(4)} QF`)
    console.log(`  ✓ Connected!`)

    await api.disconnect()
    return true
  } catch (err: any) {
    console.error(`  ✗ FAILED: ${err.message}`)
    return false
  }
}

async function main() {
  console.log('QF Network Connection Test')
  console.log('==========================')

  const target = process.argv[2] as keyof typeof NETWORKS | undefined
  const toTest = target && NETWORKS[target]
    ? { [target]: NETWORKS[target] }
    : NETWORKS

  const results: Record<string, boolean> = {}
  for (const [key, net] of Object.entries(toTest)) {
    results[key] = await testConnection(net.url, net.label)
  }

  console.log('\n--- Summary ---')
  for (const [key, ok] of Object.entries(results)) {
    console.log(`  ${key.padEnd(8)} ${ok ? '✓ OK' : '✗ FAILED'}`)
  }

  const anyOk = Object.values(results).some(Boolean)
  process.exit(anyOk ? 0 : 1)
}

main()
