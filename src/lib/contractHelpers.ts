import { encodeFunctionData, decodeFunctionResult } from "viem";
import { Binary } from "polkadot-api";
import { getTypedApi, getFreshBlockHash, warmUpPapi } from "./papiClient";
import { getCurrentConnection } from "./wallet";
import { ensureAccountMapped } from "./accountMapping";

export interface TxResult {
  txHash: string;
  confirmation: Promise<{ confirmed: boolean; error?: string }>;
}

// Any valid SS58 address for read-only calls (the deployer address works)
const READ_CALLER_SS58 = "5FbmtGERRp4MhuwojmA2XGWghZ7XSNBLCUKQCrTVRz8bVGrU";

// ─── Read path ────────────────────────────────────────────────────────

export async function callContract<T = any>(
  contractAddress: string,
  abi: any[],
  functionName: string,
  args: any[] = []
): Promise<T> {
  const data = encodeFunctionData({ abi, functionName, args });
  const typedApi = getTypedApi();

  const callResult = await typedApi.apis.ReviveApi.call(
    READ_CALLER_SS58,
    Binary.fromHex(contractAddress),
    0n,
    undefined,
    undefined,
    Binary.fromHex(data)
  );

  const inner = callResult.result;
  let returnBytes: Uint8Array | string | null = null;

  // Parse result — PAPI's return type varies between versions
  if (inner && typeof inner === "object" && "success" in inner) {
    if (inner.success && inner.value?.data) {
      const d = inner.value.data;
      if (d instanceof Uint8Array) returnBytes = d;
      else if (d && typeof (d as any).asBytes === "function") returnBytes = (d as any).asBytes();
      else if (d && typeof (d as any).asHex === "function") returnBytes = (d as any).asHex();
      else returnBytes = d as any;
    } else if (!inner.success) {
      throw new Error(`Contract call reverted: ${functionName}`);
    }
  }

  if (!returnBytes && inner && typeof inner === "object") {
    if ("Ok" in inner && (inner as any).Ok?.data) {
      returnBytes = (inner as any).Ok.data;
    } else if ("Err" in inner) {
      throw new Error(`Contract error: ${functionName}`);
    }
  }

  if (!returnBytes && (callResult as any)?.data) {
    returnBytes = (callResult as any).data;
  }

  if (!returnBytes) {
    throw new Error(`No return data from ${functionName}. Raw: ${JSON.stringify(callResult).slice(0, 300)}`);
  }

  let hex: `0x${string}`;
  if (returnBytes instanceof Uint8Array) {
    hex = Binary.fromBytes(returnBytes).asHex() as `0x${string}`;
  } else if (typeof returnBytes === "string") {
    hex = (returnBytes.startsWith("0x") ? returnBytes : "0x" + returnBytes) as `0x${string}`;
  } else if (returnBytes && typeof (returnBytes as any).asHex === "function") {
    hex = (returnBytes as any).asHex() as `0x${string}`;
  } else if (returnBytes && typeof (returnBytes as any).toHex === "function") {
    hex = (returnBytes as any).toHex() as `0x${string}`;
  } else {
    throw new Error(`Cannot convert return data to hex for ${functionName}`);
  }

  return decodeFunctionResult({ abi, functionName, data: hex }) as T;
}

// ─── Write path ───────────────────────────────────────────────────────

