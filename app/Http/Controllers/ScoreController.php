<?php

namespace App\Http\Controllers;

use App\Models\Score;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ScoreController extends Controller
{
    public const LIMIT = 10;

    /** Top scores, best first. */
    public function index(): JsonResponse
    {
        return response()->json([
            'scores' => $this->top(),
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
            'wave' => ['required', 'integer', 'min:1', 'max:999'],
            'score' => ['required', 'integer', 'min:0', 'max:10000000'],
            'kills' => ['nullable', 'integer', 'min:0', 'max:1000000'],
        ]);

        $score = Score::create([
            'name' => trim($data['name']),
            'wave' => $data['wave'],
            'score' => $data['score'],
            'kills' => $data['kills'] ?? 0,
            'ip_hash' => hash('sha256', (string) $request->ip()),
        ]);

        $rank = Score::query()
            ->where('score', '>', $score->score)
            ->orWhere(fn ($q) => $q->where('score', $score->score)->where('id', '<', $score->id))
            ->count() + 1;

        return response()->json([
            'id' => $score->id,
            'rank' => $rank,
            'scores' => $this->top(),
        ], 201);
    }

    private function top()
    {
        return Score::query()
            ->orderByDesc('score')
            ->orderByDesc('wave')
            ->orderBy('id')
            ->limit(self::LIMIT)
            ->get(['id', 'name', 'wave', 'score', 'kills', 'created_at']);
    }
}
