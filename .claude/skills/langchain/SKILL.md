---
name: langchain
description: Use this skill when working with LangChain — building chains, agents, RAG pipelines, memory, tools, or any LangChain/LangGraph component. Triggers on mentions of LangChain, LangGraph, LCEL, chains, agents, retrievers, embeddings, vector stores.
---

Before answering, fetch the relevant documentation page based on the user's question:

- General docs: https://js.langchain.com/docs/introduction/
- LangGraph JS: https://langchain-ai.github.io/langgraphjs/
- Concepts overview: https://js.langchain.com/docs/concepts/
- LangChain Expression Language (LCEL): https://js.langchain.com/docs/concepts/lcel/
- Chains: https://js.langchain.com/docs/concepts/chains/
- Agents: https://js.langchain.com/docs/concepts/agents/
- Tools: https://js.langchain.com/docs/concepts/tools/
- Memory: https://js.langchain.com/docs/concepts/memory/
- RAG / Retrievers: https://js.langchain.com/docs/concepts/retrievers/
- Vector stores: https://js.langchain.com/docs/concepts/vectorstores/
- Embeddings: https://js.langchain.com/docs/concepts/embedding_models/

## Instructions

1. Identify which LangChain component the user is asking about.
2. Fetch the relevant docs page from the list above.
3. Base your answer on the fetched documentation — not on training data alone, since LangChain updates frequently.
4. Always show a working code example using the latest API (check for deprecated methods).
5. Always use TypeScript. Default to TypeScript syntax in all code examples.
6. Note any breaking changes or version requirements if relevant.