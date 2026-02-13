# x402engine-mcp

MCP server for [x402 Engine](https://x402-gateway-production.up.railway.app) — giving AI agents access to 38 pay-per-call APIs via HTTP 402 micropayments.

Payments are made with USDC on Base, USDC on Solana, or USDm on MegaETH. Prices range from $0.001 to $0.12 per call.

## Quick Start

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "x402engine": {
      "command": "npx",
      "args": ["-y", "x402engine-mcp"],
      "env": {
        "X402_DEV_BYPASS": "your-dev-bypass-secret"
      }
    }
  }
}
```

### Claude Code

```bash
claude mcp add x402engine -- npx -y x402engine-mcp
```

## Available Tools

### LLM Inference
| Tool | Price | Description |
|------|-------|-------------|
| `llm_chat` | $0.002-$0.09 | Chat completion with any supported model |

Supported models: GPT-4o ($0.04), GPT-4o Mini ($0.003), OpenAI o1 ($0.03), Claude Opus 4.6 ($0.09), Claude Sonnet 4.5 ($0.06), Claude Haiku 4.5 ($0.02), Gemini 2.5 Pro ($0.035), Gemini 2.5 Flash ($0.009), Grok 4 ($0.06), DeepSeek V3 ($0.005), DeepSeek R1 ($0.01), Llama 3.3 70B ($0.002), Mistral Large 3 ($0.006), Qwen3 235B ($0.004), Perplexity Sonar Pro ($0.06).

### Image Generation
| Tool | Price | Description |
|------|-------|-------------|
| `generate_image` | $0.015-$0.12 | AI image generation (fast/quality/text tiers) |

### Code Execution
| Tool | Price | Description |
|------|-------|-------------|
| `execute_code` | $0.005 | Sandboxed code execution (Python, JS, Bash, R) |

### Audio
| Tool | Price | Description |
|------|-------|-------------|
| `transcribe_audio` | $0.10 | Audio-to-text transcription (Deepgram Nova-3) |
| `tts_openai` | $0.01 | Text-to-speech (OpenAI) |
| `tts_elevenlabs` | $0.02 | Text-to-speech (ElevenLabs) |

### Text Embeddings
| Tool | Price | Description |
|------|-------|-------------|
| `create_embeddings` | $0.001 | Text embeddings (OpenAI text-embedding-3-small) |

### Crypto & Market Data
| Tool | Price | Description |
|------|-------|-------------|
| `get_crypto_price` | $0.001 | Current crypto prices |
| `get_crypto_markets` | $0.002 | Top coins by market cap |
| `get_crypto_history` | $0.003 | Historical price charts |
| `get_trending_crypto` | $0.001 | Trending coins |
| `search_crypto` | $0.001 | Search for coins |

### Blockchain & Wallet
| Tool | Price | Description |
|------|-------|-------------|
| `get_wallet_balances` | $0.005 | Token balances for any wallet |
| `get_wallet_transactions` | $0.005 | Transaction history |
| `get_wallet_pnl` | $0.01 | Profit & loss analysis |
| `get_token_prices` | $0.005 | DEX-derived token prices |
| `get_token_metadata` | $0.002 | Token metadata |
| `simulate_transaction` | $0.01 | Transaction simulation (Tenderly) |

### Web
| Tool | Price | Description |
|------|-------|-------------|
| `web_scrape` | $0.005 | Scrape and extract web page content |
| `web_screenshot` | $0.01 | Capture web page screenshot |

### IPFS Storage
| Tool | Price | Description |
|------|-------|-------------|
| `pin_to_ipfs` | $0.01 | Pin JSON to IPFS |
| `get_from_ipfs` | $0.001 | Retrieve content from IPFS |

### Discovery
| Tool | Price | Description |
|------|-------|-------------|
| `discover_services` | Free | List all services and pricing |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `X402_BASE_URL` | No | Gateway URL (default: `https://x402-gateway-production.up.railway.app`) |
| `X402_DEV_BYPASS` | No | Dev bypass secret to skip payments |
| `X402_PAYMENT_HEADER` | No | Pre-signed payment header |

## Payment Networks

- **Base** (EVM) — USDC, 6 decimals, ~2s confirmation
- **Solana** — USDC, 6 decimals, ~400ms confirmation
- **MegaETH** (EVM) — USDm, 18 decimals, ~10ms confirmation

## How It Works

1. Agent calls an MCP tool (e.g., `llm_chat`)
2. MCP server makes HTTP request to x402engine.app
3. Gateway returns `402 Payment Required` with pricing
4. Agent pays with crypto via the x402 protocol
5. Gateway verifies payment on-chain and returns data

For automatic payment handling, use [@x402/fetch](https://www.npmjs.com/package/@x402/fetch) in your agent code.

## Links

- Gateway: [x402engine.app](https://x402-gateway-production.up.railway.app)
- Discovery: [x402engine.app/.well-known/x402.json](https://x402-gateway-production.up.railway.app/.well-known/x402.json)
- GitHub: [github.com/agentc22/x402engine-mcp](https://github.com/agentc22/x402engine-mcp)
- Protocol: [x402.org](https://x402.org)
