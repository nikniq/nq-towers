<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class SiteChromeTest extends TestCase
{
    use RefreshDatabase;

    public static function pages(): array
    {
        return [['/'], ['/guide'], ['/login'], ['/register']];
    }

    #[DataProvider('pages')]
    public function test_guests_get_sign_in_register_and_the_footer(string $url): void
    {
        $this->get($url)->assertOk()
            ->assertSee('href="'.route('login').'"', false)
            ->assertSee('href="'.route('register').'"', false)
            ->assertSee('class="site-foot"', false)
            ->assertSee(route('game').'#leaderboard', false);
    }

    #[DataProvider('pages')]
    public function test_players_get_their_account_and_sign_out(string $url): void
    {
        if (in_array($url, ['/login', '/register'])) {
            $this->markTestSkipped('Guest-only page.');
        }
        $this->actingAs(User::factory()->create(['name' => 'Grace Hopper']));

        $this->get($url)->assertOk()
            ->assertSee('Grace Hopper')
            ->assertSee('Sign out')
            ->assertDontSee('href="'.route('register').'"', false);
    }
}
