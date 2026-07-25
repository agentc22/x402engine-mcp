import { describe, expect, it, vi } from "vitest";
import type { PaymentRequirements } from "@x402/fetch";
import {
  BASE_NETWORK,
  BASE_USDC,
  SOLANA_NETWORK,
  SOLANA_USDC,
  createPaymentFetch,
  loadPaymentConfig,
  selectPaymentRequirement,
  usdToAtomicUnits,
} from "../src/payment.js";

function requirement(
  network: string,
  asset: string,
  amount = "1000",
): PaymentRequirements {
  return {
    scheme: "exact",
    network,
    amount,
    asset,
    payTo: network.startsWith("eip155:") ? "0x0000000000000000000000000000000000000001" : "11111111111111111111111111111111",
    maxTimeoutSeconds: 60,
  };
}

describe("payment configuration", () => {
  it("defaults to automatic network selection with a one dollar cap", () => {
    expect(loadPaymentConfig({})).toEqual({
      evmPrivateKey: undefined,
      solanaPrivateKey: undefined,
      network: "auto",
      maxPaymentUsd: "1.00",
    });
  });

  it("parses USD without floating point rounding", () => {
    expect(usdToAtomicUnits("0.70")).toBe(700_000n);
    expect(usdToAtomicUnits("1.000001")).toBe(1_000_001n);
    expect(() => usdToAtomicUnits("1.0000001")).toThrow();
  });

  it("leaves fetch unchanged when no payer wallet is configured", async () => {
    const bareFetch = vi.fn<typeof fetch>();
    await expect(createPaymentFetch({
      network: "auto",
      maxPaymentUsd: "1",
    }, bareFetch)).resolves.toBe(bareFetch);
  });
});

describe("payment selection", () => {
  const base = requirement(BASE_NETWORK, BASE_USDC);
  const solana = requirement(SOLANA_NETWORK, SOLANA_USDC);

  it("prefers Base when both configured networks are available", () => {
    expect(selectPaymentRequirement([base, solana], {
      network: "auto",
      maxPaymentUsd: "1",
    })).toBe(base);
  });

  it("honors an explicit Solana preference", () => {
    expect(selectPaymentRequirement([base, solana], {
      network: "solana",
      maxPaymentUsd: "1",
    })).toBe(solana);
  });

  it("rejects an amount above the configured cap", () => {
    expect(() =>
      selectPaymentRequirement(
        [requirement(BASE_NETWORK, BASE_USDC, "10001")],
        { network: "base", maxPaymentUsd: "0.01" },
      ),
    ).toThrow("exceeds X402_MAX_PAYMENT_USD");
  });

  it("rejects unknown assets and unsupported EVM networks", () => {
    expect(() =>
      selectPaymentRequirement(
        [requirement(BASE_NETWORK, "0x0000000000000000000000000000000000000002")],
        { network: "auto", maxPaymentUsd: "1" },
      ),
    ).toThrow("No supported");

    expect(() =>
      selectPaymentRequirement(
        [requirement("eip155:4326", "0xFAfDdbb3FC7688494971a79cc65DCa3EF82079E7")],
        { network: "auto", maxPaymentUsd: "1" },
      ),
    ).toThrow("No supported");
  });
});