export async function writeContract(
  contractAddress: string,
  abi: any[],
  functionName: string,
  args: any[],
  value: bigint = 0n,
  verifyOnChain?: () => Promise<boolean>
): Promise<TxResult> {
  let connection = getCurrentConnection();
  if (!connection) {
    // Try silent re-connect from persisted state
    try {
      const { useWalletStore } = await import("@/stores/wallet");
      const walletName = useWalletStore.getState().walletName;
      if (walletName) {
        const { connectSubstrateWallet } = await import("./wallet");
        await connectSubstrateWallet(walletName === "talisman" ? "talisman" : "subwallet-js");
        connection = getCurrentConnection();
        if (connection) await warmUpPapi();
      }
    } catch {}
    if (!connection) {
      throw new Error("Wallet not connected. Please disconnect and reconnect your wallet.");
    }
  }

  try {
    await ensureAccountMapped(connection.address);
  } catch (mapErr: any) {
    const msg = mapErr?.message ?? "";
    if (msg.includes("CannotLookup")) {
      throw new Error(
        "CheckMetadataHash error: disable this in Talisman → Settings → Networks & Tokens → QF Network → uncheck metadata hash verification. Then reconnect."
      );
    }
    throw new Error("Account mapping failed. Please disconnect and reconnect your wallet.");
  }

  const data = encodeFunctionData({ abi, functionName, args });
  const typedApi = getTypedApi();

  // Gas estimation via dry run
  let gasLimit = { ref_time: 200_000_000_000n, proof_size: 10_000_000n };
  let storageDeposit = 0n;

  try {
    const dryRun = await typedApi.apis.ReviveApi.call(
      connection.address,
      Binary.fromHex(contractAddress),
      value,
      undefined,
      undefined,
      Binary.fromHex(data)
    );
    const d = dryRun as any;
    if (d.gas_required) {
      gasLimit = {
        ref_time: (d.gas_required.ref_time * 130n) / 100n,
        proof_size: (d.gas_required.proof_size * 130n) / 100n,
      };
    }
    if (d.storage_deposit?.value) storageDeposit = d.storage_deposit.value;
  } catch {}

  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (attempt > 1) {
      try {
        const retryDryRun = await typedApi.apis.ReviveApi.call(
          connection.address, Binary.fromHex(contractAddress),
          value, undefined, undefined, Binary.fromHex(data)
        );
        const rd = retryDryRun as any;
        if (rd.gas_required) {
          gasLimit = {
            ref_time: (rd.gas_required.ref_time * 110n) / 100n,
            proof_size: (rd.gas_required.proof_size * 110n) / 100n,
          };
        }
        if (rd.storage_deposit?.value) storageDeposit = rd.storage_deposit.value;
      } catch {}
    }

    const tx = typedApi.tx.Revive.call({
      dest: Binary.fromHex(contractAddress),
      value,
      gas_limit: gasLimit,
      storage_deposit_limit: storageDeposit,
      data: Binary.fromHex(data),
    });

    let freshAt: string | "finalized" = "finalized";
    try {
      freshAt = await getFreshBlockHash();
    } catch {}

    try {
      const result = await new Promise<TxResult>((resolveResult, rejectResult) => {
        let broadcastReceived = false;
        let confirmationResolve: (v: { confirmed: boolean; error?: string }) => void;
        const confirmationPromise = new Promise<{ confirmed: boolean; error?: string }>((res) => {
          confirmationResolve = res;
        });

        const signingTimeout = setTimeout(() => {
          if (!broadcastReceived) rejectResult(new Error("Transaction signing timed out. Please try again."));
        }, 30_000);

        let confirmationTimeout: ReturnType<typeof setTimeout> | null = null;
        let confirmationResolved = false;

        const resolveConfirmation = (v: { confirmed: boolean; error?: string }) => {
          if (confirmationResolved) return;
          confirmationResolved = true;
          confirmationResolve(v);
          setTimeout(() => { try { subscription.unsubscribe(); } catch {} }, 100);
        };

        const subscription = tx.signSubmitAndWatch(connection!.signer.polkadotSigner, {
          at: freshAt,
          mortality: { mortal: true, period: 128 },
        }).subscribe({
          next(ev: any) {
            if (ev.type === "broadcasted") {
              broadcastReceived = true;
              clearTimeout(signingTimeout);
              resolveResult({ txHash: ev.txHash, confirmation: confirmationPromise });
              confirmationTimeout = setTimeout(async () => {
                if (verifyOnChain) {
                  try {
                    const ok = await verifyOnChain();
                    resolveConfirmation({ confirmed: ok, error: ok ? undefined : "not_confirmed" });
                  } catch {
                    resolveConfirmation({ confirmed: false, error: "verification_failed" });
                  }
                } else {
                  resolveConfirmation({ confirmed: false, error: "not_confirmed" });
                }
              }, 30_000);
              return;
            }
            if (ev.type === "txBestBlocksState" && ev.found) {
              if (confirmationTimeout) clearTimeout(confirmationTimeout);
              resolveConfirmation(ev.ok ? { confirmed: true } : { confirmed: false, error: ev.dispatchError?.type });
              return;
            }
            if (ev.type === "finalized") {
              if (confirmationTimeout) clearTimeout(confirmationTimeout);
              resolveConfirmation(ev.ok ? { confirmed: true } : { confirmed: false, error: ev.dispatchError?.type ?? "Transaction reverted" });
              return;
            }
          },
          error(err: any) {
            if (!broadcastReceived) {
              clearTimeout(signingTimeout);
              try { subscription.unsubscribe(); } catch {}
              rejectResult(err);
            } else {
              if (confirmationTimeout) clearTimeout(confirmationTimeout);
              resolveConfirmation({ confirmed: false, error: err?.message || "Subscription error" });
            }
          },
        });
      });

      return result;
    } catch (err: any) {
      const msg = err?.message ?? "";
      if (msg.includes("Cancelled") || msg.includes("Rejected") || msg.includes("cancelled") || msg.includes("rejected")) {
        throw new Error("Transaction rejected by user");
      }
      if (msg.includes("CannotLookup")) {
        throw new Error("CheckMetadataHash error: disable this in Talisman → Settings → Networks & Tokens → QF Network.");
      }
      const isRetriable = msg.includes("BadProof") || msg.includes("OutOfGas") || msg.includes("reverted") || msg.includes("AncientBirthBlock") || msg.includes("ExhaustsResources");
      if (isRetriable && attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      throw new Error(`Transaction failed: ${msg}`);
    }
  }

  throw new Error("Transaction failed after retry");
}
