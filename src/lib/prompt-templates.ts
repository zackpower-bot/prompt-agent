export interface PromptTemplate {
  id: string
  title: string
  description: string
  prompt: string
}

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: "commit-message",
    title: "Commit 消息生成",
    description: "按 Conventional Commits 生成提交信息",
    prompt:
      "生成一个遵循 Conventional Commits 规范的提交消息生成提示词，能够分析 diff 并自动识别 type 和 scope。",
  },
  {
    id: "api-docs",
    title: "API 文档",
    description: "为函数/接口生成规范文档",
    prompt:
      "生成一个 API 文档写作提示词，输出 OpenAPI 风格的端点描述，包含参数、返回、示例和错误码。",
  },
  {
    id: "sql-optimize",
    title: "SQL 优化",
    description: "分析慢查询并给出优化建议",
    prompt:
      "生成一个 SQL 慢查询优化提示词，要求分析执行计划、索引使用，并给出改写方案。",
  },
  {
    id: "unit-test",
    title: "单元测试",
    description: "按 AAA 结构生成测试用例",
    prompt:
      "生成一个单元测试生成提示词，按 Arrange-Act-Assert 结构，覆盖正常路径、边界和异常。",
  },
  {
    id: "code-review",
    title: "Code Review",
    description: "按维度检查 PR 质量",
    prompt:
      "生成一个 Code Review 提示词，从可读性、正确性、性能、安全和测试五个维度给出分级意见。",
  },
  {
    id: "translate",
    title: "技术翻译",
    description: "保留术语的中英互译",
    prompt: "生成一个技术文档翻译提示词，保留专业术语、代码块和 Markdown 格式不变。",
  },
]
