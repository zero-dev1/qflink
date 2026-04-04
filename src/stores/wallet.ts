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

export interface WalletState {
  // Persisted
  address: string | null;       // SS58
  evmAddress: string | null;    // 0x...
  walletName: string | null;    // "talisman" | "subwallet"
  accountMapped: boolean;
  qnsName: string | null;

  // Transient
  balance: bigint;
  isConnected: boolean;
  isConnecting: boolean;
  isMappingAccount: boolean;
  walletSource: string | null;
  walletError: string | null;
  encryptionKeyPair: { publicKey: Uint8Array; secretKey: Uint8Array } | null;
  _rehydrating: boolean;

  connect: (walletType: "talisman" | "subwallet") => Promise<void>;
  disconnect: () => void;
  setBalance: (balance: bigint) => void;
  refreshBalance: () => Promise<void>;
  setEncryptionKeyPair: (kp: { publicKey: Uint8Array; secretKey: Uint8Array }) => void;
  setEvmAddress: (evmAddress: string) => void;
  refreshName: () => Promise<void>;
  clearWalletError: () => void;
}

let balanceUnsub: (() => void) | null = null;

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      address: null,
      evmAddress: null,
      walletName: null,
      accountMapped: false,
      qnsName: null,
      balance: 0n,
      isConnected: false,
      isConnecting: false,
      isMappingAccount: false,
      walletSource: null,
      walletError: null,
      encryptionKeyPair: null,
      _rehydrating: false,

      connect: async (walletType: "talisman" | "subwallet") => {
        set({ isConnecting: true, walletError: null });

        try {
          const walletId = walletType === "talisman" ? "talisman" : "subwallet-js";
          const connection = await Promise.race([
            connectSubstrateWallet(walletId),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("Wallet connection timed out after 10s.")), 10_000)
            ),
          ]);

          const ss58 = connection.address;
          const evmAddr = connection.evmAddress.toLowerCase();

          // Start balance subscription
          if (balanceUnsub) { balanceUnsub(); balanceUnsub = null; }
          try {
            const typedApi = getTypedApi();
            const sub = typedApi.query.System.Account.watchValue(ss58).subscribe({
              next(info: any) {
                set({ balance: BigInt(info.data.free.toString()) });
              },
              error() {},
            });
            balanceUnsub = () => sub.unsubscribe();

            // Also fetch initial balance
            const acct = await typedApi.query.System.Account.getValue(ss58);
            set({ balance: BigInt((acct as any).data.free.toString()) });
          } catch {}

          set({
            address: ss58,
            evmAddress: evmAddr,
            walletName: walletType,
            walletSource: walletId,
          });

          // Map account
          set({ isMappingAccount: true });
          try {
            await ensureAccountMapped(ss58);
            set({ accountMapped: true });
          } catch (mapErr: any) {
            const msg = mapErr?.message ?? "";

            if (msg === METADATA_HASH_ERROR || msg.includes("METADATA_HASH_ERROR")) {
              const onMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
              set({
                walletError: onMobile
                  ? "Disable metadata hash verification in SubWallet settings for QF Network, then reconnect."
                  : "Disable metadata hash verification in Talisman → Settings → Networks & Tokens → QF Network, then reconnect.",
                isMappingAccount: false,
                isConnecting: false,
              });
              return;
            }
            if (msg === USER_CANCELLED || msg.includes("USER_CANCELLED")) {
              set({ isMappingAccount: false, isConnecting: false });
              return;
            }
            if (msg === INSUFFICIENT_BALANCE_FOR_MAPPING || msg.includes("INSUFFICIENT_BALANCE")) {
              set({
                walletError: "Your wallet needs QF to get started. Fund your wallet and reconnect.",
                isMappingAccount: false,
                isConnecting: false,
              });
              return;
            }

            disconnectWallet();
            set({
              walletError: "Account setup incomplete — please try connecting again.",
              address: null, evmAddress: null, walletName: null,
              isMappingAccount: false, isConnecting: false,
            });
            return;
          }
          set({ isMappingAccount: false });

          // Connected — set state
          set({ isConnected: true, isConnecting: false });
          
          // Resolve QNS name in background (don't block connection)
          get().refreshName().catch(() => {});
        } catch (error: any) {
          const msg = error?.message || "";
          let walletError = msg || "Failed to connect wallet";
          if (msg.includes("No accounts found")) {
            walletError = "No accounts found. Please create an account in your wallet extension.";
          } else if (msg.includes("extension") || msg.includes("not installed") || msg.includes("Cannot read properties")) {
            const onMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
            walletError = onMobile
              ? "SubWallet not detected. Open this dApp inside SubWallet's built-in browser."
              : "Talisman not detected. Please install the Talisman browser extension.";
          }
          
          disconnectWallet();
          set({
            walletError,
            address: null, evmAddress: null, walletName: null,
            isConnected: false, isConnecting: false,
          });
        }
      },

      disconnect: () => {
        if (balanceUnsub) { balanceUnsub(); balanceUnsub = null; }
        disconnectWallet();

        set({
          address: null, evmAddress: null, balance: 0n,
          isConnected: false, walletSource: null, walletName: null,
          encryptionKeyPair: null, accountMapped: false,
          walletError: null, qnsName: null,  // ← also clear qnsName
        });

        import("./profile").then(({ useProfileStore }) => useProfileStore.getState().reset());
        // REMOVED: window.location.href redirect
      },

      setBalance: (balance) => set({ balance }),

      refreshBalance: async () => {
        const { address } = get();
        if (!address) return;
        try {
          const typedApi = getTypedApi();
          const acct = await typedApi.query.System.Account.getValue(address);
          set({ balance: BigInt((acct as any).data.free.toString()) });
        } catch {}
      },

      setEncryptionKeyPair: (kp) => set({ encryptionKeyPair: kp }),
      setEvmAddress: (evmAddress) => set({ evmAddress, accountMapped: true }),
      refreshName: async () => {
        const { evmAddress } = get();
        if (!evmAddress) return;
        try {
          const { clearNameCache, reverseResolve } = await import("@/lib/qns");
          clearNameCache(evmAddress);
          const name = await reverseResolve(evmAddress);
          set({ qnsName: name || null });
        } catch {
          // Preserve existing name on error
        }
      },

      clearWalletError: () => set({ walletError: null }),
    }),
    {
      name: "qflink-wallet-storage",
      version: 2, // bumped from 1 → 2 for qnsName + _rehydrating
      migrate: (persistedState, version) => {
        if (version < 2) return undefined as unknown as WalletState;
        return persistedState as WalletState;
      },
      partialize: (state) => ({
        address: state.address,
        evmAddress: state.evmAddress,
        walletName: state.walletName,
        accountMapped: state.accountMapped,
        qnsName: state.qnsName,
      }),
      onRehydrateStorage: () => {
        return (state) => {
          if (state?.address && state?.walletName) {
            useWalletStore.setState({ _rehydrating: true });
            const walletType = state.walletName as "talisman" | "subwallet";

            const waitForExtension = async (walletId: string, timeoutMs = 3000) => {
              const { getInjectedExtensions } = await import("polkadot-api/pjs-signer");
              const start = Date.now();
              while (Date.now() - start < timeoutMs) {
                if (getInjectedExtensions().includes(walletId)) return true;
                await new Promise(r => setTimeout(r, 150));
              }
              return false;
            };

            const walletId = walletType === "talisman" ? "talisman" : "subwallet-js";

            import("../lib/papiClient").then(({ warmUpPapi }) =>
              Promise.all([warmUpPapi(), waitForExtension(walletId)]).then(([, extensionReady]) => {
                if (!extensionReady) {
                  useWalletStore.setState({ _rehydrating: false });
                  state.disconnect();  // ← CHANGED: was just setting flags, now full cleanup
                  return;
                }
                state
                  .connect(walletType)
                  .then(() => {
                    useWalletStore.setState({ _rehydrating: false });
                  })
                  .catch(() => {
                    useWalletStore.setState({ _rehydrating: false });
                    state.disconnect();  // ← CHANGED: was just setting flags, now full cleanup
                  });
              })
            );
          }
        };
      },
    }
  )
);
