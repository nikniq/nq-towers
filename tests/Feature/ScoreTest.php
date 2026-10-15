<?php

namespace Tests\Feature;

use App\Models\Score;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ScoreTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_finished_game_can_be_recorded_and_ranked(): void
    {
        Score::create(['name' => 'Ada', 'wave' => 12, 'score' => 900]);
        Score::create(['name' => 'Bob', 'wave' => 5, 'score' => 300]);

        $response = $this->postJson('/scores', ['name' => 'Cy', 'wave' => 8, 'score' => 600, 'kills' => 40]);

        $response->assertCreated()
            ->assertJsonPath('rank', 2)
            ->assertJsonPath('scores.0.name', 'Ada')
            ->assertJsonPath('scores.1.name', 'Cy')
            ->assertJsonPath('scores.2.name', 'Bob')
            ->assertJsonMissingPath('scores.0.ip_hash');
    }

    public function test_the_leaderboard_is_capped_and_ordered(): void
    {
        foreach (range(1, 15) as $i) {
            Score::create(['name' => "P$i", 'wave' => $i, 'score' => $i * 10]);
        }

        $this->getJson('/scores')
            ->assertOk()
            ->assertJsonCount(10, 'scores')
            ->assertJsonPath('scores.0.score', 150)
            ->assertJsonPath('scores.9.score', 60);
    }

    public function test_invalid_submissions_are_rejected(): void
    {
        $this->postJson('/scores', ['name' => 'x', 'wave' => 1, 'score' => 1])->assertUnprocessable();
        $this->postJson('/scores', ['name' => '<script>', 'wave' => 1, 'score' => 1])->assertUnprocessable();
        $this->postJson('/scores', ['name' => 'Fine', 'wave' => 0, 'score' => 1])->assertUnprocessable();
        $this->postJson('/scores', ['name' => 'Fine', 'wave' => 1, 'score' => -1])->assertUnprocessable();
        $this->assertSame(0, Score::count());
    }
}
