// Route 8: Editor + Route 9: Modules + Route 10: Admin/deny

function RouteEditor({ theme = "light" }) {
  return (
    <PAShell route="prompts" crumbs={["提示词库", "tech-writer-v2", "Edit"]} theme={theme}
      topRight={<>
        <button className="pa-btn pa-btn-ghost pa-btn-sm">Cancel</button>
        <button className="pa-btn pa-btn-outline pa-btn-sm"><PAIcon.Eye/>Preview</button>
        <button className="pa-btn pa-btn-primary pa-btn-sm"><PAIcon.Save/>Save v4</button>
      </>}>
      <div className="pa-editor">
        <div className="pa-editor-form">
          <div className="eyebrow" style={{marginBottom: 4}}>EDIT · new version</div>
          <h1 className="pa-prompts-h1" style={{marginBottom: 16}}>tech-writer-v2</h1>

          <div className="pa-field">
            <label>Name <span className="hint">lowercase, hyphenated</span></label>
            <input className="pa-input" defaultValue="tech-writer-v2"/>
          </div>

          <div className="pa-field">
            <label>Description <span className="hint">one line</span></label>
            <input className="pa-input" defaultValue="A careful editor for release notes. Preserves voice."/>
          </div>

          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap: 10}}>
            <div className="pa-field">
              <label>Scope</label>
              <div className="pa-kv"><div className="pa-kv-row"><span className="pa-kv-k">production</span><span className="pa-kv-v">▾</span></div></div>
            </div>
            <div className="pa-field">
              <label>Tag</label>
              <div className="pa-kv"><div className="pa-kv-row"><span className="pa-kv-k">writing</span><span className="pa-kv-v">▾</span></div></div>
            </div>
          </div>

          <div className="pa-field">
            <label>System prompt <span className="hint">{`{{variables}}`} inlined</span></label>
            <textarea className="pa-input pa-textarea" defaultValue={`You are a careful technical-writing editor for {{doc_type}}.
Preserve the author's {{voice}}. Do not rewrite clean sentences.

Return a structured diff:
  { edits: [{ before, after, reason }], flags: [ ... ] }

Cap edits at {{max_edits}}. If unsure, use [[clarify: ...]].`}/>
          </div>

          <div className="pa-field">
            <label>Variables</label>
            <div style={{display:"flex", flexDirection:"column", gap:6}}>
              {[
                ["doc_type", "string", "release notes"],
                ["voice", "string", "concise, no hype"],
                ["max_edits", "number", "12"],
              ].map(([k,t,v],i)=>(
                <div key={i} style={{display:"grid", gridTemplateColumns:"1fr 80px 1.2fr 28px", gap:6}}>
                  <input className="pa-input" defaultValue={k} style={{fontFamily:"var(--font-mono)", fontSize:12}}/>
                  <input className="pa-input" defaultValue={t} style={{fontFamily:"var(--font-mono)", fontSize:12}}/>
                  <input className="pa-input" defaultValue={v} style={{fontSize:12}}/>
                  <button className="pa-icon-btn"><PAIcon.X/></button>
                </div>
              ))}
              <button className="pa-btn pa-btn-ghost pa-btn-sm" style={{alignSelf:"flex-start"}}><PAIcon.Plus/>Add variable</button>
            </div>
          </div>

          <div className="pa-field">
            <label>Commit message <span className="hint">saved with v4</span></label>
            <input className="pa-input" placeholder="e.g. tighten voice guardrail, cap edits at 12"/>
          </div>
        </div>

        <div className="pa-editor-preview">
          <div className="eyebrow" style={{marginBottom:8}}>Live preview</div>
          <div className="pa-canvas" style={{padding: "16px 18px"}}>
            <div className="pa-canvas-head" style={{paddingBottom: 10, marginBottom: 12}}>
              <span className="pa-badge pa-badge-default">v4 · preview</span>
              <span className="mono-sm t-muted">gpt-4o · temp 0.3</span>
            </div>
            <div className="eyebrow" style={{marginBottom: 6}}>Rendered system</div>
            <div className="pa-code-block" style={{marginBottom: 14, fontSize: 11.5}}>{`You are a careful technical-writing editor for `}
              <span className="pa-var">release notes</span>{`.
Preserve the author's `}<span className="pa-var">concise, no hype</span>{`. Do not rewrite clean sentences.

Return a structured diff:
  { edits: [{ before, after, reason }], flags: [ ... ] }

Cap edits at `}<span className="pa-var">12</span>{`. If unsure, use [[clarify: ...]].`}</div>

            <div className="eyebrow" style={{marginBottom: 6}}>Diff vs v3</div>
            <div className="pa-code-block" style={{fontSize: 11.5, lineHeight: 1.7}}>
              <div style={{color:"#B4583F"}}>{`- Return a structured diff, not prose:`}</div>
              <div style={{color:"#446746"}}>{`+ Return a structured diff:`}</div>
              <div style={{color:"var(--muted-foreground)"}}>{`   { edits: [{ before, after, reason }], flags: [ ... ] }`}</div>
              <div style={{color:"#B4583F"}}>{`- Cap edits at {{max_edits}}. Never invent features.`}</div>
              <div style={{color:"#446746"}}>{`+ Cap edits at {{max_edits}}. If unsure, use [[clarify: ...]].`}</div>
            </div>

            <div style={{display:"flex", gap:6, marginTop: 14}}>
              <button className="pa-btn pa-btn-outline pa-btn-sm"><PAIcon.Play/>Dry-run with defaults</button>
              <span style={{flex:1}}/>
              <span className="mono-sm t-muted">2 changes · +14 / −18 chars</span>
            </div>
          </div>
        </div>
      </div>
    </PAShell>
  );
}

