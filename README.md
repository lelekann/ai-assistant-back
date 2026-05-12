# Logistics Document Verification Agent — Backend

A backend service that automates freight document compliance checking using a LangGraph agent and MCP (Model Context Protocol) tools.

## What It Does

Given a freight order ID, the agent:
1. Fetches order data and documents from the TMS
2. Determines transit countries for the route
3. Checks document requirements per country and HS code
4. Validates each document's fields against destination customs rules
5. Cross-checks fields across documents (weight, invoice value, consignee, HS code, etc.)
6. Verifies carrier compliance (licenses, ADR certificate, insurance)
7. Generates a structured compliance report

The LLM is only used to format the final report. All compliance rules live in the MCP server.

## Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express
- **Agent**: LangGraph (`@langchain/langgraph`)
- **AI**: Anthropic Claude via `@langchain/anthropic`
- **MCP Tools**: `@langchain/mcp-adapters` + `@modelcontextprotocol/sdk`
- **Document parsing**: Tesseract.js (OCR), pdf-parse, mammoth

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/orders/:id` | Get order by ID |
| `GET` | `/api/orders/:id/documents` | List order documents |
| `GET` | `/api/orders/:id/documents/:docId/content` | Get document content |
| `POST` | `/api/orders/:id/analyze` | Run compliance analysis |
| `GET` | `/api/orders/:id/analysis` | Get cached analysis result |
| `PATCH` | `/api/orders/:id/documents/:docId/fix` | Apply AI fix to a document |
| `POST` | `/api/orders/:id/cross-check/fix` | Fix cross-check conflicts |
| `POST` | `/api/orders/:id/chat` | Chat about an order |
| `POST` | `/api/shipment/process` | Process uploaded shipment files |
| `GET` | `/api/certificates` | Carrier certificate checks |

## Getting Started

### Prerequisites

- Node.js 18+
- An `.env` file with required API keys (see below)

### Install

```bash
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
ANTHROPIC_API_KEY=your_key_here
GEOAPIFY_API_KEY=your_key_here        # for route/transit country lookup
LANGSMITH_API_KEY=your_key_here       # optional, for tracing
```

### Run in Development

```bash
npm run dev
```

Server starts at `http://localhost:3001`.

### Build and Run in Production

```bash
npm run build
npm start
```

### MCP Servers

The agent connects to two local MCP servers on startup:

- `src/mcp/orderServer.ts` — order data, document validation, cross-check, carrier checks
- `src/mcp/requirements-server.ts` — document requirements per country and HS code

These are started automatically as child processes when the agent runs.
