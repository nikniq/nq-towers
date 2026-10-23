<?php

namespace App\Http\Controllers;

use App\Models\Score;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ScoreController extends Controller
{
    public const LIMIT = 10;

    /** Map ids the game ships. Each has its own board: an easy map's scores should not bury a hard one's. */
    public const MAPS = ['meadow', 'switchback', 'gauntlet'];

    /** Top scores on one map, best first. */
    public function index(Request $request): JsonResponse
    {
        $map = $this->map($request->query('map'));

        return response()->json([
            'map' => $map,
            'scores' => $this->top($map),
        ]);
    }

    /**
     * Record a finished game. There is no way to verify a score sent by a
     * browser game, so this only bounds the numbers to what the game can
     * actually produce and rate-limits the route; it is a casual board.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:16', 'regex:/^[\pL\pN _\-]+$/u'],
            'map' => ['nullable', 'string', Rule::in(self::MAPS)],
            'wave' => ['required', 'integer', 'min:1', 'max:999'],
            'score' => ['required', 'integer', 'min:0', 'max:10000000'],
            'kills' => ['nullable', 'integer', 'min:0', 'max:1000000'],
        ]);

        $map = $this->map($data['map'] ?? null);

        $score = Score::create([
            'name' => trim($data['name']),
            'map' => $map,
            'wave' => $data['wave'],
            'score' => $data['score'],
            'kills' => $data['kills'] ?? 0,
            'ip_hash' => hash('sha256', (string) $request->ip()),
        ]);

        $rank = Score::query()
            ->where('map', $map)
            ->where(fn ($q) => $q
                ->where('score', '>', $score->score)
                ->orWhere(fn ($q) => $q->where('score', $score->score)->where('id', '<', $score->id)))
            ->count() + 1;

        return response()->json([
            'id' => $score->id,
            'map' => $map,
            'rank' => $rank,
            'scores' => $this->top($map),
        ], 201);
    }

    private function map(?string $map): string
    {
        return in_array($map, self::MAPS, true) ? $map : self::MAPS[0];
    }

    private function top(string $map)
    {
        return Score::query()
            ->where('map', $map)
            ->orderByDesc('score')
            ->orderByDesc('wave')
            ->orderBy('id')
            ->limit(self::LIMIT)
            ->get(['id', 'name', 'map', 'wave', 'score', 'kills', 'created_at']);
    }
}
