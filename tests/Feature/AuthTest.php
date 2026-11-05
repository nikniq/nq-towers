<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_and_register_pages_show(): void
    {
        $this->get('/login')->assertOk()->assertSee('Continue with Google')->assertSee('name="password"', false);
        $this->get('/register')->assertOk()->assertSee('Create account');
    }

    public function test_player_can_register_and_is_signed_in(): void
    {
        $this->post('/register', [
            'name' => 'Grace Hopper', 'email' => 'grace@example.com',
            'password' => 'cobol-1959', 'password_confirmation' => 'cobol-1959',
        ])->assertRedirect(route('game'));

        $this->assertAuthenticated();
        $this->assertDatabaseHas('users', ['email' => 'grace@example.com', 'name' => 'Grace Hopper']);
        $this->get('/')->assertSee('Grace Hopper')->assertSee('Sign out');
    }

    public function test_register_rejects_a_taken_email_and_short_password(): void
    {
        User::factory()->create(['email' => 'taken@example.com']);

        $this->post('/register', ['name' => 'X', 'email' => 'taken@example.com', 'password' => 'short', 'password_confirmation' => 'short'])
            ->assertSessionHasErrors(['email', 'password']);
        $this->assertGuest();
    }

    public function test_player_can_sign_in_and_out(): void
    {
        User::factory()->create(['email' => 'ada@example.com', 'password' => 'engine-1843']);

        $this->post('/login', ['email' => 'ada@example.com', 'password' => 'wrong-pass'])->assertSessionHasErrors('email');
        $this->assertGuest();

        $this->post('/login', ['email' => 'ada@example.com', 'password' => 'engine-1843'])->assertRedirect(route('game'));
        $this->assertAuthenticated();

        $this->post('/logout')->assertRedirect(route('game'));
        $this->assertGuest();
    }

    public function test_google_only_account_is_told_to_use_google(): void
    {
        $user = User::factory()->create(['email' => 'g@example.com']);
        $user->forceFill(['password' => null, 'google_id' => 'g-1'])->save();

        $this->post('/login', ['email' => 'g@example.com', 'password' => 'anything1'])
            ->assertSessionHasErrors(['email' => 'This account uses Google. Use Sign in with Google instead.']);
    }

    public function test_signed_in_players_skip_the_login_page(): void
    {
        $this->actingAs(User::factory()->create())->get('/login')->assertRedirect();
    }

    public function test_guide_lists_towers_and_enemies(): void
    {
        $this->get('/guide')->assertOk()
            ->assertSee('Towers and enemies')
            ->assertSee('Splash')->assertSee('Piercer')
            ->assertSee('Healer')->assertSee('Boss');
    }
}