function ModuleCard({ title, desc, kind, uses, tag, draft, suggested }) {
  return (
    <div className={"pa-module-card" + (draft ? " draft" : "") + (suggested ? " pa-sug-card" : "")}>
      <div className="pa-module-head">
        <div>
          <div className="pa-module-title">{title}</div>
          <div className="mono-sm t-muted" style={{marginTop:2}}>{kind}</div>
        </div>
        {suggested && <span className="pa-sug-badge"><PAIcon.Sparkles/>suggested</span>}
        {draft && !suggested && <span className="pa-badge pa-badge-outline">draft</span>}
        {!draft && !suggested && <span className="pa-badge pa-badge-secondary">{tag}</span>}
      </div>
      <div className="pa-module-desc">{desc}</div>
      <div className="pa-module-foot">
        {uses !== undefined && <><span>used by {uses}</span><span>·</span></>}
        <span>{kind === "voice" ? "voice module" : kind === "format" ? "output format" : kind === "guardrail" ? "guardrail" : "few-shot"}</span>
      </div>
    </div>
  );
}

function RouteModules({ theme = "light" }) {
  return (
    <PAShell route="modules" crumbs={["模块"]} theme={theme}
      topRight={<>
        <button className="pa-btn pa-btn-outline pa-btn-sm"><PAIcon.Filter/>All types</button>
        <button className="pa-btn pa-btn-primary pa-btn-sm"><PAIcon.Plus/>New module</button>
      </>}>
      <div className="pa-modules">
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom: 18}}>
          <div>
            <div className="eyebrow">24 modules · composable parts</div>
            <h1 className="pa-prompts-h1">模块</h1>
            <p className="pa-prompts-sub">Reusable fragments — voice, output format, guardrails, few-shot sets. Drop into any prompt with <code style={{fontFamily:"var(--font-mono)", fontSize:11, background:"var(--muted)", padding:"1px 5px", borderRadius:3}}>{`{{module:name}}`}</code>.</p>
          </div>
        </div>

        <div className="eyebrow" style={{marginBottom:10}}>Your modules</div>
        <div className="pa-modules-grid">
          <ModuleCard title="editor-voice/concise" kind="voice"     tag="voice"     uses={7}  desc="Enforces a concise, no-hype register. Strips 'absolutely', 'thrilled', 'game-changing'."/>
          <ModuleCard title="structured-diff"      kind="format"    tag="format"    uses={11} desc="Output schema for edit tasks: { edits: [{ before, after, reason }], flags: [] }."/>
          <ModuleCard title="no-pii-guardrail"     kind="guardrail" tag="guardrail" uses={14} desc="Refuse to return email, phone, SSN, or anything matching a credit-card regex. Return [[redacted]]."/>
          <ModuleCard title="release-note-examples" kind="few-shot" tag="few-shot"  uses={3}  desc="Three input/output pairs for release-note rewrites. Kept short to keep prompts cheap."/>
          <ModuleCard title="ops-triage-labels"    kind="format"    tag="format"    uses={2}  desc="Enum constraint: 'bug' | 'feature' | 'billing' | 'other'. Includes confidence field."/>
          <ModuleCard title="clarify-over-guess"   kind="guardrail" tag="guardrail" uses={9}  desc="If confidence < 0.6, emit [[clarify: ...]] inline. Never fabricate."/>
          <ModuleCard title="sql-readonly"         kind="guardrail" tag="guardrail" uses={5}  desc="Only SELECT / EXPLAIN. Refuse INSERT / UPDATE / DELETE / DDL."/>
          <ModuleCard title="meeting-action-items" kind="format"    tag="format"    uses={6}  desc="Schema: { decisions: [], actions: [{owner, due}], open_questions: [] }."/>
        </div>

        <div className="eyebrow" style={{margin:"22px 0 10px"}}>Suggested · inferred from your last 30 runs</div>
        <div className="pa-modules-grid">
          <ModuleCard suggested title="dehype-register"   kind="voice"     desc="Noticed in 6 prompts: you rewrite 'revolutionary', 'next-gen', 'seamless'. Extract as a shared voice module?"/>
          <ModuleCard suggested title="json-schema-strict" kind="format"    desc="Your last 4 editors all specify the same output schema shape. Promote to a module and reference it."/>
          <ModuleCard suggested title="cite-before-claim"  kind="guardrail" desc="In research prompts, you consistently require a source URL per claim. Worth formalizing."/>
        </div>
      </div>
    </PAShell>
  );
}

