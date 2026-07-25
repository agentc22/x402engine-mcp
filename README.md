# x402engine-mcp

Agent-friendly MCP server for [x402engine](https://x402engine.app). It lets agents discover and call pay-per-request APIs through HTTP 402, with automatic USDC payment on Base or Solana.

The live gateway covers LLMs, image and video generation, web search and scraping, code execution, crypto and wallet data, transaction simulation, audio, travel, and IPFS. This MCP exposes a curated tool set and live discovery for the full catalog.

## Quick Start

Use a dedicated, low-balance payer wallet. The MCP signs x402 payments locally and never sends the private key to x402engine.

### Base

```json
{
  "mcpServers": {
    "x402engine": {
      "command": "npx",
      "args": ["-y", "x402engine-mcp@1.1.0"],
      "env": {
        "X402_EVM_PRIVATE_KEY": "0xYOUR_DEDICATED_PAYER_KEY",
        "X402_PAYMENT_NETWORK": "base",
        "X402_MAX_PAYMENT_USD": "1.00"
      }
    }
  }
}
```

Fund the wallet with USDC on Base. The x402 facilitator pays transaction gas; the wallet signs an EIP-3009 USDC authorization.

### Solana

```json
{
  "mcpServers": {
    "x402engine": {
      "command": "npx",
      "args": ["-y", "x402engine-mcp@1.1.0"],
      "env": {
        "X402_SOLANA_PRIVATE_KEY": "YOUR_BASE58_OR_JSON_PRIVATE_KEY",
        "X402_PAYMENT_NETWORK": "solana",
        "X402_MAX_PAYMENT_USD": "1.00"
      }
    }
  }
}
```

Fund the wallet with USDC on Solana and enough SOL for transaction fees.

### Discovery Without a Wallet

The server starts without a wallet, and free tools such as `discover_services` and `service_health` still work. Paid tools return their x402 payment requirements until a wallet is configured.

```bash
claude mcp add x402engine -- npx -y x402engine-mcp@1.1.0
```

## Payment Controls

| Variable | Default | Description |
|----------|---------|-------------|
| `X402_EVM_PRIVATE_KEY` | unset | Dedicated payer key for Base USDC |
| `X402_SOLANA_PRIVATE_KEY` | unset | Base58 or JSON payer key for Solana USDC |
| `X402_PAYMENT_NETWORK` | `auto` | `auto`, `base`, or `solana` |
| `X402_MAX_PAYMENT_USD` | `1.00` | Hard per-request spending limit |
| `X402_BASE_URL` | production gateway | Override the gateway URL |
| `X402_PAYMENT_HEADER` | unset | Legacy pre-signed x402 header |
| `X402_DEV_BYPASS` | unset | Development bypass secret |

In `auto` mode, Base is preferred when both keys are configured. Automatic payment only accepts the canonical USDC contracts on Base and Solana. It rejects unknown assets, unsupported networks, and amounts above the configured cap before signing.

MegaETH remains available to clients that supply their own compatible payment header.

## MCP Tools

| Category | Tools |
|----------|-------|
| Discovery | `discover_services`, `service_health` |
| Image and code | `generate_image`, `execute_code` |
| Audio | `transcribe_audio` |
| Crypto | `get_crypto_price`, `get_crypto_markets`, `get_crypto_history`, `get_trending_crypto`, `search_crypto`, `get_crypto_categories` |
| Wallet and token | `get_wallet_balances`, `get_wallet_transactions`, `get_wallet_pnl`, `get_token_prices`, `get_token_metadata` |
| IPFS | `pin_to_ipfs`, `get_from_ipfs` |
| Travel | `search_flights`, `search_locations`, `search_hotels`, `search_cheapest_dates` |

Prices are included in each tool description and in live discovery. The gateway catalog can change independently of this package.

## Discovery

- Gateway discovery: [/.well-known/x402.json](https://x402-gateway-production.up.railway.app/.well-known/x402.json)
- Agent card: [/.well-known/agent.json](https://x402-gateway-production.up.railway.app/.well-known/agent.json)
- Endpoint manifest: [/.well-known/agent-manifest.v1.json](https://x402-gateway-production.up.railway.app/.well-known/agent-manifest.v1.json)
- Services API: [/api/services](https://x402-gateway-production.up.railway.app/api/services)
- Package metadata: [server.json](./server.json)

## Development

```bash
npm install
npm test
npm run build
```

## Links

- Website: [x402engine.app](https://x402engine.app)
- npm: [x402engine-mcp](https://www.npmjs.com/package/x402engine-mcp)
- GitHub: [agentc22/x402engine-mcp](https://github.com/agentc22/x402engine-mcp)
- Protocol: [x402.org](https://x402.org)
