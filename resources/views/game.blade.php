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
        #ui > br { display: none; }
        #money, #lives, #wave {
            padding: 6px 12px; border-radius: 999px; font-weight: 700; font-variant-numeric: tabular-nums;
            background: #0f1620; border: 1px solid var(--edge); font-size: 0.95rem;
        }
        #money { color: var(--gold); }
        #lives { color: var(--red); }
        #wave  { color: var(--accent); }
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
        #pauseBtn {
            padding: 8px 14px; border-radius: 10px; font-weight: 600;
            background: #263241; border: 1px solid var(--edge);
        }
        #pauseBtn:hover { background: #2f3d4e; }
        #upgradeInfo { color: var(--muted); font-size: 0.85rem; flex-basis: 100%; }
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
        <span id="money">Money: 100</span>
        <span id="lives">Lives: 10</span>
        <span id="wave">Wave: 1</span>
        <br>
        <div id="towerMenu">
            <button class="tower-btn" data-type="basic" title="Basic Tower (50)">
                <svg width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="12" fill="#0af" stroke="#fff" stroke-width="2"/></svg>
                <div>50</div>
            </button>
            <button class="tower-btn" data-type="fast" title="Fast Tower (60)">
                <svg width="32" height="32" viewBox="0 0 32 32"><rect x="8" y="8" width="16" height="16" rx="6" fill="#009E73" stroke="#fff" stroke-width="2"/></svg>
                <div>60</div>
            </button>
            <button class="tower-btn" data-type="strong" title="Strong Tower (80)">
                <svg width="32" height="32" viewBox="0 0 32 32"><polygon points="16,6 28,28 4,28" fill="#E69F00" stroke="#fff" stroke-width="2"/></svg>
                <div>80</div>
            </button>
            <button class="tower-btn" data-type="splash" title="Splash Tower (100)">
                <svg width="32" height="32" viewBox="0 0 32 32"><ellipse cx="16" cy="20" rx="10" ry="6" fill="#56B4E9" stroke="#fff" stroke-width="2"/><circle cx="16" cy="12" r="5" fill="#56B4E9" stroke="#fff" stroke-width="2"/></svg>
                <div>100</div>
            </button>
        </div>
        <button id="pauseBtn">Pause</button>
        <span id="upgradeInfo">Click a tower to upgrade</span>
    </div>
    <canvas id="game" width="600" height="400"></canvas>
    <script src="{{ asset('game.js') }}?v={{ $build }}" defer></script>
</body>
</html>
