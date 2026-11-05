<?php

namespace App\Http\Controllers;

use Illuminate\Contracts\View\View;

/**
 * Reference page for every tower and enemy. The numbers follow the
 * formulas in public_html/game.js (towerStats and spawnEnemy); keep the
 * two in step when balancing.
 */
class GuideController extends Controller
{
    public const SPEC_COST = 200;

    public function __invoke(): View
    {
        return view('guide', [
            'towers' => $this->towers(),
            'enemies' => $this->enemies(),
            'specCost' => self::SPEC_COST,
        ]);
    }

    /** Stats of a tower type at one level, as game.js computes them. */
    public static function stats(string $type, int $level): array
    {
        $damage = 1 + ($type === 'strong' ? 2 : 0) + $level;
        if ($type === 'splash') {
            $damage = 1 + $level;
        }
        if ($type === 'frost') {
            $damage = 1 + intdiv($level, 2);
        }
        $cooldown = ['fast' => 10, 'strong' => 40, 'splash' => 50, 'frost' => 35][$type] ?? 30;

        return [
            'damage' => $damage,
            'range' => 120 + $level * 10,
            'rate' => round(60 / $cooldown, 1),
            'splash' => $type === 'splash' ? 40 + $level * 10 : 0,
            'slow' => $type === 'frost' ? (int) round((0.4 + ($level - 1) * 0.05) * 100) : 0,
            'hp' => ($type === 'strong' ? 45 : 30) + ($level - 1) * 15,
        ];
    }

    private function towers(): array
    {
        $towers = [
            'basic' => ['Basic', 50, '#1ab3ff', 'All-rounder. Steady damage and good range. A safe first build anywhere.', [
                ['🎯', 'Sniper', '+80 range and double damage, fires slower'],
                ['⚡', 'Rapid', 'Fires twice as fast'],
            ]],
            'fast' => ['Fast', 60, '#00b386', 'Fires three times as fast as Basic. Shreds Darts, Shards and other weak enemies.', [
                ['☠️', 'Venom', 'Hits poison the target for 3 seconds'],
                ['✌️', 'Twin', 'Shoots two enemies at once'],
            ]],
            'strong' => ['Strong', 80, '#f0a500', 'Slow, heavy hits that punch through armour. Best against Tanks and Bosses. Tougher than other towers.', [
                ['🔩', 'Piercer', 'Ignores armour and deals triple damage to Tanks and Bosses'],
                ['💫', 'Concussion', 'Each hit stuns the target briefly (not Bosses)'],
            ]],
            'splash' => ['Splash', 100, '#56b4e9', 'A mortar whose shells damage every enemy near the impact. Great where the road bends or crosses.', [
                ['🔥', 'Napalm', 'Leaves burning ground for 3 seconds'],
                ['✳️', 'Cluster', '+60% blast radius'],
            ]],
            'frost' => ['Frost', 70, '#b085f5', 'Light damage, but chilled enemies crawl, giving every other tower more shots.', [
                ['🌨️', 'Blizzard', 'Chills every enemy near the target'],
                ['💎', 'Brittle', 'Chilled enemies take +30% damage from everything'],
            ]],
        ];

        $out = [];
        foreach ($towers as $id => [$name, $cost, $color, $blurb, $specs]) {
            $upgrades = 0;
            for ($l = 1; $l < 5; $l++) {
                $upgrades += 40 + $l * 30;
            }
            $out[] = [
                'id' => $id, 'name' => $name, 'cost' => $cost, 'color' => $color, 'blurb' => $blurb,
                'l1' => self::stats($id, 1), 'l5' => self::stats($id, 5),
                'upgrades' => $upgrades, 'specs' => $specs,
            ];
        }

        return $out;
    }

    private function enemies(): array
    {
        // [id, name, colour, first wave, hp at wave 1 style formula, speed word, reward, lives, notes]
        return [
            ['normal', 'Grunt', '#ff4d4d', 1, '3 + wave', 'Normal', 10, 1, 'The basic foot soldier. Comes in numbers.'],
            ['fast', 'Dart', '#2ef2ff', 3, '2 + wave ÷ 2', 'Very fast', 12, 1, 'Fragile but quick. Fast towers and Frost stop them.'],
            ['splitter', 'Splitter', '#c26bff', 4, '5 + wave', 'Slow', 8, 1, 'Breaks into two fast Shards when killed. Splash handles the pieces.'],
            ['mini', 'Shard', '#d99bff', 4, '2 + wave ÷ 2', 'Fast', 4, 1, 'Half of a Splitter.'],
            ['armored', 'Tank', '#9aa3ad', 5, '8 + 2 × wave', 'Normal', 20, 1, 'Wears armour (1, +1 every 10 waves) and shells the nearest tower within range as it rolls past.'],
            ['healer', 'Healer', '#47d16b', 7, '6 + wave', 'Slow', 25, 1, 'Every second, mends enemies around it. Kill it first.'],
            ['boss', 'Boss', '#ffd400', 5, '30 + 5 × wave', 'Slow', 100, 3, 'Every fifth wave. Heavy armour (2, +1 every 10 waves); stomps every tower nearby. Costs 3 lives if it gets through.'],
        ];
    }
}
