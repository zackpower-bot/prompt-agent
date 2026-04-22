// Route 6: Prompts list + Route 7: Prompt detail

function QualityDot({ score }) {
  const c = score >= 0.85 ? "#5E8B5F" : score >= 0.7 ? "#C48A3A" : "#C97B4A";
  return (
    <span className="pa-quality">
      <span className="pa-quality-dot" style={{background: c}}></span>
      <span className="mono-sm">{Math.round(score*100)}</span>
    </span>
  );
}

function RoutePrompts({ theme = "light" }) {
  const rows = [
    { title: "tech-writer-v2",        desc: "Edit for clarity. Preserve voice. Return structured edits with inline [[clarify]] flags.", tag: "writing",  scope: "production", ver: "v3", runs: 412, q: 0.92, updated: "2h ago" },
    { title: "code-reviewer-ts",      desc: "Read TS diffs. Flag risk. Give short, actionable suggestions grouped by severity.",        tag: "code",     scope: "inbox",      ver: "v1", runs: 38,  q: 0.76, updated: "yesterday" },
    { title: "meeting-notes",         desc: "Transcript → decisions, action items, owners, due-dates. Confidence per item.",           tag: "ops",      scope: "production", ver: "v4", runs: 1204, q: 0.88, updated: "4d ago" },
    { title: "market-scan-v1",        desc: "Given a query, produce a structured scan: top sources, conflicting claims, quotes.",     tag: "research", scope: "inbox",      ver: "v1", runs: 22,  q: 0.61, updated: "1w ago" },
    { title: "sql-advisor",           desc: "Read-only SQL advisor. Explains plans, suggests indexes, never writes.",                  tag: "code",     scope: "production", ver: "v2", runs: 514, q: 0.90, updated: "3d ago" },
    { title: "support-triage",        desc: "Classify inbound email: bug | feature | billing. Draft a reply in the team voice.",       tag: "ops",      scope: "production", ver: "v5", runs: 2310, q: 0.83, updated: "5h ago" },
    { title: "release-note-editor",   desc: "Turns internal change-log into external, de-hyped release notes.",                        tag: "writing",  scope: "inbox",      ver: "v1", runs: 11,  q: 0.68, updated: "6h ago" },
    { title: "docs-cleanup",          desc: "Pass over a docs file, kill dead sections, propose a new TOC.",                           tag: "writing",  scope: "deprecated", ver: "v3", runs: 84,  q: 0.55, updated: "42d ago" },
  ];
  return (
    <PAShell route="prompts" crumbs={["提示词库"]} theme={theme}
      topRight={<>
        <button className="pa-btn pa-btn-outline pa-btn-sm"><PAIcon.Save/>Import</button>
        <button className="pa-btn pa-btn-primary pa-btn-sm"><PAIcon.Plus/>New prompt</button>
      </>}>
      <div className="pa-prompts">
        <aside className="pa-filter-rail">
          <div className="pa-filter-group">
            <div className="h">Scope</div>
            {[["All", 47, true],["Production", 18],["Inbox", 22],["Deprecated", 7]].map(([l,c,a],i)=>(
              <div key={i} className={"pa-filter-row" + (a?" active":"")}><span>{l}</span><span className="c">{c}</span></div>
            ))}
          </div>
          <div className="pa-filter-group">
            <div className="h">Tag</div>
            {[["writing",14],["code",11],["ops",9],["research",6],["creative",4],["misc",3]].map(([l,c],i)=>(
              <div key={i} className="pa-filter-row"><span>{l}</span><span className="c">{c}</span></div>
            ))}
          </div>
          <div className="pa-filter-group">
            <div className="h">Model</div>
            {[["gpt-4o",21],["claude-3.5",18],["o1-mini",5],["other",3]].map(([l,c],i)=>(
              <div key={i} className="pa-filter-row"><span>{l}</span><span className="c">{c}</span></div>
            ))}
          </div>
        </aside>
        <div className="pa-prompts-main">
          <div className="pa-prompts-head">
            <div>
              <div className="eyebrow">47 prompts</div>
              <h1 className="pa-prompts-h1">Library</h1>
              <p className="pa-prompts-sub">Everything you've saved across inbox, production, and archive.</p>
            </div>
          </div>
          <div className="pa-prompts-toolbar">
            <div className="pa-search">
              <PAIcon.Search/>
              <input className="pa-input" placeholder="Search by name, tag, or content…"/>
            </div>
            <button className="pa-btn pa-btn-outline pa-btn-sm"><PAIcon.Filter/>Sort: recent</button>
            <div className="pa-view-switch">
              <button className="on"><PAIcon.ListIcon/></button>
              <button><PAIcon.GridIcon/></button>
            </div>
          </div>

          <div className="pa-prompt-list">
            {rows.map((r,i)=>(
              <div key={i} className="pa-prompt-row">
                <div className="pa-row-check"></div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{display:"flex", alignItems:"center", gap:8}}>
                    <span className="pa-row-title">{r.title}</span>
                    <span className="mono-sm t-muted">{r.ver}</span>
                  </div>
                  <div className="pa-row-desc">{r.desc}</div>
                  <div className="pa-row-meta">
                    <span className={"pa-badge " + (r.scope==="production"?"pa-badge-good":r.scope==="deprecated"?"pa-badge-destructive":"pa-badge-outline")}>{r.scope}</span>
                    <span className="pa-badge pa-badge-secondary">{r.tag}</span>
                    <span className="mono-sm t-muted">· {r.runs.toLocaleString()} runs</span>
                    <span className="mono-sm t-muted">· {r.updated}</span>
                  </div>
                </div>
                <div style={{display:"flex", alignItems:"center", gap:14, flexShrink:0}}>
                  <QualityDot score={r.q}/>
                  <button className="pa-icon-btn"><PAIcon.Play/></button>
                </div>
              </div>
            ))}
          </div>

          <div className="pa-pager">
            <span>Showing 1–8 of 47</span>
            <div className="btns">
              <button><PAIcon.ChevL/></button>
              <button className="on">1</button>
              <button>2</button>
              <button>3</button>
              <button>4</button>
              <button>5</button>
              <button>6</button>
              <button><PAIcon.ChevR/></button>
            </div>
          </div>
        </div>
      </div>
    </PAShell>
  );
}

