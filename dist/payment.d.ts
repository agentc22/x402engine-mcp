import { type PaymentRequirements } from "@x402/fetch";
export declare const BASE_NETWORK = "eip155:8453";
export declare const SOLANA_NETWORK = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";
export declare const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export declare const SOLANA_USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export type PaymentNetwork = "auto" | "base" | "solana";
export interface PaymentConfig {
    evmPrivateKey?: string;
    solanaPrivateKey?: string;
    network: PaymentNetwork;
    maxPaymentUsd: string;
}
export declare function loadPaymentConfig(env?: NodeJS.ProcessEnv): PaymentConfig;
export declare function usdToAtomicUnits(value: string): bigint;
export declare function selectPaymentRequirement(requirements: PaymentRequirements[], config: Pick<PaymentConfig, "network" | "maxPaymentUsd">): PaymentRequirements;
export declare function createPaymentFetch(config?: PaymentConfig, baseFetch?: typeof globalThis.fetch): Promise<typeof globalThis.fetch>;
