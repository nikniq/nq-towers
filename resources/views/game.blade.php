<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
    <meta http-equiv="Pragma" content="no-cache" />
    <meta http-equiv="Expires" content="0" />
    <link rel="icon" href="{{ asset('favicon.svg') }}?v={{ $build }}" type="image/svg+xml">
    <title>Tower Defence Game (Build {{ $build }})</title>
    <style>
        :root {
            --bg: #0f1419; --panel: #1b232c; --edge: #2c3845; --text: #e8eef4; --muted: #9fb0c0;
            --gold: #ffd45c; --red: #ff6b6b; --accent: #56b4e9;
        }
        * { box-sizing: border-box; }
        body {
            margin: 0; min-height: 100vh; color: var(--text); text-align: center;
            font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
            background: radial-gradient(1200px 600px at 50% -10%, #223040 0%, var(--bg) 60%);
        }
        h1 {
            margin: 18px 0 8px; font-size: 1.5rem; letter-spacing: 0.08em; text-transform: uppercase;
            background: linear-gradient(180deg, #fff 0%, #b9c7d6 100%);
            -webkit-background-clip: text; background-clip: text; color: transparent;
        }
        #ui {
            display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 10px 14px;
            margin: 0 auto 10px; padding: 10px 14px; max-width: 640px;
            background: var(--panel); border: 1px solid var(--edge); border-radius: 14px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04);
        }
        #ui .stats, #ui .controls { display: inline-flex; gap: 8px; align-items: center; flex-wrap: wrap; justify-content: center; }
        #money, #lives, #wave, #best, #score {
            padding: 6px 12px; border-radius: 999px; font-weight: 700; font-variant-numeric: tabular-nums;
            background: #0f1620; border: 1px solid var(--edge); font-size: 0.95rem;
        }
        #money { color: var(--gold); }
        #lives { color: var(--red); }
        #wave  { color: var(--accent); }
        #best  { color: var(--muted); }
        #score { color: #c9b6ff; }
        #muteBtn { min-width: 44px; font-size: 1rem; line-height: 1; }
        #muteBtn.muted { opacity: 0.6; }
        #wavePreview { display: inline-flex; gap: 8px; align-items: center; font-size: 0.8rem; color: var(--muted); min-height: 1.4em; }
        #wavePreview .pv { display: inline-flex; align-items: center; gap: 4px; font-weight: 700; color: var(--text); }
        #wavePreview .pv i { width: 10px; height: 10px; border-radius: 50%; display: inline-block; border: 1px solid rgba(0,0,0,0.5); }
        #wavePreview .pv.normal i  { background: #ff4d4d; }
        #wavePreview .pv.fast i    { background: #2ef2ff; clip-path: polygon(0 0, 100% 50%, 0 100%); border-radius: 0; }
        #wavePreview .pv.armored i { background: #9aa3ad; border-radius: 2px; }
        #wavePreview .pv.boss i    { background: #ffd400; width: 13px; height: 13px; box-shadow: 0 0 6px #ffd400; }
        #lives.shake { animation: shake 0.4s ease; }
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-4px); }
            75% { transform: translateX(4px); }
        }
        #towerMenu { display: inline-flex; gap: 8px; align-items: center; }
        button { font: inherit; color: var(--text); cursor: pointer; touch-action: manipulation; }
        .tower-btn {
            width: 58px; height: 58px; border-radius: 14px; padding: 0;
            display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px;
            background: linear-gradient(180deg, #222d38 0%, #171f28 100%);
            border: 2px solid var(--edge); box-shadow: 0 3px 10px rgba(0,0,0,0.4);
            transition: transform 0.12s ease, border-color 0.12s ease, box-shadow 0.12s ease;
        }
        .tower-btn:hover { transform: translateY(-2px); border-color: #4a5a6c; }
        .tower-btn.selected {
            border-color: #fff; box-shadow: 0 0 0 3px rgba(255,255,255,0.18), 0 6px 16px rgba(0,0,0,0.5);
            transform: translateY(-2px);
        }
        .tower-btn svg { width: 28px; height: 28px; filter: drop-shadow(0 0 4px rgba(255,255,255,0.25)); }
        .tower-btn div { font-size: 0.72rem; font-weight: 700; color: var(--gold); }
        .tower-btn.unaffordable { opacity: 0.45; filter: saturate(0.4); }
        .tower-btn.unaffordable div { color: var(--red); }
        .controls button, .panel-actions button {
            padding: 8px 14px; border-radius: 10px; font-weight: 600;
            background: #263241; border: 1px solid var(--edge); transition: background 0.12s ease;
        }
        .controls button:hover:not(:disabled), .panel-actions button:hover:not(:disabled) { background: #2f3d4e; }
        .controls button:disabled, .panel-actions button:disabled { opacity: 0.5; cursor: default; }
        button.primary { background: #1f6f3f; border-color: #2e9a58; }
        button.primary:hover:not(:disabled) { background: #268a4c; }
        #speedBtn { min-width: 48px; font-variant-numeric: tabular-nums; }
        #speedBtn.active { background: #7a4b00; border-color: #c27a00; color: #ffd45c; }
        #upgradeInfo { color: var(--muted); font-size: 0.85rem; flex-basis: 100%; min-height: 1.2em; }
        #towerPanel {
            display: none; margin: 0 auto 10px; padding: 10px 14px; max-width: 640px; gap: 8px 14px;
            align-items: center; justify-content: center; flex-wrap: wrap;
            background: var(--panel); border: 1px solid #5a4a12; border-radius: 12px;
            box-shadow: 0 0 0 2px rgba(255,212,92,0.25), 0 8px 20px rgba(0,0,0,0.35);
            font-size: 0.9rem;
        }
        #towerPanel.open { display: flex; }
        #tpName { color: var(--gold); }
        #tpStats { display: inline-flex; gap: 10px; flex-wrap: wrap; justify-content: center; color: var(--muted); }
        #tpStats b { color: var(--text); }
        #tpStats .blurb { flex-basis: 100%; font-size: 0.8rem; }
        .panel-actions { display: inline-flex; gap: 8px; }
        #toast {
            position: fixed; left: 50%; bottom: 28px; transform: translate(-50%, 20px);
            padding: 10px 16px; border-radius: 10px; background: #1b2a1f; color: #cff3d8;
            border: 1px solid #2e9a58; box-shadow: 0 8px 24px rgba(0,0,0,0.5);
            font-weight: 600; font-size: 0.9rem; opacity: 0; pointer-events: none;
            transition: opacity 0.15s ease, transform 0.15s ease; z-index: 10; max-width: calc(100vw - 32px);
        }
        #toast.show { opacity: 1; transform: translate(-50%, 0); }
        #toast.warn { background: #2a1b1b; color: #ffd0d0; border-color: #c0392b; }
        .help { color: var(--muted); font-size: 0.78rem; margin: -8px 12px 20px; }
        kbd {
            display: inline-block; padding: 1px 6px; border-radius: 5px; font: inherit; font-size: 0.75rem;
            background: #0f1620; border: 1px solid var(--edge); border-bottom-width: 2px; color: var(--text);
        }
        @media (max-width: 480px) { .help { display: none; } }
        canvas {
            display: block; margin: 0 auto 20px; background: #2b3a2e;
            border: 2px solid #3a4b5c; border-radius: 10px;
            box-shadow: 0 16px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04);
            max-width: calc(100vw - 24px); height: auto; touch-action: manipulation;
            image-rendering: auto;
        }
    </style>
    @if ($gaId)
        <!-- Google tag (gtag.js) -->
        <script async src="https://www.googletagmanager.com/gtag/js?id={{ $gaId }}"></script>
        <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', @json($gaId));
        </script>
        <!-- End Google Analytics -->
    @endif
</head>
<body>
    <h1>Tower Defence Game</h1>
    <div id="ui">
        <div class="stats">
            <span id="money">Money: 100</span>
            <span id="lives">Lives: 10</span>
            <span id="wave">Wave: 1</span>
            <span id="score">Score: 0</span>
            <span id="best">Best: 0</span>
        </div>
        <div id="towerMenu" role="group" aria-label="Tower types">
            <button class="tower-btn" data-type="basic" title="Basic tower (50): steady damage, good range. Key 1">
                <svg width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="12" fill="#0af" stroke="#fff" stroke-width="2"/></svg>
                <div>50</div>
            </button>
            <button class="tower-btn" data-type="fast" title="Fast tower (60): fires three times as fast. Key 2">
                <svg width="32" height="32" viewBox="0 0 32 32"><rect x="8" y="8" width="16" height="16" rx="6" fill="#009E73" stroke="#fff" stroke-width="2"/></svg>
                <div>60</div>
            </button>
            <button class="tower-btn" data-type="strong" title="Strong tower (80): slow, heavy hits. Key 3">
                <svg width="32" height="32" viewBox="0 0 32 32"><polygon points="16,6 28,28 4,28" fill="#E69F00" stroke="#fff" stroke-width="2"/></svg>
                <div>80</div>
            </button>
            <button class="tower-btn" data-type="splash" title="Splash tower (100): damages every enemy near the impact. Key 4">
                <svg width="32" height="32" viewBox="0 0 32 32"><ellipse cx="16" cy="20" rx="10" ry="6" fill="#56B4E9" stroke="#fff" stroke-width="2"/><circle cx="16" cy="12" r="5" fill="#56B4E9" stroke="#fff" stroke-width="2"/></svg>
                <div>100</div>
            </button>
        </div>
        <div class="controls">
            <button id="waveBtn" class="primary" title="Send the next wave now (N)">Start wave 1</button>
            <button id="speedBtn" title="Game speed (F)">1×</button>
            <button id="pauseBtn" title="Pause or resume (Space)">Pause</button>
            <button id="muteBtn" title="Mute (M)" aria-label="Mute sound">🔊</button>
            <button id="restartBtn" class="primary" hidden title="Start a new game (Enter)">Play again</button>
        </div>
        <div id="wavePreview" aria-label="Next wave"></div>
        <span id="upgradeInfo">Tap a tower on the map to see its stats. Keys 1-4 pick a tower type.</span>
    </div>
    <div id="towerPanel" aria-live="polite">
        <strong id="tpName"></strong>
        <span id="tpStats"></span>
        <span class="panel-actions">
            <button id="upgradeBtn" class="primary">Upgrade</button>
            <button id="sellBtn">Sell</button>
        </span>
    </div>
    <div id="toast" role="status" aria-live="polite"></div>
    <canvas id="game" width="600" height="400"></canvas>
    <p class="help">
        <kbd>1</kbd>–<kbd>4</kbd> pick a tower · <kbd>Esc</kbd> cancel · <kbd>N</kbd> next wave ·
        <kbd>F</kbd> speed · <kbd>Space</kbd> pause · <kbd>U</kbd> upgrade · <kbd>S</kbd> sell · <kbd>M</kbd> mute
    </p>
    <script src="{{ asset('game.js') }}?v={{ $build }}" defer></script>
</body>
</html>
