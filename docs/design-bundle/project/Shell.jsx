// Icons + Shell for prompt-agent canvas

const PAIcon = {
  Bot: () => (<svg viewBox="0 0 24 24"><rect x="3" y="8" width="18" height="13" rx="3"/><path d="M12 2v6M8 13h.01M16 13h.01M9 17h6"/></svg>),
  Sparkles: () => (<svg viewBox="0 0 24 24"><path d="M9.93 2.25L12 7l2.07-4.75L19 4.32l-2.57 4.68L21 12l-4.57 3-2.36 4.75L12 17l-2.07 4.75L5 19.68 7.57 15 3 12l4.57-3L5 4.32z"/></svg>),
  Library: () => (<svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>),
  Blocks: () => (<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>),
  Layers: () => (<svg viewBox="0 0 24 24"><polygon points="12 2 22 8.5 12 15 2 8.5 12 2"/><polyline points="2 15.5 12 22 22 15.5"/></svg>),
  Book: () => (<svg viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>),
  Wrench: () => (<svg viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z"/></svg>),
  BarChart: () => (<svg viewBox="0 0 24 24"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>),
  History: () => (<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9"/><polyline points="3 4 3 12 11 12"/></svg>),
  Settings: () => (<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>),
  LogOut: () => (<svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>),
  Panel: () => (<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>),
  Search: () => (<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>),
  Send: () => (<svg viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>),
  Square: () => (<svg viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14" rx="1"/></svg>),
  Bell: () => (<svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>),
  Moon: () => (<svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3A7 7 0 0 0 21 12.79z"/></svg>),
  Sun: () => (<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>),
  Plus: () => (<svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>),
  Clock: () => (<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>),
  Tag: () => (<svg viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>),
  Ext: () => (<svg viewBox="0 0 24 24"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>),
  ChevR: () => (<svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>),
  ChevL: () => (<svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>),
  ChevD: () => (<svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>),
  Brain: () => (<svg viewBox="0 0 24 24"><path d="M12 4.5a2.5 2.5 0 0 0-4.96-.46 2.5 2.5 0 0 0-1.98 3A2.5 2.5 0 0 0 4.5 10.5a2.5 2.5 0 0 0 .58 3.11 2.5 2.5 0 0 0 1.33 4.15 2.5 2.5 0 0 0 4.09 1.74A2.5 2.5 0 0 0 12 19.5"/></svg>),
  Play: () => (<svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>),
  Copy: () => (<svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>),
  GridIcon: () => (<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>),
  ListIcon: () => (<svg viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>),
  Github: () => (<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.17c-3.34.73-4.04-1.41-4.04-1.41-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.08 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.77.42-1.31.76-1.61-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.3-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.93.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58C20.57 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z"/></svg>),
  Warn: () => (<svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>),
  Lock: () => (<svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>),
  User: () => (<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>),
  Key: () => (<svg viewBox="0 0 24 24"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>),
  Check: () => (<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>),
  X: () => (<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>),
  Eye: () => (<svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>),
  Save: () => (<svg viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>),
  Filter: () => (<svg viewBox="0 0 24 24"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>),
};

function PASidebar({ route, collapsed }) {
  const groups = [
    { label: "工作", items: [
      { id: "compile",   label: "编译",     icon: PAIcon.Brain },
      { id: "home",      label: "生成",     icon: PAIcon.Sparkles },
      { id: "playground",label: "Playground", icon: PAIcon.Play },
      { id: "prompts",   label: "提示词库", icon: PAIcon.Library },
      { id: "modules",   label: "模块",     icon: PAIcon.Blocks },
      { id: "recipes",   label: "配方",     icon: PAIcon.Book },
    ]},
    { label: "洞察", items: [
      { id: "stats",     label: "统计",     icon: PAIcon.BarChart },
      { id: "activity",  label: "活动",     icon: PAIcon.History },
    ]},
    { label: "系统", items: [
      { id: "admin",     label: "设置",     icon: PAIcon.Settings },
    ]},
  ];
  const favs = ["tech-writer-v2 · production", "code-reviewer-ts · inbox", "meeting-notes · production"];
  return (
    <aside className={"pa-side" + (collapsed ? " pa-side-collapsed" : "")}>
      <div className="pa-brand">
        <div className="pa-brand-mark"><PAIcon.Bot/></div>
        {!collapsed && <span className="pa-brand-name">Prompt Agent</span>}
      </div>
      {groups.map(g => (
        <div key={g.label}>
          {!collapsed && <div className="pa-nav-group-label">{g.label}</div>}
          {g.items.map(it => {
            const I = it.icon;
            return (
              <a key={it.id} className={"pa-nav-item" + (route === it.id ? " active" : "")} href="#" onClick={e=>e.preventDefault()}>
                <I/><span>{it.label}</span>
              </a>
            );
          })}
        </div>
      ))}
      {!collapsed && (
        <div className="pa-side-favs">
          <div className="pa-nav-group-label" style={{padding: "8px 10px 4px"}}>收藏</div>
          {favs.map((f,i) => <div key={i} className="pa-side-fav">{f}</div>)}
        </div>
      )}
      <div className="pa-side-foot">
        <button className="pa-icon-btn"><PAIcon.Moon/></button>
        {!collapsed && <button className="pa-icon-btn"><PAIcon.LogOut/></button>}
      </div>
    </aside>
  );
}

function PATopBar({ crumbs = ["生成"], showModel = true, right }) {
  return (
    <header className="pa-top">
      <div className="pa-top-left">
        <button className="pa-icon-btn"><PAIcon.Panel/></button>
        {crumbs.map((c,i) => (
          <React.Fragment key={i}>
            {i>0 && <span className="sep">/</span>}
            <span className={i === crumbs.length-1 ? "crumb" : ""}>{c}</span>
          </React.Fragment>
        ))}
      </div>
      {right}
      {showModel && <span className="pa-model-chip"><span className="dot"></span>openai · gpt-4o</span>}
      <button className="pa-icon-btn"><PAIcon.Bell/></button>
      <button className="pa-icon-btn"><PAIcon.Sun/></button>
    </header>
  );
}

function PAShell({ route, collapsed, crumbs, children, topRight, showModel, theme = "light", extra }) {
  return (
    <div className="pa-shell" data-theme={theme}>
      <PASidebar route={route} collapsed={collapsed}/>
      <div className="pa-main">
        <PATopBar crumbs={crumbs} showModel={showModel} right={topRight}/>
        <div className="pa-content">{children}</div>
      </div>
      {extra}
    </div>
  );
}

function PAComposer({ placeholder = "描述你想要的提示词...", hint = "Enter 发送 · Shift+Enter 换行 · ⌘K 选择模型", value }) {
  return (
    <div className="pa-composer-bar">
      <div className="pa-composer-inner">
        <div className="pa-composer">
          <textarea rows="1" placeholder={placeholder} defaultValue={value}></textarea>
          <button className="send"><PAIcon.Send/></button>
        </div>
        <div className="pa-composer-hint">{hint}</div>
      </div>
    </div>
  );
}

Object.assign(window, { PAIcon, PASidebar, PATopBar, PAShell, PAComposer });
