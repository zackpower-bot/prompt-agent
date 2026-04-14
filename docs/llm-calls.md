# LLM Call Sites

本文档列出 `prompt-agent` 仓库内所有对 LLM / embedding API 的出站调用点。全部调用均通过 `openai` SDK (OpenAI 兼容接口) 发出，实际 provider 由 `PROVIDER_CONFIGS` 动态切换 (minimax / openai / zhipu / gemini / kimi / deepseek)。

## 调用点总表

| 调用位置 (file:line) | provider | model | 关键参数 | 调用语境 |
|---|---|---|---|---|
| `src/agent/core.ts:231` | 动态 (可配置，含 retry fallback) | `options.model ?? config.defaultModel` | `temperature`, `messages`, `tools`, `tool_choice: "auto"`, `stream: true`, `stream_options.include_usage` | Agent 主循环，tool-calling + streaming；被 `/api/agent/stream`、`/generate`、`/quality`、`/analyze`、`/suggest-modules` 共用 |
| `src/lib/memory-audn.ts:41` | 动态 (default provider) | `config.defaultModel` | `temperature: 0.1`, `messages` (system + user) | Memory 抽取：从事件流提炼结构化记忆 (非 streaming) |
| `src/lib/memory-audn.ts:98` | 动态 (default provider) | `config.defaultModel` | `temperature: 0.1`, `messages` (system + user) | Memory 去重决策 (AUDN add/update/delete/noop，非 streaming) |
| `src/lib/embedding.ts:74` | openai 主、gemini 回退 | `text-embedding-3-small` / `gemini-embedding-001` | `dimensions: 1536` (openai) 或 `3072` (gemini)，`input: text.slice(0, 8000)` | 语义记忆向量化，用于相似度检索 |

## 架构要点

- **单一 SDK + provider 抽象**：所有调用走 `new OpenAI()`，通过 `createClient` 读 `PROVIDER_CONFIGS` 切 baseURL/key；没有直接 `fetch` 或 `anthropic.messages.create` 路径。
- **Agent 主循环是唯一 streaming 点**：`src/agent/core.ts:231` 把 chunk 聚合成 tool_call，其余调用都是一次性 completion。
- **Retry fallback 会扩大成本面**：`runAgent` 在 429 / 529 / overloaded 时按 provider 列表级联重试 (core.ts:148–161)；单次用户请求可能触发多 provider 出站。
- **Embedding provider 锁定**：`_client` 首次实例化后不再跟随 key 变更，需重启服务才能切 provider (embedding.ts:45)。
- **Tool schema 假设 OpenAI 兼容**：`openaiTools` 直接喂给所有 provider，MiniMax 等非严格兼容方可能在 tool_choice 语义上出偏差。
- **超时依赖客户端默认**：memory/embedding 调用未传 `timeout`，分别退回到 `createClient` 的 45s / embedding 模块的 15s 默认。