function RouteAdmin({ theme = "light" }) {
  return (
    <PAShell route="admin" crumbs={["设置", "Access"]} theme={theme}>
      <div className="pa-admin">
        <aside className="pa-admin-nav">
          <div className="pa-nav-group-label" style={{padding:"0 10px 6px"}}>ADMIN</div>
          <div className="nv">General</div>
          <div className="nv">Workspace</div>
          <div className="nv active">Access &amp; safety</div>
          <div className="nv">Providers</div>
          <div className="nv">API keys</div>
          <div className="nv">Billing</div>
          <div className="pa-nav-group-label" style={{padding:"14px 10px 6px"}}>DEV</div>
          <div className="nv">Webhooks</div>
          <div className="nv">Audit log</div>
        </aside>

        <div className="pa-admin-body">
          <div className="eyebrow">SETTINGS · access &amp; safety</div>
          <h1 className="pa-prompts-h1">Access &amp; safety</h1>
          <p className="pa-prompts-sub" style={{marginBottom: 22}}>Control what leaves the workspace, and who can promote a prompt to production.</p>

          <div className="pa-deny" style={{marginBottom: 22}}>
            <div className="pa-deny-ico"><PAIcon.Warn/></div>
            <div style={{flex:1}}>
              <div style={{fontSize:13, fontWeight:500, marginBottom:2}}>Last run was blocked by a guardrail.</div>
              <div style={{fontSize:12, color:"var(--muted-foreground)", lineHeight:1.6}}>
                <code style={{fontFamily:"var(--font-mono)", fontSize:11, background:"color-mix(in oklab, var(--destructive) 12%, transparent)", padding:"1px 5px", borderRadius:3, color:"var(--destructive)"}}>no-pii-guardrail</code>
                {` matched an email address in the output of `}
                <code style={{fontFamily:"var(--font-mono)", fontSize:11, background:"var(--muted)", padding:"1px 5px", borderRadius:3}}>support-triage v5</code>
                {`. The response was redacted and the run was logged.`}
              </div>
              <div style={{display:"flex", gap:6, marginTop:10}}>
                <button className="pa-btn pa-btn-outline pa-btn-xs">View run</button>
                <button className="pa-btn pa-btn-ghost pa-btn-xs">Dismiss</button>
              </div>
            </div>
          </div>

          <div className="pa-admin-sec">
            <h2 className="pa-admin-sec-h">Production gate</h2>
            <p className="pa-admin-sec-sub">Who can promote a prompt from inbox to production.</p>
            <div className="pa-setting-row">
              <div>
                <div className="lbl">Require review before production</div>
                <div className="desc">A second workspace member must approve before a prompt flips to <code style={{fontFamily:"var(--font-mono)", fontSize:11}}>production</code>.</div>
              </div>
              <div className="pa-switch on"></div>
            </div>
            <div className="pa-setting-row">
              <div>
                <div className="lbl">Auto-archive deprecated &gt; 30d</div>
                <div className="desc">Prompts marked deprecated will move out of default views after a month.</div>
              </div>
              <div className="pa-switch on"></div>
            </div>
          </div>

          <div className="pa-admin-sec">
            <h2 className="pa-admin-sec-h">Safety guardrails</h2>
            <p className="pa-admin-sec-sub">Run on every output before it reaches the user or an integration.</p>
            <div className="pa-setting-row">
              <div>
                <div className="lbl">PII redaction <span className="pa-badge pa-badge-good" style={{marginLeft:6}}>active</span></div>
                <div className="desc">Strip emails, phone numbers, national IDs, credit-card digits.</div>
              </div>
              <div className="pa-switch on"></div>
            </div>
            <div className="pa-setting-row">
              <div>
                <div className="lbl">Refuse secrets <span className="pa-badge pa-badge-good" style={{marginLeft:6}}>active</span></div>
                <div className="desc">Block output containing anything that looks like an API key or access token.</div>
              </div>
              <div className="pa-switch on"></div>
            </div>
            <div className="pa-setting-row">
              <div>
                <div className="lbl">Block external links</div>
                <div className="desc">Reject outputs with http:// or https:// references not on the allowlist.</div>
              </div>
              <div className="pa-switch"></div>
            </div>
          </div>

          <div className="pa-admin-sec">
            <h2 className="pa-admin-sec-h">Data retention</h2>
            <p className="pa-admin-sec-sub">How long we keep run transcripts on disk.</p>
            <div className="pa-setting-row">
              <div>
                <div className="lbl">Keep full transcripts for</div>
                <div className="desc">Metadata (model, tokens, cost, status) is always retained.</div>
              </div>
              <div style={{display:"flex", gap:6}}>
                {["7d","30d","90d","forever"].map((d,i)=>(
                  <button key={i} className={"pa-btn pa-btn-xs " + (d==="30d"?"pa-btn-primary":"pa-btn-outline")}>{d}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="pa-admin-sec">
            <h2 className="pa-admin-sec-h">Danger zone</h2>
            <div className="pa-setting-row" style={{borderColor:"color-mix(in oklab, var(--destructive) 25%, var(--border))"}}>
              <div>
                <div className="lbl" style={{color:"var(--destructive)"}}>Wipe all deprecated prompts</div>
                <div className="desc">Permanently delete 7 prompts marked deprecated. Cannot be undone.</div>
              </div>
              <button className="pa-btn pa-btn-danger pa-btn-sm">Wipe…</button>
            </div>
          </div>
        </div>
      </div>
    </PAShell>
  );
}

Object.assign(window, { RouteEditor, RouteModules, RouteAdmin });
