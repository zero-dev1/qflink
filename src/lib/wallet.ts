import { getInjectedExtensions, connectInjectedExtension } from "polkadot-api/pjs-signer";
import type { InjectedExtension, InjectedPolkadotAccount } from "polkadot-api/pjs-signer";
import { keccak256 } from "viem";
import { getSs58AddressInfo } from "polkadot-api";

export interface WalletConnection {
  address: string;          // SS58
  evmAddress: string;       // 0x...
  name?: string;
  walletName: string;
  signer: InjectedPolkadotAccount;
  extension: InjectedExtension;
}

let currentConnection: WalletConnection | null = null;

/**
 * Derive EVM address from SS58 address.
 * keccak256 of the 32-byte public key, last 20 bytes — same as pallet-revive.
 */
export function deriveEVMAddress(ss58Address: string): string {
  const info = getSs58AddressInfo(ss58Address);
  if (!info.isValid) throw new Error("Invalid SS58 address");
  const pubKeyHex = "0x" + Array.from(info.publicKey).map((b) => b.toString(16).padStart(2, "0")).join("");
  const hash = keccak256(pubKeyHex as `0x${string}`);
  return "0x" + hash.slice(-40);
}

export function getAvailableWallets(): string[] {
  return getInjectedExtensions();
}

export async function connectSubstrateWallet(walletName: string): Promise<WalletConnection> {
  const extension = await connectInjectedExtension(walletName);
  const accounts = extension.getAccounts();

  if (accounts.length === 0) {
    extension.disconnect();
    throw new Error(`No accounts found in ${walletName}. Please create or import an account.`);
  }

  const account = accounts[0];

  let evmAddress: string;
  try {
    evmAddress = deriveEVMAddress(account.address);
  } catch {
    throw new Error("Could not derive EVM address for account.");
  }

  currentConnection = {
    address: account.address,
    evmAddress,
    name: account.name ?? undefined,
    walletName,
    signer: account,
    extension,
  };

  return currentConnection;
}

export function getCurrentConnection(): WalletConnection | null {
  return currentConnection;
}

export function disconnectWallet(): void {
  if (currentConnection?.extension) {
    currentConnection.extension.disconnect();
  }
  currentConnection = null;
}
