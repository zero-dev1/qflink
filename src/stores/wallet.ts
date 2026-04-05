import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { WalletConnection } from "@/lib/wallet";
import {
  connectSubstrateWallet,
  disconnectWallet,
  getCurrentConnection,
  deriveEVMAddress,
} from "@/lib/wallet";
import {
  ensureAccountMapped,
  METADATA_HASH_ERROR,
  USER_CANCELLED,
  INSUFFICIENT_BALANCE_FOR_MAPPING,
} from "@/lib/accountMapping";
import { warmUpPapi, getTypedApi } from "@/lib/papiClient";
import { reverseResolve, clearNameCache } from "@/lib/qns";

// ─── Types ───────────────────────────────────────────────────────────

interface PersistedState {
  address: string | null;
  evmAddress: string | null;
  walletName: string | null;
  accountMapped: boolean;
  qnsName: string | null;
}

export interface WalletState extends PersistedState {
  balance: bigint;
  isConnected: boolean;
  isConnecting: boolean;
  walletError: string | null;

  connect: (walletType: "talisman" | "subwallet") => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  refreshName: () => Promise<void>;
  clearWalletError: () => void;
}

// ─── Balance subscription handle ─────────────────────────────────────

let balanceUnsub: (() => void) | null = null;

function startBalanceSubscription(ss58: string, set: (s: Partial<WalletState>) => void) {
  if (balanceUnsub) {
    balanceUnsub();
    balanceUnsub = null;
  }
  try {
    const typedApi = getTypedApi();

    // Fetch initial balance
    typedApi.query.System.Account.getValue(ss58).then((acct: any) => {
      set({ balance: BigInt(acct.data.free.toString()) });
    }).catch(() => {});

    // Subscribe to updates
    const sub = typedApi.query.System.Account.watchValue(ss58).subscribe({
      next(info: any) {
        set({ balance: BigInt(info.data.free.toString()) });
      },
      error() {},
    });
    balanceUnsub = () => sub.unsubscribe();
  } catch {}
}

// ─── Store ───────────────────────────────────────────────────────────

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      // Persisted
      address: null,
      evmAddress: null,
      walletName: null,
      accountMapped: false,
      qnsName: null,

      // Transient
      balance: 0n,
      isConnected: false,
      isConnecting: false,
      walletError: null,

      connect: async (walletType) => {
        set({ isConnecting: true, walletError: null });

        try {
          const walletId = walletType === "talisman" ? "talisman" : "subwallet-js";

          const connection = await Promise.race([
            connectSubstrateWallet(walletId),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("Wallet connection timed out.")), 10_000)
            ),
          ]);

          const ss58 = connection.address;
          const evmAddr = connection.evmAddress.toLowerCase();

          set({
            address: ss58,
            evmAddress: evmAddr,
            walletName: walletType,
          });

          // Start balance subscription
          startBalanceSubscription(ss58, set);

          // Map account (required for contract interactions)
          try {
            await ensureAccountMapped(ss58);
            set({ accountMapped: true });
          } catch (mapErr: any) {
            const msg = mapErr?.message ?? "";
            const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

            if (msg === METADATA_HASH_ERROR || msg.includes("METADATA_HASH_ERROR")) {
              set({
                walletError: isMobile
                  ? "Disable metadata hash verification in SubWallet settings for QF Network, then reconnect."
                  : "Disable metadata hash verification in Talisman → Settings → Networks & Tokens → QF Network, then reconnect.",
                isConnecting: false,
              });
              return;
            }
            if (msg === USER_CANCELLED || msg.includes("USER_CANCELLED")) {
              set({ isConnecting: false });
              return;
            }
            if (msg === INSUFFICIENT_BALANCE_FOR_MAPPING || msg.includes("INSUFFICIENT_BALANCE")) {
              set({
                walletError: "Your wallet needs QF to get started. Fund your wallet and reconnect.",
                isConnecting: false,
              });
              return;
            }

            disconnectWallet();
            set({
              walletError: "Account setup incomplete — please try connecting again.",
              address: null,
              evmAddress: null,
              walletName: null,
              isConnecting: false,
            });
            return;
          }

          // Success
          set({ isConnected: true, isConnecting: false });

          // Mark getting started step
          try {
            const { useGettingStartedStore } = await import('@/stores/gettingStarted');
            useGettingStartedStore.getState().markStep('hasConnected');
          } catch {}

          // Resolve QNS name in background
          get().refreshName().catch(() => {});

        } catch (error: any) {
          const msg = error?.message || "";
          const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

          let walletError = msg || "Failed to connect wallet";
          if (msg.includes("No accounts found")) {
            walletError = "No accounts found. Please create an account in your wallet extension.";
          } else if (msg.includes("extension") || msg.includes("not installed") || msg.includes("Cannot read properties")) {
            walletError = isMobile
              ? "SubWallet not detected. Open this dApp inside SubWallet's built-in browser."
              : "Talisman not detected. Please install the Talisman browser extension.";
          }

          disconnectWallet();
          set({
            walletError,
            address: null,
            evmAddress: null,
            walletName: null,
            isConnected: false,
            isConnecting: false,
          });
        }
      },

      disconnect: () => {
        if (balanceUnsub) {
          balanceUnsub();
          balanceUnsub = null;
        }
        disconnectWallet();
        set({
          address: null,
          evmAddress: null,
          balance: 0n,
          isConnected: false,
          walletName: null,
          accountMapped: false,
          walletError: null,
          qnsName: null,
        });
      },

      refreshBalance: async () => {
        const { address } = get();
        if (!address) return;
        try {
          const typedApi = getTypedApi();
          const acct = await typedApi.query.System.Account.getValue(address);
          set({ balance: BigInt((acct as any).data.free.toString()) });
        } catch {}
      },

      refreshName: async () => {
        const { evmAddress } = get();
        if (!evmAddress) return;
        try {
          clearNameCache(evmAddress);
          const name = await reverseResolve(evmAddress);
          set({ qnsName: name || null });
        } catch {}
      },

      clearWalletError: () => set({ walletError: null }),
    }),
    {
      name: "qflink-wallet-storage",
      version: 3,
      migrate: () => undefined as unknown as WalletState,
      partialize: (state): PersistedState => ({
        address: state.address,
        evmAddress: state.evmAddress,
        walletName: state.walletName,
        accountMapped: state.accountMapped,
        qnsName: state.qnsName,
      }),
      onRehydrateStorage: () => {
        return (state) => {
          if (!state?.address || !state?.walletName) return;

          const walletType = state.walletName as "talisman" | "subwallet";

          // QNS gold standard: warmUpPapi → connect → on fail, disconnect
          warmUpPapi()
            .then(() => state.connect(walletType))
            .catch(() => state.disconnect());
        };
      },
    }
  )
);
