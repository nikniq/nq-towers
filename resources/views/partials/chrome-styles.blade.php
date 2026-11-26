{{-- Shared styles for the top menu account area and the footer. --}}
.acct { display: inline-flex; align-items: center; gap: 8px; font-size: 0.85rem; flex-wrap: wrap; }
.acct img { border-radius: 50%; border: 1px solid var(--edge); }
.acct-name { font-weight: 600; max-width: 12em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.acct form { margin: 0; }
.acct-btn { display: inline-flex; align-items: center; min-height: 32px; padding: 4px 12px; border-radius: 999px; font: inherit; font-size: 0.85rem; font-weight: 600; text-decoration: none; cursor: pointer; background: var(--panel); border: 1px solid var(--edge); color: var(--text); }
.acct-btn:hover, .acct-btn:focus-visible, .acct-btn.on { border-color: var(--accent); }
.acct-primary { background: var(--gold); border-color: var(--gold); color: #1a1406; }
.acct-primary:hover, .acct-primary:focus-visible { filter: brightness(1.08); border-color: var(--gold); }
.site-foot { max-width: 860px; margin: 32px auto 0; padding: 16px 16px 24px; border-top: 1px solid var(--edge); text-align: center; font-size: 0.85rem; color: var(--muted); }
.site-foot nav { display: flex; flex-wrap: wrap; justify-content: center; gap: 4px 18px; }
.site-foot a { color: var(--muted); text-decoration: none; padding: 6px 0; }
.site-foot a:hover, .site-foot a:focus-visible { color: var(--text); text-decoration: underline; }
.site-foot p { margin: 10px 0 0; }
body.fullscreen .site-foot { display: none; }
