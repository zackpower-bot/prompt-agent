// Route 4: Active workspace + Route 5: Playground

function PhaseRow({ kind, label, text, pre }) {
  const map = {
    thought:    { color: "#7A6F5E", icon: <PAIcon.Brain/> },
    action:     { color: "#8A6020", icon: <PAIcon.Wrench/> },
    observation:{ color: "#446746", icon: <PAIcon.Search/> },
    final:      { color: "#C97B4A", icon: <PAIcon.Sparkles/> },
  };
  const m = map[kind];
  return (
    <div className="pa-phase">
      <div className="pa-phase-label" style={{color: m.color}}>{m.icon}<span>{label}</span></div>
      <div className="pa-phase-text">{text}{pre && <pre className="pa-mono-pre">{pre}</pre>}</div>
    </div>
  );
}

function RouteActive({ theme = "light" }) {
  return (
    <div className="pa-shell" data-theme={theme}>
      <PASidebar route="home"/>
      <div className="pa-main">
        <PATopBar crumbs={["生成", "run_8a4f2c"]}
          right={<span className="mono-sm t-muted" style={{marginRight: 8}}>00:14 · streaming</span>}/>
        <div className="pa-content">
          <div className="pa-task-banner">
            <div className="pa-task-inner">
              <div>
                <div className="pa-task-eye">Active task · 00:14</div>
                <div className="pa-task-title">Draft a technical-writing editor prompt for release-note edits.</div>
              </div>
              <div style={{display:"flex", gap: 6}}>
                <button className="pa-btn pa-btn-outline pa-btn-sm"><PAIcon.Square/>Stop</button>
                <button className="pa-btn pa-btn-ghost pa-btn-sm">Show run details</button>
              </div>
            </div>
          </div>

          <div className="pa-canvas-wrap" style={{paddingBottom: 120}}>
            <div className="pa-canvas">
              <div className="pa-canvas-head">
                <span className="pa-badge pa-badge-default"><span className="pa-pulse"></span>streaming</span>
                <span className="mono-sm t-muted">gpt-4o · 1,284 in · 612 out</span>
              </div>

              <PhaseRow kind="thought" label="THOUGHT" text="User wants an editor constrained to release notes. I should preserve voice, focus on clarity, and return structured edits rather than a rewrite."/>
              <PhaseRow kind="action" label="ACTION · search_prompt_library" text={<code style={{fontFamily:"var(--font-mono)", fontSize:11, background:"var(--muted)", padding:"1px 5px", borderRadius:3}}>{`{ tag: "writing", scope: "production" }`}</code>}/>
              <PhaseRow kind="observation" label="OBSERVATION · 3 matches" text="Found prior drafts: technical-writer-v2 (92%), release-note-editor-v1 (76%), docs-cleanup-v3 (deprecated). Will remix v2 + v1."/>
              <PhaseRow kind="final" label="DRAFT PROMPT" text="" pre={`You are a careful technical-writing editor for release notes.
For each input:
  1. Preserve the original voice. Do NOT rewrite sentences that read cleanly.
  2. Flag unclear claims inline with [[clarify: ...]].
  3. Return a structured diff, not prose:
     { edits: [{ before, after, reason }], flags: [ ... ] }
  4. Never invent new features.`}/>

              <div className="pa-canvas-actions">
                <button className="pa-btn pa-btn-primary pa-btn-sm"><PAIcon.Plus/>Save to library</button>
                <button className="pa-btn pa-btn-outline pa-btn-sm"><PAIcon.Play/>Run again</button>
                <button className="pa-btn pa-btn-ghost pa-btn-sm"><PAIcon.Copy/>Copy</button>
                <span style={{flex:1}}/>
                <span className="mono-sm t-muted">run_8a4f · 14.2s</span>
              </div>
            </div>
          </div>
        </div>
        <PAComposer/>
      </div>

      {/* Right drawer */}
      <aside className="pa-drawer">
        <div className="pa-drawer-head">
          <span className="pa-drawer-title">Run details</span>
          <button className="pa-icon-btn"><PAIcon.X/></button>
        </div>
        <div className="pa-drawer-body">
          <div>
            <div className="eyebrow" style={{marginBottom:6}}>Run</div>
            <div className="pa-drawer-row"><span className="k">id</span><span className="v">run_8a4f2c</span></div>
            <div className="pa-drawer-row"><span className="k">model</span><span className="v">gpt-4o</span></div>
            <div className="pa-drawer-row"><span className="k">provider</span><span className="v">openai</span></div>
            <div className="pa-drawer-row"><span className="k">tokens</span><span className="v">1,284 → 612</span></div>
            <div className="pa-drawer-row"><span className="k">cost</span><span className="v">$0.024</span></div>
            <div className="pa-drawer-row"><span className="k">duration</span><span className="v">14.2s</span></div>
          </div>

          <div>
            <div className="eyebrow" style={{marginBottom:6}}>Trace</div>
            <div style={{display:"flex", flexDirection:"column", gap:4}}>
              {[
                ["00:00", "task_start", "info"],
                ["00:02", "phase → thought", "info"],
                ["00:03", "tool → search_prompt_library", "ok"],
                ["00:05", "observation · 3 hits", "ok"],
                ["00:06", "phase → final", "info"],
                ["00:14", "streaming", "info"],
              ].map(([t,n,_],i)=>(
                <div key={i} className="pa-trace-item">
                  <span className="pa-trace-time">{t}</span>
                  <span>{n}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="eyebrow" style={{marginBottom:6}}>Context used</div>
            <div style={{display:"flex", flexDirection:"column", gap:4, fontSize:11.5, fontFamily:"var(--font-mono)"}}>
              <div className="t-muted">· technical-writer-v2</div>
              <div className="t-muted">· release-note-editor-v1</div>
              <div className="t-muted">· tag:writing, scope:production</div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

function RoutePlayground({ theme = "light" }) {
  return (
    <PAShell route="playground" crumbs={["Playground", "tech-writer-v2"]} theme={theme}
      topRight={<>
        <button className="pa-btn pa-btn-outline pa-btn-sm"><PAIcon.Save/>Save version</button>
        <button className="pa-btn pa-btn-primary pa-btn-sm"><PAIcon.Play/>Run</button>
      </>}>
      <div className="pa-pg">
        {/* Brief 280 */}
        <div className="pa-pg-col">
          <div className="pa-pg-col-head">
            <span className="pa-pg-col-title">Brief</span>
            <span className="mono-sm t-muted">v3 · draft</span>
          </div>
          <div className="pa-pg-col-body">
            <div>
              <div className="pa-pg-label">System</div>
              <div className="pa-code-block" style={{fontSize:11.5, padding:"10px 12px"}}>{`You are a careful editor for
{{doc_type}}. Preserve voice.
Return { edits, flags }.`}</div>
            </div>
            <div>
              <div className="pa-pg-label">Variables</div>
              <div style={{display:"flex", flexDirection:"column", gap:6}}>
                <div className="pa-kv">
                  <div className="pa-kv-row"><span className="pa-kv-k">doc_type</span></div>
                  <input className="pa-input" defaultValue="release notes" style={{height:26, fontSize:11.5, fontFamily:"var(--font-mono)"}}/>
                </div>
                <div className="pa-kv">
                  <div className="pa-kv-row"><span className="pa-kv-k">voice</span></div>
                  <input className="pa-input" defaultValue="concise, no hype" style={{height:26, fontSize:11.5, fontFamily:"var(--font-mono)"}}/>
                </div>
                <div className="pa-kv">
                  <div className="pa-kv-row"><span className="pa-kv-k">max_edits</span></div>
                  <input className="pa-input" defaultValue="12" style={{height:26, fontSize:11.5, fontFamily:"var(--font-mono)"}}/>
                </div>
              </div>
            </div>
            <div>
              <div className="pa-pg-label">Model</div>
              <div className="pa-kv">
                <div className="pa-kv-row"><span className="pa-kv-k">provider</span><span className="pa-kv-v">openai</span></div>
                <div className="pa-kv-row"><span className="pa-kv-k">model</span><span className="pa-kv-v">gpt-4o</span></div>
                <div className="pa-kv-row"><span className="pa-kv-k">temp</span><span className="pa-kv-v">0.3</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Stage */}
        <div className="pa-pg-col pa-stage">
          <div className="pa-pg-col-head" style={{background:"var(--muted)"}}>
            <span className="pa-pg-col-title">Stage</span>
            <div style={{display:"flex", gap:6}}>
              <button className="pa-btn pa-btn-outline pa-btn-xs">Diff v2</button>
              <button className="pa-btn pa-btn-outline pa-btn-xs">Input</button>
              <button className="pa-btn pa-btn-outline pa-btn-xs">Output</button>
            </div>
          </div>
          <div className="pa-stage-body">
            <div className="pa-pg-label">Input · sample release note</div>
            <div className="pa-code-block" style={{marginBottom:14}}>{`We're absolutely thrilled to announce a game-changing new feature
that revolutionizes how users experience collaboration in our app.
You'll love it!`}</div>

            <div className="pa-pg-label">Output · structured edits</div>
            <div className="pa-code-block">{`{
  "edits": [
    {
      "before": "absolutely thrilled to announce",
      "after":  "shipping",
      "reason": "Removes hype. Matches the 'concise, no hype' voice."
    },
    {
      "before": "a game-changing new feature that revolutionizes",
      "after":  "a new way to handle",
      "reason": "Rewrites hype phrasing while keeping topic."
    },
    {
      "before": "You'll love it!",
      "after":  "[[clarify: who is this for?]]",
      "reason": "Claim is unsupported. Flag for author."
    }
  ],
  "flags": [
    "voice: no hype phrases detected after edit"
  ]
}`}</div>
          </div>
        </div>

        {/* Console 360 */}
        <div className="pa-pg-col">
          <div className="pa-pg-col-head">
            <span className="pa-pg-col-title">Console</span>
            <div style={{display:"flex", gap:6}}>
              <button className="pa-btn pa-btn-ghost pa-btn-xs">Clear</button>
              <span className="mono-sm t-muted">tail</span>
            </div>
          </div>
          <div className="pa-pg-col-body" style={{gap:2}}>
            {[
              ["00:00.01", "info", "run_start", "model=gpt-4o temp=0.3"],
              ["00:00.28", "info", "load_brief", "v3 (draft, 4 vars)"],
              ["00:00.42", "info", "render_prompt", "1,284 tokens"],
              ["00:01.14", "ok",   "stream_open", ""],
              ["00:06.72", "warn", "flag",        "hype phrase detected"],
              ["00:08.33", "ok",   "edit",        "#1 · absolutely thrilled→shipping"],
              ["00:09.01", "ok",   "edit",        "#2 · game-changing→new way"],
              ["00:10.58", "ok",   "edit",        "#3 · You'll love it→[[clarify]]"],
              ["00:11.94", "ok",   "schema_ok",   "{ edits:3, flags:1 }"],
              ["00:12.10", "info", "stream_close",""],
              ["00:14.20", "ok",   "done",        "612 tokens · $0.011"],
            ].map(([t,lv,tag,msg],i)=>(
              <div key={i} className={"pa-log-line " + lv}>
                <span className="t">{t}</span>
                <span className="tag">{tag}</span>
                {msg}
              </div>
            ))}
            <div style={{marginTop:10, padding:"8px 10px", background:"var(--muted)", borderRadius:6, fontFamily:"var(--font-mono)", fontSize:11, color:"var(--muted-foreground)"}}>
              <span style={{color:"var(--agent)"}}>▎</span> waiting for next run…
            </div>
          </div>
        </div>
      </div>
    </PAShell>
  );
}

Object.assign(window, { RouteActive, RoutePlayground });
