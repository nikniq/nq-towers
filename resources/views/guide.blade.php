@extends('layouts.page')
@section('title', 'Towers and enemies')
@section('styles')
        .toc { display: flex; gap: 8px; margin: 0 0 18px; flex-wrap: wrap; }
        h2 { margin: 28px 0 10px; font-size: 1.15rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--gold); }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
        .unit { display: flex; flex-direction: column; gap: 10px; }
        .unit-head { display: flex; align-items: center; gap: 12px; }
        .unit-head h3 { margin: 0; font-size: 1.1rem; }
        .unit-head .sub { color: var(--muted); font-size: 0.82rem; }
        .icon { flex: none; width: 44px; height: 44px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.5), inset 0 -6px 10px rgba(0,0,0,0.25); }
        .unit p { margin: 0; font-size: 0.9rem; }
        table { width: 100%; border-collapse: collapse; font-size: 0.84rem; font-variant-numeric: tabular-nums; }
        th, td { padding: 4px 6px; text-align: right; border-bottom: 1px solid var(--edge); }
        td + td { white-space: nowrap; }
        th:first-child, td:first-child { text-align: left; color: var(--muted); font-weight: 600; }
        thead th { color: var(--muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; }
        .specs { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
        .specs li { padding: 6px 9px; border-radius: 9px; background: #141b23; border: 1px solid var(--edge); font-size: 0.84rem; }
        .specs b { color: #d8c2ff; }
        .tags { display: flex; gap: 6px; flex-wrap: wrap; }
        .tag { padding: 1px 8px; border-radius: 999px; font-size: 0.75rem; font-weight: 600; background: #141b23; border: 1px solid var(--edge); color: var(--muted); }
        .tag.warn { color: #ffb27a; border-color: #5a2a14; }
        .notes { margin: 0; padding-left: 18px; font-size: 0.9rem; }
        .notes li { margin: 4px 0; }
@endsection
@section('content')
    <h1>Towers and enemies</h1>
    <p class="lead">Everything you face and everything you can build, with the numbers behind them.</p>
    <nav class="toc">
        <a class="pill" href="#towers">🏰 Towers</a>
        <a class="pill" href="#enemies">👾 Enemies</a>
        <a class="pill" href="#rules">📜 Rules of thumb</a>
    </nav>

    <h2 id="towers">Towers</h2>
    <div class="grid">
        @foreach ($towers as $t)
            <article class="card unit" id="tower-{{ $t['id'] }}">
                <div class="unit-head">
                    <span class="icon" style="background: {{ $t['color'] }}" aria-hidden="true"></span>
                    <div><h3>{{ $t['name'] }}</h3><span class="sub">Costs {{ $t['cost'] }} · Upgrades to level 5 cost {{ $t['upgrades'] }}</span></div>
                </div>
                <p>{{ $t['blurb'] }}</p>
                <table>
                    <thead><tr><th></th><th>Level 1</th><th>Level 5</th></tr></thead>
                    <tbody>
                        <tr><td>Damage</td><td>{{ $t['l1']['damage'] }}</td><td>{{ $t['l5']['damage'] }}</td></tr>
                        <tr><td>Shots / sec</td><td>{{ $t['l1']['rate'] }}</td><td>{{ $t['l5']['rate'] }}</td></tr>
                        <tr><td>Range</td><td>{{ $t['l1']['range'] }}</td><td>{{ $t['l5']['range'] }}</td></tr>
                        @if ($t['l1']['splash'])<tr><td>Blast radius</td><td>{{ $t['l1']['splash'] }}</td><td>{{ $t['l5']['splash'] }}</td></tr>@endif
                        @if ($t['l1']['slow'])<tr><td>Slows by</td><td>{{ $t['l1']['slow'] }}%</td><td>{{ $t['l5']['slow'] }}%</td></tr>@endif
                        <tr><td>Tower health</td><td>{{ $t['l1']['hp'] }}</td><td>{{ $t['l5']['hp'] }}</td></tr>
                    </tbody>
                </table>
                <div>
                    <p style="font-size:0.8rem;color:var(--muted);margin-bottom:6px">At level 5, specialise for {{ $specCost }}:</p>
                    <ul class="specs">
                        @foreach ($t['specs'] as [$icon, $name, $desc])
                            <li>{{ $icon }} <b>{{ $name }}</b>: {{ $desc }}</li>
                        @endforeach
                    </ul>
                </div>
            </article>
        @endforeach
    </div>

    <h2 id="enemies">Enemies</h2>
    <div class="grid">
        @foreach ($enemies as [$id, $name, $color, $from, $hp, $speed, $reward, $lives, $notes])
            <article class="card unit" id="enemy-{{ $id }}">
                <div class="unit-head">
                    <span class="icon" style="background: {{ $color }}; border-radius: 45% 45% 40% 40%" aria-hidden="true"></span>
                    <div><h3>{{ $name }}</h3><span class="sub">From wave {{ $from }}</span></div>
                </div>
                <p>{{ $notes }}</p>
                <table>
                    <tbody>
                        <tr><td>Health</td><td>{{ $hp }}</td></tr>
                        <tr><td>Speed</td><td>{{ $speed }}</td></tr>
                        <tr><td>Gold when killed</td><td>{{ $reward }}</td></tr>
                        <tr><td>Lives if it gets through</td><td>{{ $lives }}</td></tr>
                    </tbody>
                </table>
                <div class="tags">
                    @if (in_array($id, ['armored', 'boss']))<span class="tag warn">Armoured</span><span class="tag warn">Attacks towers</span>@endif
                    @if ($id === 'healer')<span class="tag warn">Heals others</span>@endif
                    @if ($id === 'splitter')<span class="tag">Splits on death</span>@endif
                </div>
            </article>
        @endforeach
    </div>

    <h2 id="rules">Rules of thumb</h2>
    <div class="card">
        <ul class="notes">
            <li><b>Armour</b> subtracts from every hit but never blocks more than half. Many small hits lose a lot to it; big hits barely notice.</li>
            <li>After wave 8, enemy health climbs faster every wave and everything walks a little quicker.</li>
            <li>From wave 10, about one in eight enemies is a gold-crowned <b>elite</b>: 2.2× health, faster, and worth double gold.</li>
            <li>From wave 8, every fifth wave has a <b>mutator</b>: Swift, Swarm, Plated or Regen. Clearing it pays 50% extra.</li>
            <li>On <b>Volcano</b>, every enemy has 20% more health.</li>
            <li><b>High ground</b> tiles give towers built on them 20% more range.</li>
            <li>From wave 6, every fourth wave (except boss waves) brings the map's own event for 8 seconds: 🌧️ Downpour on Meadow slows enemies 20%; 🌪️ Sandstorm on Switchback cuts tower range 20%; 🍁 Harvest on Crossroads makes kills pay 50% more; 🌨️ Blizzard on Gauntlet slows enemies and towers by 30%; 🌋 Eruption on Volcano rains lava bombs that hurt enemies and nearby towers.</li>
            <li>Direct shots have an 8% chance of a <b>critical hit</b> for double damage. Mortar blasts, poison and fire never crit.</li>
            <li>Kills fill the <b>frenzy</b> meter: when full, towers fire 40% faster for 6 seconds. Each frenzy needs a few more kills, starting at 25.</li>
            <li>Every 5th wave cleared, choose one of three <b>boons</b>: +15% damage, 8% faster fire, +8% range, +5% crit chance, 10% cheaper upgrades, gold, 2 lives or recharged powers.</li>
            <li>From wave 3, a <b>treasure goblin</b> may run through (about 3 waves in 10). It is quick and worth a lot of gold, and costs no lives if it escapes.</li>
            <li>Damaged towers are repaired for free when a wave is cleared. Selling refunds 60% of everything spent on a tower.</li>
        </ul>
    </div>
    <p style="text-align:center;margin-top:24px"><a class="btn btn-primary" style="width:auto" href="{{ route('game') }}">🎮 Back to the game</a></p>
@endsection