function RoutePromptDetail({ theme = "light" }) {
  return (
    <PAShell route="prompts" crumbs={["提示词库", "tech-writer-v2"]} theme={theme}
      topRight={<>
        <button className="pa-btn pa-btn-outline pa-btn-sm"><PAIcon.Copy/>Fork</button>
        <button className="pa-btn pa-btn-outline pa-btn-sm">Edit</button>
        <button className="pa-btn pa-btn-primary pa-btn-sm"><PAIcon.Play/>Open in playground</button>
      </>}>
      <div className="pa-detail">
        <aside className="pa-detail-meta">
          <div className="pa-meta-section">
            <div className="h">Identity</div>
            <div className="pa-meta-kv">
              <div className="r"><span className="k">id</span><span className="v">prm_9cda</span></div>
              <div className="r"><span className="k">version</span><span className="v">v3</span></div>
              <div className="r"><span className="k">scope</span><span className="v">production</span></div>
              <div className="r"><span className="k">author</span><span className="v">@zack</span></div>
              <div className="r"><span className="k">updated</span><span className="v">2h ago</span></div>
            </div>
          </div>
          <div className="pa-meta-section">
            <div className="h">Defaults</div>
            <div className="pa-meta-kv">
              <div className="r"><span className="k">provider</span><span className="v">openai</span></div>
              <div className="r"><span className="k">model</span><span className="v">gpt-4o</span></div>
              <div className="r"><span className="k">temp</span><span className="v">0.3</span></div>
              <div className="r"><span className="k">max_tokens</span><span className="v">1,500</span></div>
            </div>
          </div>
          <div className="pa-meta-section">
            <div className="h">Performance · 30d</div>
            <div className="pa-meta-kv">
              <div className="r"><span className="k">runs</span><span className="v">412</span></div>
              <div className="r"><span className="k">avg latency</span><span className="v">11.4s</span></div>
              <div className="r"><span className="k">quality</span><span className="v">0.92</span></div>
              <div className="r"><span className="k">cost / run</span><span className="v">$0.018</span></div>
            </div>
          </div>
          <div className="pa-meta-section">
            <div className="h">Used by</div>
            <div style={{display:"flex", flexDirection:"column", gap:4, fontSize:12, fontFamily:"var(--font-mono)"}}>
              <div className="t-muted">· recipe/release-flow</div>
              <div className="t-muted">· module/editor-voice</div>
              <div className="t-muted">· 3 other prompts</div>
            </div>
          </div>
        </aside>

        <div className="pa-detail-body">
          <div className="pa-detail-head">
            <div className="eyebrow">PROMPT · writing / production</div>
            <h1 className="pa-detail-title">tech-writer-v2</h1>
            <p className="pa-detail-sub">A careful editor for release notes and short-form technical writing. Preserves voice, returns a structured diff with inline clarification flags.</p>
            <div className="pa-detail-pills">
              <span className="pa-badge pa-badge-good">production</span>
              <span className="pa-badge pa-badge-secondary">writing</span>
              <span className="pa-badge pa-badge-outline">release-notes</span>
              <span className="pa-badge pa-badge-outline">editor</span>
              <span className="pa-badge pa-badge-outline">structured-output</span>
            </div>
          </div>

          <div className="eyebrow" style={{marginBottom:8}}>System</div>
          <div className="pa-code-block">{`You are a careful technical-writing editor for `}<span className="pa-var">{`{{doc_type}}`}</span>{`.
Your job is not to rewrite — it is to improve clarity while
preserving the author's `}<span className="pa-var">{`{{voice}}`}</span>{`.

For each input you receive:
  1. Preserve sentences that already read cleanly.
  2. Flag unclear claims inline with [[clarify: ...]].
  3. Return a structured diff, not prose:
       { edits: [{ before, after, reason }], flags: [ ... ] }
  4. Cap edits at `}<span className="pa-var">{`{{max_edits}}`}</span>{`. Never invent features.
  5. If you are unsure, prefer [[clarify]] over a guess.`}</div>

          <div className="eyebrow" style={{margin:"20px 0 8px"}}>Variables</div>
          <div style={{display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap: 8}}>
            {[
              ["doc_type", "release notes", "string"],
              ["voice", "concise, no hype", "string"],
              ["max_edits", "12", "number"],
            ].map(([k,v,t],i)=>(
              <div key={i} className="pa-kv">
                <div className="pa-kv-row"><span className="pa-kv-k">{k}</span><span className="pa-kv-v">{t}</span></div>
                <div style={{color:"var(--foreground)", fontSize:11.5}}>{v}</div>
              </div>
            ))}
          </div>

          <div className="pa-version-strip">
            <div className="eyebrow" style={{marginBottom:8}}>Versions</div>
            <div className="pa-version-rows">
              {[
                ["v3", "current — adds few-shot example", "2h ago", 0.92, true],
                ["v2", "clarifies output format", "6d ago", 0.88, false],
                ["v1", "first working draft", "24d ago", 0.76, false],
              ].map(([v, note, when, q, cur],i)=>(
                <div key={i} className={"pa-version-row" + (cur?" current":"")}>
                  <span className="mono" style={{fontSize:11.5, width:28}}>{v}</span>
                  <span style={{flex:1}}>{note}</span>
                  <QualityDot score={q}/>
                  <span className="mono-sm t-muted" style={{width:60, textAlign:"right"}}>{when}</span>
                  {cur ? <span className="pa-badge pa-badge-default">current</span>
                       : <button className="pa-btn pa-btn-ghost pa-btn-xs">Restore</button>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PAShell>
  );
}

Object.assign(window, { RoutePrompts, RoutePromptDetail });
