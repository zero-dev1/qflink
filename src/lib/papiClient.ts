import { createClient, type PolkadotClient, type TypedApi } from "polkadot-api";
import { getWsProvider } from "polkadot-api/ws-provider";
import { qf } from "@polkadot-api/descriptors";

const QF_WS_URL = import.meta.env.VITE_WS_URL || "wss://mainnet.qfnode.net";

let client: PolkadotClient | null = null;
let typedApi: TypedApi<typeof qf> | null = null;

export function getClient(): PolkadotClient {
  if (!client) {
    client = createClient(getWsProvider(QF_WS_URL));
  }
  return client;
}

export function getTypedApi(): TypedApi<typeof qf> {
  if (!typedApi) {
    typedApi = getClient().getTypedApi(qf);
  }
  return typedApi;
}

export function destroyClient(): void {
  if (client) {
    client.destroy();
    client = null;
    typedApi = null;
  }
}

/**
 * Fetch a fresh finalized block hash via a one-shot RPC call.
 *
 * QF Network's WS doesn't reliably push new-head events, so PAPI's
 * internal best-block goes stale. client._request() bypasses the
 * subscription system entirely. 5s timeout ensures we never block signing.
 * Fallback is "finalized" (NOT "best" — "best" caused AncientBirthBlock).
 */
export async function getFreshBlockHash(): Promise<string> {
  const c = getClient();
  try {
    const hash = await Promise.race([
      c._request<string>("chain_getFinalizedHead", []),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("getFreshBlockHash timed out")), 5000)
      ),
    ]);
    if (typeof hash === "string" && hash.startsWith("0x")) return hash;
    return "finalized";
  } catch (e) {
    console.warn("[papiClient] getFreshBlockHash failed, falling back to 'finalized'", e);
    return "finalized";
  }
}

/**
 * Wait for PAPI to process at least one block header.
 *
 * Without this, PAPI's nonce tracker isn't ready and transactions get
 * BadProof. Uses bestBlocks$ (not finalizedBlock$ — GRANDPA lags).
 * 3s timeout resolves gracefully so callers can proceed.
 */
let _papiWarmedUp = false;

export async function warmUpPapi(): Promise<void> {
  if (_papiWarmedUp) return;
  const c = getClient();
  try {
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        console.warn("[papiClient] warmUpPapi timed out after 3s — proceeding anyway");
        resolve();
      }, 3000);
      const sub = c.bestBlocks$.subscribe({
        next() {
          _papiWarmedUp = true;
          clearTimeout(timeout);
          sub.unsubscribe();
          resolve();
        },
        error() {
          clearTimeout(timeout);
          resolve();
        },
      });
    });
  } catch {
    console.warn("[papiClient] warmUpPapi failed — proceeding anyway");
  }
}

/**
 * Watch connection status for the network store / health indicator.
 */
export function watchConnectionStatus(callback: (connected: boolean) => void) {
  const c = getClient();
  let lastSeen = Date.now();
  const sub = c.finalizedBlock$.subscribe({
    next() {
      lastSeen = Date.now();
      callback(true);
    },
    error() {
      callback(false);
    },
  });
  const interval = setInterval(() => {
    if (Date.now() - lastSeen > 30000) callback(false);
  }, 10000);
  return () => {
    sub.unsubscribe();
    clearInterval(interval);
  };
}
