<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" href="{{ asset('favicon.svg') }}" type="image/svg+xml">
    <title>@yield('title') · Tower Defence</title>
    <style>
        :root {
            --bg: #0f1419; --panel: #1b232c; --edge: #2c3845; --text: #e8eef4; --muted: #9fb0c0;
            --gold: #ffd45c; --red: #ff6b6b; --accent: #56b4e9;
        }
        * { box-sizing: border-box; }
        body {
            margin: 0; min-height: 100vh; color: var(--text); line-height: 1.5;
            font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
            background: radial-gradient(1200px 600px at 50% -10%, #223040 0%, var(--bg) 60%) fixed, var(--bg);
        }
        a { color: var(--accent); }
        .site-nav { max-width: 860px; margin: 0 auto; padding: 12px 16px 0; display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
        .pill {
            display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 999px;
            font-size: 0.85rem; font-weight: 600; color: var(--muted); text-decoration: none;
            background: var(--panel); border: 1px solid var(--edge);
        }
        .pill:hover, .pill:focus-visible { color: var(--text); border-color: #4a5a6c; }
        .pill.on { color: var(--text); border-color: var(--gold); }
        .nav-links { display: flex; gap: 6px; flex-wrap: wrap; }
        main { max-width: 860px; margin: 0 auto; padding: 18px 16px 40px; }
        h1 { margin: 12px 0 6px; font-size: 1.6rem; letter-spacing: 0.04em; }
        .lead { color: var(--muted); margin: 0 0 20px; }
        .card { background: var(--panel); border: 1px solid var(--edge); border-radius: 14px; padding: 16px 18px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
        .btn {
            display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 100%;
            padding: 10px 14px; border-radius: 10px; font: inherit; font-weight: 700; cursor: pointer;
            border: 1px solid transparent; text-decoration: none;
        }
        .btn-primary { background: #2f9e57; color: #fff; }
        .btn-primary:hover { background: #36b263; }
        .btn-google { background: #fff; color: #1f1f1f; border-color: #dadce0; }
        .btn-google:hover { background: #f1f3f4; }
        label { display: block; font-size: 0.85rem; font-weight: 600; margin: 12px 0 4px; }
        input[type=text], input[type=email], input[type=password] {
            width: 100%; padding: 9px 11px; border-radius: 9px; font: inherit; color: var(--text);
            background: #0f1620; border: 1px solid var(--edge);
        }
        input:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
        .check { display: flex; align-items: center; gap: 8px; font-weight: 400; color: var(--muted); }
        .error { color: var(--red); font-size: 0.82rem; margin: 4px 0 0; }
        .divider { display: flex; align-items: center; gap: 10px; color: var(--muted); font-size: 0.8rem; margin: 16px 0; }
        .divider::before, .divider::after { content: ""; flex: 1; height: 1px; background: var(--edge); }
        .auth { max-width: 400px; margin: 0 auto; }
        .auth .foot { text-align: center; color: var(--muted); font-size: 0.88rem; margin: 14px 0 0; }
        .flash { padding: 8px 12px; border-radius: 9px; background: #3a2a14; color: #ffcf8a; font-size: 0.88rem; margin-bottom: 12px; }
        @yield('styles')
    </style>
</head>
<body>
    <nav class="site-nav">
        <a href="https://nikniq.com" class="pill">← nikniq.com</a>
        <div class="nav-links">
            <a href="{{ route('game') }}" class="pill">🎮 Play</a>
            <a href="{{ route('guide') }}" class="pill {{ request()->routeIs('guide') ? 'on' : '' }}">📖 Guide</a>
            @auth
                <span class="pill">{{ auth()->user()->name }}</span>
            @else
                <a href="{{ route('login') }}" class="pill {{ request()->routeIs('login') ? 'on' : '' }}">Sign in</a>
            @endauth
        </div>
    </nav>
    <main>
        @yield('content')
    </main>
</body>
</html>
