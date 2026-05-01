# Logistics Document Verification Agent — Build Instructions

## What This Agent Does

The agent receives a freight order ID, fetches all relevant data through MCP tools,
and produces a compliance report that identifies:
- missing or invalid documents
- transit country requirements
- conflicts between documents
- carrier compliance issues

The agent does not use an LLM to reason about logistics rules.
All rules live in the MCP server. The LLM is only used to format the final report.

---

## Architecture Overview

```
User → Agent (LangGraph) → MCP Tools → TMS / Rules DB / Carrier DB
                        ↓
                   LLM (report only)
                        ↓
                   Structured report
```

The graph is **deterministic and sequential**. No conditional branching, no LLM tool-calling loop.
Each node has one job, calls one or more MCP tools, and writes results to shared state.

---

## Stack

```json
{
  "@langchain/langgraph": "^0.2",
  "@langchain/anthropic": "^0.3",
  "@langchain/mcp-adapters": "^0.1",
  "@modelcontextprotocol/sdk": "^1.0",
  "zod": "^3.22"
}
```

---

## MCP Server — Required Tools

The MCP server is the source of truth for all business logic.
The agent never hardcodes rules. Every rule lives here.

### Tool: `get_order`

```typescript
input:  { orderId: string }
output: {
  orderId: string
  route: { origin: string; destination: string; waypoints?: string[] }
  shipmentDate: string          // ISO date
  cargo: {
    description: string
    hsCode: string
    quantity: number
    weightKg: number
    declaredValueEur: number
    packagingType?: string       // e.g. "wooden pallets" — critical for phytosanitary checks
  }
  carrier: {
    name: string
    driver?: string
    vehicleType?: string
  }
  documents: Array<{
    id: string
    name: string
    type: string                 // e.g. "CMR" | "INVOICE" | "PACKING_LIST"
    uploadedAt: string
    status: "OK" | "PENDING" | "ERROR"
    fileUrl: string
  }>
}
```

**Important:** `cargo.packagingType` must be in the order data or inferred from the packing list.
If it is missing and the packing list is not yet validated, flag phytosanitary as CONDITIONAL,
not REQUIRED.

---

### Tool: `get_transit_countries`

```typescript
input:  { origin: string; destination: string; waypoints?: string[] }
output: Array<{
  code: string                  // ISO country code
  name: string
  flag: string                  // emoji
  status: "CONFIRMED" | "ASSUMED" | "ISSUE"
  note?: string                 // shown in report if status is ASSUMED or ISSUE
}>
```

A country is ASSUMED when it is inferred from the most common route but not explicitly
listed in the order waypoints. Always add a note telling the operator to confirm the route.

---

### Tool: `get_document_requirements`

```typescript
input:  {
  country: string               // ISO code
  hsCode: string
  packagingType?: string        // affects phytosanitary requirements
}
output: Array<{
  documentType: string
  name: string
  status: "REQUIRED" | "CONDITIONAL"
  condition?: string            // e.g. "Required for preferential tariff rates"
  processingDays?: number
  authority?: string
  authorityUrl?: string
}>
```

Call this once per transit country and once for the destination country.
Deduplicate results — the same document type required by multiple countries
should appear once in the checklist with all applicable countries noted.

---

### Tool: `validate_document`

```typescript
input:  { documentId: string; destinationCountry: string }
output: {
  documentId: string
  status: "OK" | "ERROR" | "WARNING"
  fields: Array<{
    name: string
    value: string
    expected?: string           // if validation failed
    error?: string
  }>
}
```

This tool parses the document file, extracts key fields, and validates them
against the rules for the destination country. For example: Turkey requires
unit of measure as `adet`, not `pcs` or `units`.

---

### Tool: `cross_check_documents`

```typescript
input:  { documentIds: string[] }
output: {
  status: "OK" | "CONFLICTS_FOUND"
  fields: Array<{
    fieldName: string
    values: Record<string, string>   // { "CMR Draft": "pcs", "Commercial Invoice": "units" }
    recommended?: string
    action: "OK" | "FIX"
  }>
}
```

Compares shared fields across all documents: invoice value, gross weight,
unit of measure, consignee, consignor, HS code.

---

### Tool: `check_carrier`

```typescript
input:  { carrierName: string; driver?: string; shipmentDate: string }
output: {
  carrierName: string
  driver?: string
  checks: Array<{
    name: string
    status: "OK" | "WARNING" | "BLOCKER"
    detail?: string             // e.g. "Expires 22 May"
  }>
}
```

Fetches carrier compliance data from your carrier database.
Checks: international license, ADR certificate + expiry, cargo insurance, vehicle type.
ADR certificate expiring within 30 days of shipment date → WARNING.
ADR certificate already expired → BLOCKER.

---

## Agent State

