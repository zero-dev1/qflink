import { default as qf, type QfWhitelistEntry } from "./qf";
export { qf };
export type * from "./qf";
export { DigestItem, Phase, DispatchClass, TokenError, ArithmeticError, TransactionalError, BalanceStatus, TransactionPaymentEvent, CommonClaimsEvent, GrandpaEvent, StakingRewardDestination, StakingForcing, BalancesTypesReasons, TransactionPaymentReleases, Version, ClaimsStatementKind, MultiAddress, BalancesAdjustmentDirection, StakingPalletConfigOpBig, StakingPalletConfigOp, TransactionValidityUnknownTransaction, TransactionValidityTransactionSource } from './common-types';
export declare const getMetadata: (codeHash: string) => Promise<Uint8Array | null>;
export type WhitelistEntry = QfWhitelistEntry;
export type WhitelistEntriesByChain = Partial<{
    "*": WhitelistEntry[];
    qf: WhitelistEntry[];
}>;
