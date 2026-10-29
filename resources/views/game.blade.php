<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    @auth<meta name="player-name" content="{{ auth()->user()->boardName() }}">@endauth
    @if (session('auth_status') || session('auth_error'))
        <meta name="auth-message" content="{{ session('auth_error') ?: session('auth_status') }}" data-kind="{{ session('auth_error') ? 'warn' : '' }}">
    @endif
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
    <meta http-equiv="Pragma" content="no-cache" />
    <meta http-equiv="Expires" content="0" />
    <link rel="icon" href="{{ asset('favicon.svg') }}?v={{ $iconVersion }}" type="image/svg+xml">
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
        .site-nav { max-width: 640px; margin: 0 auto; padding: 12px 12px 0; display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
        .google-btn {
            display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 999px;
            font-size: 0.85rem; font-weight: 600; text-decoration: none; color: #1f1f1f; background: #fff;
            border: 1px solid #dadce0; box-shadow: 0 1px 2px rgba(0,0,0,0.3);
        }
        .google-btn:hover, .google-btn:focus-visible { background: #f1f3f4; }
        .account { display: inline-flex; align-items: center; gap: 8px; font-size: 0.85rem; }
        .account img { border-radius: 50%; border: 1px solid var(--edge); }
        .account-name { font-weight: 600; max-width: 14em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .account form { margin: 0; }
        .signout { padding: 4px 10px; border-radius: 999px; font-size: 0.8rem; background: var(--panel); border: 1px solid var(--edge); color: var(--muted); }
        .signout:hover { color: var(--text); }
        .home-link {
            display: inline-flex; align-items: center; gap: 4px; padding: 5px 10px; border-radius: 999px;
            font-size: 0.85rem; font-weight: 600; color: var(--muted); text-decoration: none;
            background: var(--panel); border: 1px solid var(--edge); transition: color 0.12s ease, border-color 0.12s ease;
        }
        .home-link:hover, .home-link:focus-visible { color: var(--text); border-color: #4a5a6c; }
        body.fullscreen .site-nav { display: none; }
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
        #wavePreview .pv.splitter i { background: #c26bff; }
        #wavePreview .pv.healer i  { background: #47d16b; box-shadow: 0 0 5px #47d16b; }
        #wavePreview .pv.boss i    { background: #ffd400; width: 13px; height: 13px; box-shadow: 0 0 6px #ffd400; }
        #lives.shake { animation: shake 0.4s ease; }
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-4px); }
            75% { transform: translateX(4px); }
        }
        #towerMenu { display: inline-flex; gap: 8px; align-items: center; }
        #mapPicker { display: flex; gap: 8px; justify-content: center; flex-basis: 100%; }
        #mapPicker[hidden] { display: none; }
        #mapPicker button {
            display: flex; flex-direction: column; align-items: center; gap: 1px; min-width: 96px;
            padding: 6px 12px; border-radius: 10px; background: #172029; border: 2px solid var(--edge);
            transition: border-color 0.12s ease, transform 0.12s ease;
        }
        #mapPicker button:hover { border-color: #4a5a6c; transform: translateY(-1px); }
        #mapPicker button small { font-size: 0.7rem; color: var(--muted); }
        #mapPicker button[data-map="switchback"] small { color: #7fd99a; }
        #mapPicker button[data-map="gauntlet"] small { color: #ff8f8f; }
        #mapPicker button.selected { border-color: #fff; background: #222d38; box-shadow: 0 0 0 3px rgba(255,255,255,0.15); }
        #continueBtn[hidden], #restartBtn[hidden] { display: none; }
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
        #scoreForm {
            display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: center;
            margin: 0 auto 10px; padding: 10px 14px; max-width: 640px; font-size: 0.9rem;
            background: var(--panel); border: 1px solid #2e9a58; border-radius: 12px;
            box-shadow: 0 0 0 2px rgba(46,154,88,0.25), 0 8px 20px rgba(0,0,0,0.35);
        }
        #scoreForm[hidden] { display: none; }
        #scoreForm label { color: var(--muted); }
        #scoreForm input {
            font: inherit; padding: 7px 10px; border-radius: 8px; width: 11em;
            background: #0f1620; color: var(--text); border: 1px solid var(--edge);
        }
        #scoreForm input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
        #scoreForm button { padding: 8px 14px; border-radius: 10px; font-weight: 600; border: 1px solid var(--edge); }
        #scoreForm.done input, #scoreForm.done button { display: none; }
        #scoreStatus { flex-basis: 100%; color: var(--muted); font-size: 0.85rem; min-height: 1.2em; }
        #leaderboard {
            margin: 0 auto 14px; padding: 12px 14px 8px; max-width: 640px; text-align: left;
            background: var(--panel); border: 1px solid var(--edge); border-radius: 14px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.35);
        }
        #leaderboard h2 { margin: 0 0 8px; font-size: 0.85rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); text-align: center; }
        #boardList { list-style: none; margin: 0; padding: 0; font-size: 0.9rem; font-variant-numeric: tabular-nums; }
        #boardList li { display: grid; grid-template-columns: 2em 1fr auto auto; gap: 10px; padding: 5px 8px; border-radius: 8px; align-items: baseline; }
        #boardList li:nth-child(odd) { background: rgba(255,255,255,0.03); }
        #boardList li.mine { background: rgba(255,212,92,0.15); outline: 1px solid rgba(255,212,92,0.5); }
        #boardList .rank { color: var(--muted); font-weight: 700; }
        #boardList li:nth-child(1) .rank { color: var(--gold); }
        #boardList li:nth-child(2) .rank { color: #d7dde3; }
        #boardList li:nth-child(3) .rank { color: #d39a63; }
        #boardList .name { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        #boardList .wave { color: var(--muted); font-size: 0.8rem; }
        #boardList .pts { color: var(--gold); font-weight: 700; }
        #boardList .empty { display: block; text-align: center; color: var(--muted); padding: 8px; }
        @media (max-width: 480px) { .help { display: none; } }
        .controls button.power {
            position: relative; overflow: hidden; min-width: 62px; font-variant-numeric: tabular-nums;
            background: linear-gradient(90deg, #3a4a5c var(--fill, 100%), #1a222b var(--fill, 100%));
        }
        .controls button.power span { font-size: 0.75rem; color: var(--muted); }
        .controls button.power.ready { border-color: #c27a00; box-shadow: 0 0 0 2px rgba(255,190,60,0.2); }
        .controls button.power.ready span { color: var(--gold); }
        .controls button.power.aiming { border-color: #ff5c5c; box-shadow: 0 0 0 3px rgba(255,80,60,0.35); }
        #repairBtn[hidden] { display: none; }
        .panel-actions { flex-wrap: wrap; justify-content: center; }
        button.spec[hidden] { display: none; }
        .panel-actions button.spec {
            display: flex; flex-direction: column; align-items: center; gap: 1px; max-width: 220px;
            background: #2a1a33; border-color: #a35ab8;
        }
        .panel-actions button.spec:hover:not(:disabled) { background: #3a2346; }
        button.spec small { font-size: 0.72rem; font-weight: 400; color: var(--muted); }
        #toast.gold { background: #2b2410; color: #ffe9a8; border-color: #c9a227; }
        #achievements {
            margin: 0 auto 14px; padding: 12px 14px; max-width: 640px;
            background: var(--panel); border: 1px solid var(--edge); border-radius: 14px;
        }
        #achievements h2 { margin: 0 0 8px; font-size: 0.85rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }
        #achCount { color: var(--gold); }
        #achList { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(112px, 1fr)); gap: 8px; }
        #achList li {
            display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 6px; border-radius: 10px;
            background: #141b23; border: 1px solid var(--edge); opacity: 0.45; filter: grayscale(1); font-size: 0.78rem;
        }
        #achList li.got { opacity: 1; filter: none; border-color: #8a7020; background: #221d0e; }
        #achList .ico { font-size: 1.3rem; }
        #achList small { color: var(--muted); font-size: 0.68rem; line-height: 1.2; }
        body.fullscreen #achievements { display: none; }
        .site-footer { margin: 0 0 8px; font-size: 0.85rem; }
        .site-footer a { color: var(--accent); }
        body.fullscreen .site-footer { display: none; }
        #fsBtn { min-width: 44px; font-size: 1.05rem; line-height: 1; }
        #fsBtn[hidden] { display: none; }
        /* Full screen: compact header, nothing below the board. */
        body.fullscreen { overflow: hidden; }
        body.fullscreen h1 { display: none; }
        body.fullscreen #ui { margin-top: 8px; margin-bottom: 6px; padding: 6px 10px; max-width: none; width: fit-content; }
        body.fullscreen #upgradeInfo { display: none; }
        body.fullscreen #leaderboard, body.fullscreen .help { display: none; }
        body.fullscreen canvas { max-width: none; margin-bottom: 0; }
        body.fullscreen #towerPanel, body.fullscreen #scoreForm {
            position: fixed; left: 50%; bottom: 16px; transform: translateX(-50%); z-index: 5;
            width: max-content; max-width: calc(100vw - 32px); margin: 0;
        }
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
    <nav class="site-nav">
        <a href="https://nikniq.com" class="home-link" title="Back to nikniq.com">← nikniq.com</a>
        @auth
            <span class="account">
                @if (auth()->user()->avatar)
                    <img src="{{ auth()->user()->avatar }}" alt="" width="26" height="26" referrerpolicy="no-referrer">
                @endif
                <span class="account-name">{{ auth()->user()->name }}</span>
                <form method="POST" action="{{ route('logout') }}">
                    @csrf
                    <button type="submit" class="signout">Sign out</button>
                </form>
            </span>
        @else
            <a href="{{ route('login') }}" class="google-btn" title="Sign in or create an account with Google">
                <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
                Sign in with Google
            </a>
        @endauth
    </nav>
    <h1>Tower Defence Game</h1>
    <div id="ui">
        <div class="stats">
            <span id="money">Money: 100</span>
            <span id="lives">Lives: 10</span>
            <span id="wave">Wave: 1</span>
            <span id="score">Score: 0</span>
            <span id="best">Best: 0</span>
        </div>
        <div id="mapPicker" role="group" aria-label="Map">
            <button data-map="switchback" title="Long desert road. Good for learning."><b>Switchback</b><small>Easy</small></button>
            <button data-map="meadow" title="The classic winding road."><b>Meadow</b><small>Normal</small></button>
            <button data-map="gauntlet" title="A short, icy road. Little time to stop anything."><b>Gauntlet</b><small>Hard</small></button>
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
            <button class="tower-btn" data-type="frost" title="Frost tower (70): chills enemies so they crawl. Key 5">
                <svg width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="12" fill="#b085f5" stroke="#fff" stroke-width="2"/><g stroke="#fff" stroke-width="2.2" stroke-linecap="round"><line x1="16" y1="7" x2="16" y2="25"/><line x1="8.2" y1="11.5" x2="23.8" y2="20.5"/><line x1="8.2" y1="20.5" x2="23.8" y2="11.5"/></g></svg>
                <div>70</div>
            </button>
        </div>
        <div class="controls">
            <button id="continueBtn" class="primary" hidden title="Resume your saved game (C)">Continue</button>
            <button id="waveBtn" class="primary" title="Send the next wave now (N)">Start wave 1</button>
            <button id="strikeBtn" class="power" title="Airstrike: tap the map for a big explosion. 45s cooldown (Q)">💥 <span>Q</span></button>
            <button id="freezeBtn" class="power" title="Freeze: slows every enemy for 3s. 60s cooldown (E)">❄️ <span>E</span></button>
            <button id="speedBtn" title="Game speed (F)">1×</button>
            <button id="pauseBtn" title="Pause or resume (Space)">Pause</button>
            <button id="muteBtn" title="Mute (M)" aria-label="Mute sound">🔊</button>
            <button id="fsBtn" title="Full screen (G)" aria-label="Full screen">⤢</button>
            <button id="restartBtn" class="primary" hidden title="Start a new game (Enter)">Play again</button>
        </div>
        <div id="wavePreview" aria-label="Next wave"></div>
        <span id="upgradeInfo">Tap a tower on the map to see its stats. Keys 1-5 pick a tower type.</span>
    </div>
    <div id="towerPanel" aria-live="polite">
        <strong id="tpName"></strong>
        <span id="tpStats"></span>
        <span class="panel-actions">
            <button id="upgradeBtn" class="primary">Upgrade</button>
            <button id="targetBtn">Target: First</button>
            <button id="specA" class="spec" hidden></button>
            <button id="specB" class="spec" hidden></button>
            <button id="repairBtn" hidden>Repair</button>
            <button id="sellBtn">Sell</button>
        </span>
    </div>
    <form id="scoreForm" hidden autocomplete="off">
        <label for="nameInput">Your name</label>
        <input id="nameInput" name="name" type="text" minlength="2" maxlength="16" pattern="[\p{L}\p{N} _\-]+" placeholder="2–16 letters" required>
        <button id="submitScoreBtn" type="submit" class="primary">Save score</button>
        <span id="scoreStatus"></span>
    </form>
    <div id="toast" role="status" aria-live="polite"></div>
    <canvas id="game" width="600" height="400"></canvas>
    <section id="achievements" aria-labelledby="achTitle">
        <h2 id="achTitle">Achievements <span id="achCount"></span></h2>
        <ul id="achList"></ul>
    </section>
    <section id="leaderboard" aria-labelledby="boardTitle">
        <h2 id="boardTitle">Top 10</h2>
        <ol id="boardList"><li class="empty">Loading…</li></ol>
    </section>
    <p class="site-footer"><a href="https://nikniq.com">More from nikniq.com</a></p>
    <p class="help">
        <kbd>1</kbd>–<kbd>5</kbd> pick a tower · <kbd>Esc</kbd> cancel · <kbd>N</kbd> next wave ·
        <kbd>F</kbd> speed · <kbd>Space</kbd> pause · <kbd>U</kbd> upgrade · <kbd>R</kbd> repair · <kbd>S</kbd> sell · <kbd>T</kbd> target · <kbd>C</kbd> continue · <kbd>Q</kbd> airstrike · <kbd>E</kbd> freeze · <kbd>M</kbd> mute · <kbd>G</kbd> full screen
    </p>
    <script src="{{ asset('game.js') }}?v={{ $jsVersion }}" defer></script>
</body>
</html>
