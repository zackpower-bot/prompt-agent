/**
 * Scenario templates — structured scaffolding for prompt generation.
 *
 * Agent flow: user input → select_template → generate using template skeleton → classify_prompt
 *
 * Each template defines required sections, optional sections, default variables,
 * and quality expectations specific to the scenario.
 */

export interface PromptTemplate {
  id: string
  name: string
  nameEn: string
  description: string
  /** Markdown skeleton the Agent fills in */
  skeleton: string
  /** Guidance for the Agent on how to fill each section */
  guidance: string
  /** Suggested default variables */
  defaultVariables: string[]
  /** Expected quality bar for this category */
  qualityNotes: string
  /** Suggested tags */
  suggestedTags: string[]
  /** Suggested category */
  suggestedCategory: string
}

export const TEMPLATES: PromptTemplate[] = [
  {
    id: "translation",
    name: "翻译",
    nameEn: "Translation",
    description: "语言翻译、本地化、多语言转换",
    skeleton: `# 角色定义
你是一名专业的{{source_language}}到{{target_language}}翻译专家...

# 翻译原则
- 准确性：...
- 自然度：...
- 语域匹配：...

# 约束条件
1. ...
2. ...

# 输出格式
...

# 示例
**原文：** ...
**译文：** ...`,
    guidance: `翻译类提示词必须明确：
- 源语言和目标语言
- 翻译风格（直译/意译/文学翻译）
- 语域要求（正式/非正式/技术/文学）
- 专业术语处理策略
- 是否保留原文格式
- 输出格式（纯译文/对照/带注释）`,
    defaultVariables: ["source_language", "target_language", "domain", "style"],
    qualityNotes: "翻译提示词的核心是语域匹配和术语一致性，不是简单的逐字替换指令",
    suggestedTags: ["翻译", "语言", "多语言"],
    suggestedCategory: "language",
  },
  {
    id: "writing",
    name: "写作",
    nameEn: "Writing",
    description: "文章撰写、文案创作、内容生成",
    skeleton: `# 角色定义
你是一名{{writing_type}}领域的专业写作助手...

# 写作目标
...

# 风格要求
- 语气：...
- 结构：...
- 长度：...

# 约束条件
1. ...
2. ...

# 输出格式
...`,
    guidance: `写作类提示词必须明确：
- 写作类型（文章/文案/报告/故事/诗歌）
- 目标读者
- 语气和风格（正式/轻松/学术/营销）
- 结构要求（段落数/字数/章节）
- 核心论点或主题
- 禁止事项（如不使用某些词汇）`,
    defaultVariables: ["writing_type", "topic", "audience", "tone", "word_count"],
    qualityNotes: "好的写作提示词要定义清晰的受众和语气，而不只是'写一篇关于X的文章'",
    suggestedTags: ["写作", "文案", "内容"],
    suggestedCategory: "writing",
  },
  {
    id: "code",
    name: "代码",
    nameEn: "Code",
    description: "编程辅助、代码审查、技术文档",
    skeleton: `# 角色定义
你是一名精通{{language}}的高级开发工程师...

# 任务描述
...

# 技术约束
- 语言/框架：{{language}}
- 版本要求：...
- 代码风格：...

# 约束条件
1. ...
2. ...

# 输出格式
\`\`\`{{language}}
// 代码输出
\`\`\`

# 注意事项
...`,
    guidance: `代码类提示词必须明确：
- 编程语言和版本
- 框架/库的具体版本
- 代码风格规范（命名/缩进/注释）
- 错误处理策略
- 是否需要测试代码
- 性能/安全考量
- 输出应包含代码注释`,
    defaultVariables: ["language", "framework", "task_description"],
    qualityNotes: "代码提示词必须指定语言版本和框架版本，避免生成过时的代码",
    suggestedTags: ["代码", "编程", "开发"],
    suggestedCategory: "code",
  },
  {
    id: "analysis",
    name: "分析",
    nameEn: "Analysis",
    description: "数据分析、研究调研、竞品分析",
    skeleton: `# 角色定义
你是一名{{domain}}领域的资深分析师...

# 分析目标
...

# 分析框架
1. ...
2. ...
3. ...

# 数据要求
- 输入数据：{{input_data}}
- 分析维度：...

# 约束条件
1. ...
2. ...

# 输出格式
## 分析结论
## 关键发现
## 建议`,
    guidance: `分析类提示词必须明确：
- 分析目的和决策场景
- 分析框架（SWOT/PEST/5W1H 等）
- 数据来源和格式
- 输出的结构化程度
- 置信度要求
- 是否需要可视化建议`,
    defaultVariables: ["domain", "input_data", "analysis_goal"],
    qualityNotes: "分析提示词的核心是明确分析框架和决策场景，不是泛泛要求'分析一下'",
    suggestedTags: ["分析", "研究", "数据"],
    suggestedCategory: "analysis",
  },
  {
    id: "education",
    name: "教育",
    nameEn: "Education",
    description: "教学辅导、知识讲解、学习助手",
    skeleton: `# 角色定义
你是一名{{subject}}领域的资深教师...

# 教学目标
...

# 教学方法
- 讲解方式：...
- 互动策略：...
- 难度适配：{{level}}

# 约束条件
1. ...
2. ...

# 输出格式
## 概念讲解
## 举例说明
## 练习题
## 要点总结`,
    guidance: `教育类提示词必须明确：
- 学科领域
- 学生水平（初学者/中级/高级）
- 教学风格（苏格拉底式/直接讲授/案例教学）
- 是否需要练习题和答案
- 语言复杂度控制
- 激励和反馈策略`,
    defaultVariables: ["subject", "level", "topic", "teaching_style"],
    qualityNotes: "教育提示词需要适配学生水平，避免一刀切的难度",
    suggestedTags: ["教育", "教学", "学习"],
    suggestedCategory: "education",
  },
  {
    id: "customer_service",
    name: "客服",
    nameEn: "Customer Service",
    description: "客户支持、咨询回复、FAQ",
    skeleton: `# 角色定义
你是{{company}}的专业客服代表...

# 服务范围
...

# 沟通原则
- 语气：...
- 响应策略：...
- 升级条件：...

# 约束条件
1. ...
2. ...

# 常见问题处理
...

# 输出格式
...`,
    guidance: `客服类提示词必须明确：
- 公司/产品背景
- 服务范围和权限边界
- 语气要求（友好/专业/正式）
- 升级流程（什么情况转人工）
- 敏感话题处理策略
- 多语言支持需求`,
    defaultVariables: ["company", "product", "service_scope"],
    qualityNotes: "客服提示词的关键是划清权限边界和升级条件",
    suggestedTags: ["客服", "支持", "沟通"],
    suggestedCategory: "communication",
  },
  {
    id: "creative",
    name: "创意",
    nameEn: "Creative",
    description: "头脑风暴、创意写作、角色扮演",
    skeleton: `# 角色定义
你是一名{{creative_role}}...

# 创意目标
...

# 风格和基调
...

# 约束条件
1. ...
2. ...

# 输出格式
...`,
    guidance: `创意类提示词需要：
- 清晰的创意方向（不是完全放飞）
- 基调和风格锚点
- 边界条件（什么不能做）
- 灵感来源参考
- 输出的形式和长度`,
    defaultVariables: ["creative_role", "theme", "tone"],
    qualityNotes: "创意提示词需要在自由度和约束之间找平衡",
    suggestedTags: ["创意", "头脑风暴"],
    suggestedCategory: "creative",
  },
]

export function getTemplateById(id: string): PromptTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id)
}

export function getTemplateList(): { id: string; name: string; nameEn: string; description: string }[] {
  return TEMPLATES.map((t) => ({ id: t.id, name: t.name, nameEn: t.nameEn, description: t.description }))
}
