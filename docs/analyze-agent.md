# Analyze Agent — логіка роботи

## Що робить агент

Агент отримує `orderId`, збирає дані через MCP-інструменти, самостійно аналізує відповідність документів і вимог маршруту, і повертає структурований звіт типу `AgentOutput`.

---

## Архітектура

```
POST /api/orders/:id/analyze
        │
        ▼
  analyzeOrder (controller)
        │
        ▼
  runAnalyzeAgent(orderId)          ← src/services/ai/analyze/index.ts
        │
        ├── createMCPClient()       ← підключається до MCP-сервера через InMemoryTransport
        │       │
        │       └── createOrderServer()  ← src/mcp/orderServer.ts
        │               ├── get_order
        │               ├── get_documents
        │               └── get_certificates
        │
        ├── listTools()             ← завантажує визначення тулів з MCP-сервера
        │
        ├── [+ returnAnalysisTool]  ← локальний тул для структурованого виводу
        │
        └── agentic loop (gpt-4o)
                │
                ├── tool_calls → mcp.callTool() → дані
                │
                └── return_analysis → AgentOutput ✓
```

---

## Файлова структура

```
src/
├── mcp/
│   └── orderServer.ts          MCP-сервер: get_order, get_documents, get_certificates
│
├── services/ai/analyze/
│   ├── index.ts                runAnalyzeAgent — головна функція агента
│   ├── prompt.ts               SYSTEM_PROMPT — правила аналізу для LLM
│   ├── tools.ts                returnAnalysisTool — схема вихідних даних
│   └── mcpClient.ts            createMCPClient, getOpenAI
│
└── controllers/orders.ts       analyzeOrder — HTTP-ендпоінт
```

---

## MCP-сервер

Файл: [src/mcp/orderServer.ts](../src/mcp/orderServer.ts)

Сервер реалізований за протоколом MCP (Model Context Protocol) і запускається **в процесі** через `InMemoryTransport` — без окремого підпроцесу.

### Тули

| Тул | Вхід | Що повертає |
|-----|------|-------------|
| `get_order` | `order_id` | Деталі замовлення: маршрут, вантаж, перевізник, дата |
| `get_documents` | `order_id` | Список документів та їх статуси (`error`, `pending`, `verified`) |
| `get_certificates` | `order_id` | Сертифікати перевізника/водія, що закінчуються |

Зараз дані беруться з mock-файлів. У майбутньому кожен тул можна замінити на реальний API-запит — логіка агента не зміниться.

---

## Цикл агента (agentic loop)

Файл: [src/services/ai/analyze/index.ts](../src/services/ai/analyze/index.ts)

```
1. createMCPClient()
      │  підключає клієнта до сервера через InMemoryTransport
      ▼
2. mcp.listTools()
      │  завантажує get_order, get_documents, get_certificates
      │  конвертує їх у формат OpenAI ChatCompletionTool
      ▼
3. [додає returnAnalysisTool до списку]

4. LOOP (до 10 ітерацій):
      │
      ├─► gpt-4o.chat.completions.create({ tools, messages })
      │
      ├── finish_reason === "stop"
      │       └─► break (агент завершив без return_analysis → помилка)
      │
      └── finish_reason === "tool_calls"
              │
              ├── name === "return_analysis"
              │       └─► parse arguments → повернути AgentOutput ✓
              │
              └── name === get_order | get_documents | get_certificates
                      └─► mcp.callTool(name, args)
                              │  отримує JSON-результат від MCP-сервера
                              └─► додає { role: "tool", content } до messages
                              └─► переходить до наступної ітерації
```

---

## Тул return_analysis

Файл: [src/services/ai/analyze/tools.ts](../src/services/ai/analyze/tools.ts)

Це **не MCP-тул** — він визначений локально і не виконує жодних запитів. Це JSON Schema, яка змушує LLM повернути дані у точному форматі `AgentOutput`.

Коли gpt-4o викликає `return_analysis`, агент зупиняється і повертає `arguments` цього виклику як фінальний результат. LLM сама заповнює всі поля на основі зібраних даних.

---

## Системний промпт

Файл: [src/services/ai/analyze/prompt.ts](../src/services/ai/analyze/prompt.ts)

Промпт не містить твердих правил у коді — натомість він описує LLM **як думати**:

- Які документи потрібні для EU→Turkey маршруту
- Коли транзитна країна має статус `issue` vs `assumed`
- Правила перевірки сертифікатів (ADR < 30 днів → warning, прострочений → blocker)
- Яку інформацію заповнювати в кожне поле `Issue` (title, what, time, where, risk, alternative)
- Як визначити топ-рівень `status` (error / warning / ok)

---

## Вихідна структура AgentOutput

```typescript
type AgentOutput = {
  orderId: string;
  status: "ok" | "warning" | "error";
  summary: string;                   // 2-3 речення
  documentChecklist: ChecklistItem[];
  transitCountries: TransitCountry[];
  carrier: CarrierVerification;
  issues: Issue[];                   // blocker / warning / info
  crossCheck: CrossCheckField[];
  expiringCertificates: ExpiringCertificate[];
}
```

Кожен `Issue` містить: `title`, `what`, `time`, `where`, `whereLink`, `risk` і опціонально `alternative` (для блокерів).

---

## Де змінювати

| Що змінити | Файл |
|---|---|
| Правила аналізу, логіка промпту | `src/services/ai/analyze/prompt.ts` |
| Схема вихідних даних агента | `src/services/ai/analyze/tools.ts` |
| MCP-тули (дані, джерела) | `src/mcp/orderServer.ts` |
| Модель, кількість ітерацій | `src/services/ai/analyze/index.ts` |
| TypeScript типи | `src/types/types.ts` |
