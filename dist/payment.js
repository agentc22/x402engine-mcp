import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm";
import { ExactSvmScheme } from "@x402/svm";
import { createKeyPairSignerFromBytes, createKeyPairSignerFromPrivateKeyBytes, getBase58Codec, } from "@solana/kit";
import { privateKeyToAccount } from "viem/accounts";
export const BASE_NETWORK = "eip155:8453";
export const SOLANA_NETWORK = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";
export const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export const SOLANA_USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
function parseNetwork(value) {
    const network = (value || "auto").toLowerCase();
    if (network === "auto" || network === "base" || network === "solana") {
        return network;
    }
    throw new Error("X402_PAYMENT_NETWORK must be auto, base, or solana");
}
export function loadPaymentConfig(env = process.env) {
    return {
        evmPrivateKey: env.X402_EVM_PRIVATE_KEY,
        solanaPrivateKey: env.X402_SOLANA_PRIVATE_KEY,
        network: parseNetwork(env.X402_PAYMENT_NETWORK),
        maxPaymentUsd: env.X402_MAX_PAYMENT_USD || "1.00",
    };
}
export function usdToAtomicUnits(value) {
    const match = /^(\d+)(?:\.(\d{1,6}))?$/.exec(value);
    if (!match) {
        throw new Error("X402_MAX_PAYMENT_USD must be a non-negative USD amount with at most 6 decimals");
    }
    return BigInt(match[1]) * 1000000n + BigInt((match[2] || "").padEnd(6, "0"));
}
function isKnownUsdc(requirement) {
    if (requirement.network === BASE_NETWORK) {
        return requirement.asset.toLowerCase() === BASE_USDC.toLowerCase();
    }
    if (requirement.network === SOLANA_NETWORK) {
        return requirement.asset === SOLANA_USDC;
    }
    return false;
}
export function selectPaymentRequirement(requirements, config) {
    const maxAmount = usdToAtomicUnits(config.maxPaymentUsd);
    const allowedNetworks = config.network === "base"
        ? [BASE_NETWORK]
        : config.network === "solana"
            ? [SOLANA_NETWORK]
            : [BASE_NETWORK, SOLANA_NETWORK];
    const supported = requirements.filter((requirement) => requirement.scheme === "exact" &&
        allowedNetworks.includes(requirement.network) &&
        isKnownUsdc(requirement));
    if (supported.length === 0) {
        throw new Error(`No supported ${config.network} USDC payment option was offered`);
    }
    const affordable = supported.filter((requirement) => {
        return BigInt(requirement.amount) <= maxAmount;
    });
    if (affordable.length === 0) {
        const cheapest = supported.reduce((lowest, requirement) => {
            return BigInt(requirement.amount) < BigInt(lowest.amount) ? requirement : lowest;
        });
        throw new Error(`Payment of $${(Number(cheapest.amount) / 1_000_000).toFixed(6)} exceeds X402_MAX_PAYMENT_USD=${config.maxPaymentUsd}`);
    }
    return affordable[0];
}
function parseEvmKey(value) {
    if (!/^0x[0-9a-fA-F]{64}$/.test(value)) {
        throw new Error("X402_EVM_PRIVATE_KEY must be a 32-byte 0x-prefixed private key");
    }
    return value;
}
function parseSolanaKey(value) {
    if (value.trim().startsWith("[")) {
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed) ||
            ![32, 64].includes(parsed.length) ||
            parsed.some((item) => !Number.isInteger(item) || item < 0 || item > 255)) {
            throw new Error("X402_SOLANA_PRIVATE_KEY JSON must contain 32 or 64 byte values");
        }
        return Uint8Array.from(parsed);
    }
    const bytes = Uint8Array.from(getBase58Codec().encode(value));
    if (bytes.length !== 32 && bytes.length !== 64) {
        throw new Error("X402_SOLANA_PRIVATE_KEY must decode to a 32 or 64 byte key");
    }
    return bytes;
}
export async function createPaymentFetch(config = loadPaymentConfig(), baseFetch = globalThis.fetch) {
    const useBase = config.network !== "solana" && Boolean(config.evmPrivateKey);
    const useSolana = config.network !== "base" && Boolean(config.solanaPrivateKey);
    if (!useBase && !useSolana) {
        if (config.network === "base") {
            throw new Error("X402_PAYMENT_NETWORK=base requires X402_EVM_PRIVATE_KEY");
        }
        if (config.network === "solana") {
            throw new Error("X402_PAYMENT_NETWORK=solana requires X402_SOLANA_PRIVATE_KEY");
        }
        return baseFetch;
    }
    const client = new x402Client((_version, requirements) => selectPaymentRequirement(requirements, config));
    if (useBase) {
        const account = privateKeyToAccount(parseEvmKey(config.evmPrivateKey));
        client.register(BASE_NETWORK, new ExactEvmScheme(account));
    }
    if (useSolana) {
        const bytes = parseSolanaKey(config.solanaPrivateKey);
        const signer = bytes.length === 32
            ? await createKeyPairSignerFromPrivateKeyBytes(bytes)
            : await createKeyPairSignerFromBytes(bytes);
        client.register(SOLANA_NETWORK, new ExactSvmScheme(signer));
    }
    return wrapFetchWithPayment(baseFetch, client);
}
//# sourceMappingURL=payment.js.map