```typescript
import { Annotation } from "@langchain/langgraph"

export const AgentState = Annotation.Root({
  orderId:            Annotation<string>(),
  order:              Annotation<Order | null>({ default: () => null }),
  transitCountries:   Annotation<TransitCountry[]>({ default: () => [] }),
  requirements:       Annotation<DocumentRequirement[]>({ default: () => [] }),
  matchedDocs:        Annotation<MatchedDocument[]>({ default: () => [] }),
  validationResults:  Annotation<ValidationResult[]>({ default: () => [] }),
  crossCheckResult:   Annotation<CrossCheckResult | null>({ default: () => null }),
  carrierChecks:      Annotation<CarrierCheck[]>({ default: () => [] }),
  blockers:           Annotation<Issue[]>({ default: () => [] }),
  warnings:           Annotation<Issue[]>({ default: () => [] }),
  report:             Annotation<string | null>({ default: () => null }),
})
```

---

## Graph Nodes

### Node 1 — `fetchOrder`

Calls `get_order`. Writes `order` to state.
If the call fails, throw — the agent cannot proceed without order data.

---

### Node 2 — `analyzeRoute`

Calls `get_transit_countries` using `order.route`.
Writes `transitCountries` to state.
Countries with status ASSUMED or ISSUE are collected into `warnings` at this step.

---

### Node 3 — `checkRequirements`

Calls `get_document_requirements` for each transit country and the destination country.
Use `Promise.all` — call all countries in parallel.
Deduplicates results by `documentType`.
Writes `requirements` to state.

---

### Node 4 — `matchDocuments`

No MCP call. Pure logic.
Compares `requirements` against `order.documents` by `documentType`.
Assigns each requirement a checklist status:

| Condition | Status |
|---|---|
| Document found, status OK | OK |
| Document found, status PENDING | PENDING |
| Document found, status ERROR | ERROR |
| Document not found, required | REQUIRED |
| Document not found, conditional | CONDITIONAL |

Writes `matchedDocs` to state.
Any REQUIRED item → add to `blockers`.

---

### Node 5 — `validateDocuments`

Calls `validate_document` for each document in `order.documents` where status is not PENDING.
Use `Promise.all`.
Passes `order.route.destination` as `destinationCountry`.
Writes `validationResults` to state.
Any ERROR result → add to `warnings` (or promote to `blockers` if the field is required for customs clearance).

---

### Node 6 — `crossCheck`

Calls `cross_check_documents` with all document IDs from `order.documents`.
Writes `crossCheckResult` to state.
Any field with action FIX → add to `warnings`.

---

### Node 7 — `checkCarrier`

Calls `check_carrier` with carrier name, driver name, and shipment date.
Writes `carrierChecks` to state.
BLOCKER status from carrier check → add to `blockers`.
WARNING status → add to `warnings`.

---

### Node 8 — `generateReport`

The only node that calls the LLM.
Serializes all state into a structured prompt.
Instructs the LLM to format the output using the report template.
The LLM does not make compliance decisions — it only formats what the previous nodes found.

```typescript
const systemPrompt = `
You are formatting a logistics compliance report.
You will receive structured data from a document verification analysis.
Output the report exactly following the template. Do not add conclusions or advice
that are not present in the input data. Do not omit any findings.
`
```

---

## Graph Definition

```typescript
import { StateGraph } from "@langchain/langgraph"

const graph = new StateGraph(AgentState)
  .addNode("fetchOrder",        (s) => fetchOrder(s, tools))
  .addNode("analyzeRoute",      (s) => analyzeRoute(s, tools))
  .addNode("checkRequirements", (s) => checkRequirements(s, tools))
  .addNode("matchDocuments",    matchDocuments)
  .addNode("validateDocuments", (s) => validateDocuments(s, tools))
  .addNode("crossCheck",        (s) => crossCheck(s, tools))
  .addNode("checkCarrier",      (s) => checkCarrier(s, tools))
  .addNode("generateReport",    generateReport)
  .addEdge("__start__",         "fetchOrder")
  .addEdge("fetchOrder",        "analyzeRoute")
  .addEdge("analyzeRoute",      "checkRequirements")
  .addEdge("checkRequirements", "matchDocuments")
  .addEdge("matchDocuments",    "validateDocuments")
  .addEdge("validateDocuments", "crossCheck")
  .addEdge("crossCheck",        "checkCarrier")
  .addEdge("checkCarrier",      "generateReport")
  .addEdge("generateReport",    "__end__")
  .compile()
```

---

## Error Handling

Every MCP tool call must be wrapped in try/catch.
On failure: write an UNKNOWN status for that item and continue.
Never let a single tool failure stop the graph.

```typescript
async function safeToolCall<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch {
    return fallback
  }
}
```

---

## Data Requirements Summary

For the agent to produce a complete report, the MCP server needs access to:

| Data | Source |
|---|---|
| Order details incl. packaging type | TMS database |
| Transit country rules per cargo type | Document requirements database |
| Country-specific field formats (e.g. Turkey `adet`) | Customs rules database |
| Carrier certificates and expiry dates | Carrier database |
| Document parsing (PDF → fields) | File parser service |
| Known route issues per country | Operational rules database |

If any of these sources are unavailable, the corresponding checklist item
must be marked UNKNOWN in the report, not omitted.