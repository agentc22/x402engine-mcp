#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
const BASE_URL = process.env.X402_BASE_URL || "https://x402-gateway-production.up.railway.app";
const PAYMENT_HEADER = process.env.X402_PAYMENT_HEADER || "";
const DEV_BYPASS = process.env.X402_DEV_BYPASS || "";
async function callApi(method, path, params, body) {
    let url = `${BASE_URL}${path}`;
    // Build query string for GET
    if (method === "GET" && params) {
        const qs = new URLSearchParams();
        for (const [k, v] of Object.entries(params)) {
            if (v !== undefined && v !== null && v !== "") {
                qs.set(k, String(v));
            }
        }
        const qsStr = qs.toString();
        if (qsStr)
            url += `?${qsStr}`;
    }
    const headers = {
        "Content-Type": "application/json",
    };
    if (PAYMENT_HEADER) {
        headers["X-PAYMENT"] = PAYMENT_HEADER;
    }
    if (DEV_BYPASS) {
        headers["X-DEV-BYPASS"] = DEV_BYPASS;
    }
    const init = { method, headers };
    if (method === "POST" && body) {
        init.body = JSON.stringify(body);
    }
    const res = await fetch(url, init);
    if (res.status === 402) {
        const paymentHeader = res.headers.get("PAYMENT-REQUIRED");
        let paymentInfo = null;
        if (paymentHeader) {
            try {
                paymentInfo = JSON.parse(Buffer.from(paymentHeader, "base64").toString());
            }
            catch {
                paymentInfo = paymentHeader;
            }
        }
        return {
            status: 402,
            paymentRequired: paymentInfo,
            error: "Payment required. Set X402_PAYMENT_HEADER or X402_DEV_BYPASS env var, or use @x402/fetch to handle payments automatically.",
        };
    }
    const data = await res.json().catch(() => ({ error: "Non-JSON response" }));
    if (!res.ok) {
        return { status: res.status, error: data.error || `HTTP ${res.status}` };
    }
    return { status: res.status, data };
}
function textResult(content) {
    return {
        content: [{ type: "text", text: typeof content === "string" ? content : JSON.stringify(content, null, 2) }],
    };
}
// --- Server factory ---
function createServer() {
    const server = new McpServer({
        name: "x402engine",
        version: "1.0.0",
    });
    // ==================== DISCOVERY ====================
    server.tool("discover_services", "List all available x402 Engine APIs with pricing, endpoints, and payment networks. Call this first to understand what's available.", {}, async () => {
        const res = await callApi("GET", "/.well-known/x402.json");
        if (res.error)
            return textResult({ error: res.error });
        return textResult(res.data);
    });
    // ==================== IMAGE GENERATION ====================
    server.tool("generate_image", "Generate an image from a text prompt. Three quality tiers: 'fast' ($0.015, FLUX Schnell), 'quality' ($0.05, FLUX.2 Pro), 'text' ($0.12, Ideogram v3 for images with text). Returns image URL.", {
        prompt: z.string().describe("Text description of the image to generate"),
        tier: z.enum(["fast", "quality", "text"]).default("fast").describe("Quality tier: fast ($0.015), quality ($0.05), text ($0.12)"),
        width: z.number().min(256).max(2048).default(1024).optional().describe("Image width in pixels"),
        height: z.number().min(256).max(2048).default(1024).optional().describe("Image height in pixels"),
        seed: z.number().optional().describe("Random seed for reproducibility"),
    }, async ({ prompt, tier, width, height, seed }) => {
        const body = { prompt };
        if (width)
            body.width = width;
        if (height)
            body.height = height;
        if (seed !== undefined)
            body.seed = seed;
        const res = await callApi("POST", `/api/image/${tier}`, undefined, body);
        if (res.error)
            return textResult({ error: res.error, paymentRequired: res.paymentRequired });
        return textResult(res.data);
    });
    // ==================== CODE EXECUTION ====================
    server.tool("execute_code", "Execute code in a secure sandboxed environment (E2B). Supports Python, JavaScript, Bash, and R. $0.005 per execution.", {
        code: z.string().describe("Code to execute"),
        language: z.enum(["python", "javascript", "bash", "r"]).default("python").describe("Programming language"),
        timeout: z.number().min(1).max(300).optional().describe("Execution timeout in seconds"),
    }, async ({ code, language, timeout }) => {
        const body = { code, language };
        if (timeout)
            body.timeout = timeout;
        const res = await callApi("POST", "/api/code/run", undefined, body);
        if (res.error)
            return textResult({ error: res.error, paymentRequired: res.paymentRequired });
        return textResult(res.data);
    });
    // ==================== AUDIO TRANSCRIPTION ====================
    server.tool("transcribe_audio", "Transcribe audio to text using Deepgram Nova-3. Accepts a public URL to an audio file. $0.10 per transcription.", {
        audio_url: z.string().url().describe("Public URL to audio file (mp3, wav, etc.)"),
        language: z.string().optional().describe("Language code (e.g., 'en', 'es')"),
        diarize: z.boolean().default(false).optional().describe("Enable speaker identification"),
        punctuate: z.boolean().default(true).optional().describe("Add punctuation"),
    }, async ({ audio_url, language, diarize, punctuate }) => {
        const body = { audio_url };
        if (language)
            body.language = language;
        if (diarize)
            body.diarize = diarize;
        if (punctuate !== undefined)
            body.punctuate = punctuate;
        const res = await callApi("POST", "/api/transcribe", undefined, body);
        if (res.error)
            return textResult({ error: res.error, paymentRequired: res.paymentRequired });
        return textResult(res.data);
    });
    // ==================== CRYPTO PRICES ====================
    server.tool("get_crypto_price", "Get current prices for cryptocurrencies. $0.001 per request.", {
        ids: z.string().describe("Comma-separated coin IDs (e.g., 'bitcoin,ethereum,solana')"),
        currencies: z.string().default("usd").optional().describe("Comma-separated fiat currencies (default: 'usd')"),
        include_24h: z.boolean().default(true).optional().describe("Include 24h price change"),
        include_mcap: z.boolean().default(false).optional().describe("Include market cap"),
    }, async ({ ids, currencies, include_24h, include_mcap }) => {
        const res = await callApi("GET", "/api/crypto/price", { ids, currencies, include_24h, include_mcap });
        if (res.error)
            return textResult({ error: res.error, paymentRequired: res.paymentRequired });
        return textResult(res.data);
    });
    server.tool("get_crypto_markets", "Get top cryptocurrencies by market cap with detailed market data. $0.002 per request.", {
        currency: z.string().default("usd").optional().describe("Fiat currency for prices"),
        category: z.string().optional().describe("Filter by category"),
        order: z.string().default("market_cap_desc").optional().describe("Sort order"),
        limit: z.number().min(1).max(250).default(20).optional().describe("Number of results"),
        page: z.number().min(1).default(1).optional().describe("Page number"),
    }, async ({ currency, category, order, limit, page }) => {
        const res = await callApi("GET", "/api/crypto/markets", { currency, category, order, limit, page });
        if (res.error)
            return textResult({ error: res.error, paymentRequired: res.paymentRequired });
        return textResult(res.data);
    });
    server.tool("get_crypto_history", "Get historical price data for a cryptocurrency. $0.003 per request.", {
        id: z.string().describe("Coin ID (e.g., 'bitcoin')"),
        currency: z.string().default("usd").optional().describe("Fiat currency"),
        days: z.union([z.number().min(1).max(365), z.literal("max")]).default(30).optional().describe("Number of days of history (or 'max')"),
    }, async ({ id, currency, days }) => {
        const res = await callApi("GET", "/api/crypto/history", { id, currency, days });
        if (res.error)
            return textResult({ error: res.error, paymentRequired: res.paymentRequired });
        return textResult(res.data);
    });
    server.tool("get_trending_crypto", "Get trending cryptocurrencies. $0.001 per request.", {}, async () => {
        const res = await callApi("GET", "/api/crypto/trending");
        if (res.error)
            return textResult({ error: res.error, paymentRequired: res.paymentRequired });
        return textResult(res.data);
    });
    server.tool("search_crypto", "Search for a cryptocurrency by name or symbol. $0.001 per request.", {
        q: z.string().describe("Search query (coin name or symbol)"),
    }, async ({ q }) => {
        const res = await callApi("GET", "/api/crypto/search", { q });
        if (res.error)
            return textResult({ error: res.error, paymentRequired: res.paymentRequired });
        return textResult(res.data);
    });
    // ==================== BLOCKCHAIN / WALLET ====================
    server.tool("get_wallet_balances", "Get token balances for a wallet address on any supported chain. $0.005 per request.", {
        chain: z.string().describe("Blockchain name (e.g., 'ethereum', 'base', 'solana', 'arbitrum')"),
        address: z.string().describe("Wallet address"),
    }, async ({ chain, address }) => {
        const res = await callApi("POST", "/api/wallet/balances", undefined, { chain, address });
        if (res.error)
            return textResult({ error: res.error, paymentRequired: res.paymentRequired });
        return textResult(res.data);
    });
    server.tool("get_wallet_transactions", "Get transaction history for a wallet address. $0.005 per request.", {
        chain: z.string().describe("Blockchain name"),
        address: z.string().describe("Wallet address"),
    }, async ({ chain, address }) => {
        const res = await callApi("POST", "/api/wallet/transactions", undefined, { chain, address });
        if (res.error)
            return textResult({ error: res.error, paymentRequired: res.paymentRequired });
        return textResult(res.data);
    });
    server.tool("get_wallet_pnl", "Get profit and loss analysis for a wallet's token trades. $0.01 per request.", {
        chain: z.string().describe("Blockchain name"),
        address: z.string().describe("Wallet address"),
        min_liquidity: z.number().optional().describe("Minimum liquidity filter"),
        min_volume_24h: z.number().optional().describe("Minimum 24h volume filter"),
    }, async ({ chain, address, min_liquidity, min_volume_24h }) => {
        const body = { chain, address };
        if (min_liquidity)
            body.min_liquidity = min_liquidity;
        if (min_volume_24h)
            body.min_volume_24h = min_volume_24h;
        const res = await callApi("POST", "/api/wallet/pnl", undefined, body);
        if (res.error)
            return textResult({ error: res.error, paymentRequired: res.paymentRequired });
        return textResult(res.data);
    });
    server.tool("get_token_prices", "Get DEX-derived prices for tokens by contract address. $0.005 per request.", {
        tokens: z.array(z.object({
            token_address: z.string().describe("Token contract address"),
            chain: z.string().describe("Blockchain name"),
        })).min(1).max(200).describe("Array of tokens to price"),
    }, async ({ tokens }) => {
        const res = await callApi("POST", "/api/token/prices", undefined, { tokens });
        if (res.error)
            return textResult({ error: res.error, paymentRequired: res.paymentRequired });
        return textResult(res.data);
    });
    server.tool("get_token_metadata", "Get metadata for a token (name, symbol, decimals, etc.). $0.002 per request.", {
        chain: z.string().optional().describe("Blockchain name (required with address)"),
        address: z.string().optional().describe("Token contract address"),
        slug: z.string().optional().describe("Token slug (alternative to chain+address)"),
        id: z.string().optional().describe("Token ID (alternative to chain+address)"),
    }, async ({ chain, address, slug, id }) => {
        const params = {};
        if (chain)
            params.chain = chain;
        if (address)
            params.address = address;
        if (slug)
            params.slug = slug;
        if (id)
            params.id = id;
        const res = await callApi("GET", "/api/token/metadata", params);
        if (res.error)
            return textResult({ error: res.error, paymentRequired: res.paymentRequired });
        return textResult(res.data);
    });
    // ==================== IPFS ====================
    server.tool("pin_to_ipfs", "Pin JSON data to IPFS via Pinata. Returns the IPFS CID. $0.01 per pin.", {
        json: z.record(z.unknown()).describe("JSON object to pin to IPFS"),
        name: z.string().optional().describe("Name for the pinned content"),
    }, async ({ json, name }) => {
        const body = { json };
        if (name)
            body.name = name;
        const res = await callApi("POST", "/api/ipfs/pin", undefined, body);
        if (res.error)
            return textResult({ error: res.error, paymentRequired: res.paymentRequired });
        return textResult(res.data);
    });
    server.tool("get_from_ipfs", "Retrieve content from IPFS by CID. $0.001 per request.", {
        cid: z.string().describe("IPFS content identifier (CID)"),
    }, async ({ cid }) => {
        const res = await callApi("GET", "/api/ipfs/get", { cid });
        if (res.error)
            return textResult({ error: res.error, paymentRequired: res.paymentRequired });
        return textResult(res.data);
    });
    // ==================== TRAVEL ====================
    server.tool("search_flights", "Search flight offers by route, dates, and passengers. Returns pricing, itineraries, and airlines. $0.01 per request.", {
        origin: z.string().describe("Origin airport IATA code (e.g., 'JFK')"),
        destination: z.string().describe("Destination airport IATA code (e.g., 'LAX')"),
        departureDate: z.string().describe("Departure date in YYYY-MM-DD format"),
        adults: z.number().min(1).max(9).default(1).optional().describe("Number of adult passengers"),
        returnDate: z.string().optional().describe("Return date in YYYY-MM-DD format (for round trips)"),
        max: z.number().min(1).max(50).default(10).optional().describe("Maximum number of offers to return"),
        nonStop: z.boolean().default(false).optional().describe("Only show non-stop flights"),
        currencyCode: z.string().optional().describe("Currency code for prices (e.g., 'USD', 'EUR')"),
    }, async ({ origin, destination, departureDate, adults, returnDate, max, nonStop, currencyCode }) => {
        const params = { origin, destination, departureDate };
        if (adults)
            params.adults = adults;
        if (returnDate)
            params.returnDate = returnDate;
        if (max)
            params.max = max;
        if (nonStop)
            params.nonStop = nonStop;
        if (currencyCode)
            params.currencyCode = currencyCode;
        const res = await callApi("GET", "/api/travel/flights", params);
        if (res.error)
            return textResult({ error: res.error, paymentRequired: res.paymentRequired });
        return textResult(res.data);
    });
    server.tool("search_locations", "Search for airports and cities by keyword. Returns IATA codes, names, and coordinates. $0.005 per request.", {
        keyword: z.string().min(2).describe("Search keyword (e.g., 'London', 'JFK', 'Paris')"),
        subType: z.string().default("AIRPORT,CITY").optional().describe("Location type filter: AIRPORT, CITY, or both"),
    }, async ({ keyword, subType }) => {
        const res = await callApi("GET", "/api/travel/locations", { keyword, subType });
        if (res.error)
            return textResult({ error: res.error, paymentRequired: res.paymentRequired });
        return textResult(res.data);
    });
    server.tool("search_hotels", "Search hotel offers by city and dates. Returns room details, pricing, and availability. $0.01 per request.", {
        cityCode: z.string().describe("City IATA code (e.g., 'PAR' for Paris, 'LON' for London)"),
        checkInDate: z.string().describe("Check-in date in YYYY-MM-DD format"),
        checkOutDate: z.string().describe("Check-out date in YYYY-MM-DD format"),
        adults: z.number().min(1).max(9).default(1).optional().describe("Number of adult guests per room"),
        roomQuantity: z.number().min(1).max(9).default(1).optional().describe("Number of rooms"),
        priceRange: z.string().optional().describe("Price range filter (e.g., '100-200')"),
        currency: z.string().optional().describe("Currency code for prices (e.g., 'USD')"),
    }, async ({ cityCode, checkInDate, checkOutDate, adults, roomQuantity, priceRange, currency }) => {
        const params = { cityCode, checkInDate, checkOutDate };
        if (adults)
            params.adults = adults;
        if (roomQuantity)
            params.roomQuantity = roomQuantity;
        if (priceRange)
            params.priceRange = priceRange;
        if (currency)
            params.currency = currency;
        const res = await callApi("GET", "/api/travel/hotels", params);
        if (res.error)
            return textResult({ error: res.error, paymentRequired: res.paymentRequired });
        return textResult(res.data);
    });
    server.tool("search_cheapest_dates", "Find the cheapest travel dates for a route. Returns date/price pairs sorted by price. $0.01 per request.", {
        origin: z.string().describe("Origin airport IATA code (e.g., 'JFK')"),
        destination: z.string().describe("Destination airport IATA code (e.g., 'LAX')"),
        departureDate: z.string().optional().describe("Approximate departure date in YYYY-MM-DD format"),
        oneWay: z.boolean().default(false).optional().describe("Search one-way flights only"),
    }, async ({ origin, destination, departureDate, oneWay }) => {
        const params = { origin, destination };
        if (departureDate)
            params.departureDate = departureDate;
        if (oneWay)
            params.oneWay = oneWay;
        const res = await callApi("GET", "/api/travel/cheapest-dates", params);
        if (res.error)
            return textResult({ error: res.error, paymentRequired: res.paymentRequired });
        return textResult(res.data);
    });
    // ==================== RESOURCES ====================
    server.resource("services", "x402engine://services", async (uri) => ({
        contents: [{
                uri: uri.href,
                mimeType: "application/json",
                text: JSON.stringify({
                    gateway: BASE_URL,
                    services: [
                        { tool: "generate_image", price: "$0.015-$0.12", description: "AI image generation (3 tiers)" },
                        { tool: "execute_code", price: "$0.005", description: "Sandboxed code execution" },
                        { tool: "transcribe_audio", price: "$0.10", description: "Audio transcription" },
                        { tool: "get_crypto_price", price: "$0.001", description: "Crypto prices" },
                        { tool: "get_crypto_markets", price: "$0.002", description: "Market data" },
                        { tool: "get_crypto_history", price: "$0.003", description: "Historical prices" },
                        { tool: "get_trending_crypto", price: "$0.001", description: "Trending coins" },
                        { tool: "search_crypto", price: "$0.001", description: "Coin search" },
                        { tool: "get_wallet_balances", price: "$0.005", description: "Wallet balances" },
                        { tool: "get_wallet_transactions", price: "$0.005", description: "Transaction history" },
                        { tool: "get_wallet_pnl", price: "$0.01", description: "P&L analysis" },
                        { tool: "get_token_prices", price: "$0.005", description: "DEX token prices" },
                        { tool: "get_token_metadata", price: "$0.002", description: "Token metadata" },
                        { tool: "pin_to_ipfs", price: "$0.01", description: "Pin to IPFS" },
                        { tool: "get_from_ipfs", price: "$0.001", description: "Get from IPFS" },
                        { tool: "search_flights", price: "$0.01", description: "Flight search" },
                        { tool: "search_locations", price: "$0.005", description: "Airport & city search" },
                        { tool: "search_hotels", price: "$0.01", description: "Hotel search" },
                        { tool: "search_cheapest_dates", price: "$0.01", description: "Cheapest travel dates" },
                    ],
                    networks: ["Base (USDC)", "Solana (USDC)", "MegaETH (USDm)"],
                    docs: `${BASE_URL}/.well-known/x402.json`,
                }, null, 2),
            }],
    }));
    return server;
}
// --- Smithery sandbox support ---
export function createSandboxServer() {
    return createServer();
}
// --- Start (only when run directly, not when imported) ---
const isDirectRun = process.argv[1] && (process.argv[1].endsWith("/index.js") ||
    process.argv[1].endsWith("/index.ts"));
if (isDirectRun) {
    const server = createServer();
    const transport = new StdioServerTransport();
    server.connect(transport).catch((err) => {
        console.error("Fatal:", err);
        process.exit(1);
    });
}
//# sourceMappingURL=index.js.map