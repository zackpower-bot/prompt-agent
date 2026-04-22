// Route 1: Home empty state + Route 2: Login + Route 3: Docs

function RouteHome({ theme = "light" }) {
  return (
    <PAShell route="home" crumbs={["生成"]} theme={theme}
      extra={<div style={{position:"absolute", bottom: 0, left: 192, right: 0}}><PAComposer/></div>}>
      <div className="pa-home" style={{paddingBottom: 110}}>
        <div className="pa-home-hero">
          <div className="eyebrow">生成 · generate</div>
          <h1 className="pa-home-h1">今天想要什么提示词？</h1>
          <p className="pa-home-sub">把零散想法整理成可复用的提示词资产，<br/>再慢慢沉淀成你的长期工作流。</p>
        </div>

        <div className="pa-three-col">
          <div className="pa-ql">
            <div className="pa-ql-top"><div className="pa-ql-ico"><PAIcon.Library/></div><div className="pa-ql-title">提示词库</div></div>
            <div className="pa-ql-desc">47 条已保存 · inbox / production 分档</div>
          </div>
          <div className="pa-ql">
            <div className="pa-ql-top"><div className="pa-ql-ico"><PAIcon.Blocks/></div><div className="pa-ql-title">模块</div></div>
            <div className="pa-ql-desc">可复用的系统提示片段、角色设定</div>
          </div>
          <div className="pa-ql">
            <div className="pa-ql-top"><div className="pa-ql-ico"><PAIcon.BarChart/></div><div className="pa-ql-title">统计</div></div>
            <div className="pa-ql-desc">运行次数、收藏率、token 花销</div>
          </div>
        </div>

        <div className="pa-section-head">
          <div><div className="eyebrow">提示词配方</div><h2 className="pa-section-h2">从一个模板开始</h2></div>
          <button className="pa-btn pa-btn-ghost pa-btn-sm">全部 <PAIcon.Ext/></button>
        </div>
        <div className="pa-template-grid">
          {[
            ["writing", "技术写作编辑", "以清晰度为目标的编辑器，保留作者原始语气。"],
            ["code", "代码评审", "读 diff，指出风险，给出可操作的修改建议。"],
            ["research", "市场调研摘要", "汇总搜索结果为结构化要点与引用来源。"],
            ["ops", "会议纪要", "录音抄本 → 决议、Action Items、下一步。"],
            ["writing", "客服邮件三分类", "把收件分类为 bug / feature / billing 并起草回复。"],
            ["code", "SQL 顾问", "解释执行计划，建议索引，只读。"],
          ].map(([t,ti,d],i)=>(
            <div key={i} className="pa-template-card">
              <div className="pa-template-tag">{t}</div>
              <div className="pa-template-title">{ti}</div>
              <div className="pa-template-desc">{d}</div>
            </div>
          ))}
        </div>
      </div>
    </PAShell>
  );
}

function RouteLogin() {
  return (
    <div className="pa-login">
      <div className="pa-login-card">
        <div className="pa-login-brand">
          <div className="pa-brand-mark"><PAIcon.Bot/></div>
          <span className="pa-login-brand-name">Prompt Agent</span>
        </div>
        <h1 className="pa-login-h1">欢迎回来</h1>
        <p className="pa-login-sub">Sign in to continue with your prompt library.</p>

        <div className="pa-login-field">
          <label>Email</label>
          <input className="pa-login-input" type="email" defaultValue="zack@prompt-agent.dev"/>
        </div>
        <div className="pa-login-field">
          <label>Password <a href="#">Forgot?</a></label>
          <input className="pa-login-input" type="password" defaultValue="••••••••••••"/>
        </div>
        <button className="pa-login-submit">Sign in</button>

        <div className="pa-login-divider">OR</div>
        <button className="pa-login-oauth"><PAIcon.Github/>Continue with GitHub</button>
        <button className="pa-login-oauth">
          <svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.19 3.31v2.77h3.54c2.07-1.9 3.29-4.71 3.29-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.54-2.77c-.98.66-2.23 1.04-3.74 1.04-2.87 0-5.3-1.94-6.17-4.55H2.18v2.86A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.83 14.06A6.6 6.6 0 0 1 5.48 12c0-.72.12-1.42.35-2.06V7.08H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.92l3.65-2.86z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.1 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.08l3.65 2.86C6.7 7.32 9.13 5.38 12 5.38z"/></svg>
          Continue with Google
        </button>

        <div className="pa-login-foot">
          Don't have an account? <a href="#">Create one</a>
        </div>
      </div>
    </div>
  );
}

function RouteDocs() {
  return (
    <PAShell route="recipes" crumbs={["Docs", "Getting started"]}>
      <div className="pa-docs">
        <div className="eyebrow pa-docs-eye">DOCS · 01 / getting started</div>
        <h1 className="pa-docs-h1">Build your prompt library.</h1>
        <p className="pa-docs-lede">
          Prompt Agent turns scattered prompt ideas into versioned, testable assets. This guide walks through running your first task, saving the result, and promoting it from <code>inbox</code> to <code>production</code>.
        </p>

        <h2>1. Run a task</h2>
        <p>From the home screen, type what you want the agent to draft. The agent reasons through four phases — Thought, Action, Observation, Final — and streams the result into the canvas.</p>
        <pre>{`$ prompt-agent run "draft a release-note editor"
→ streaming · gpt-4o · 1,284 tokens in
✓ final draft in 14.2s`}</pre>

        <h2>2. Keep what's worth keeping</h2>
        <p>If the draft is useful, hit <code>Save to library</code>. Prompts start in <code>inbox</code>. Once you've run them a few times and they hold up, promote them to <code>production</code>.</p>
        <div className="callout">Prompts are local-first. Nothing leaves your machine unless you explicitly sync to a remote.</div>

        <h2>3. Version, don't mutate</h2>
        <p>Editing a production prompt creates a new version. Old versions stay runnable — you can A/B any two, and the stats tab shows quality drift across versions.</p>

        <ul>
          <li><code>v1</code> — first working draft</li>
          <li><code>v2</code> — clarifies output format</li>
          <li><code>v3</code> — adds a few-shot example (current)</li>
        </ul>

        <h2>Next</h2>
        <p>Head to <code>/prompts</code> to browse what you've saved, or <code>/playground</code> to iterate on a prompt with side-by-side variables and a live console.</p>
      </div>
    </PAShell>
  );
}

Object.assign(window, { RouteHome, RouteLogin, RouteDocs });
