<?php

namespace Tests\Feature;

use App\Models\Score;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as GoogleUser;
use Mockery;
use Tests\TestCase;

class GoogleAuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.google.client_id' => 'test-id', 'services.google.client_secret' => 'test-secret']);
    }

    private function fakeGoogle(string $id = 'g-123', string $email = 'ada@example.com', string $name = 'Ada Lovelace'): void
    {
        $google = (new GoogleUser)->map(['id' => $id, 'name' => $name, 'email' => $email, 'avatar' => 'https://lh3.example/a.png']);
        $provider = Mockery::mock(\Laravel\Socialite\Two\GoogleProvider::class);
        $provider->shouldReceive('user')->andReturn($google);
        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);
    }

    public function test_sign_in_button_shows_for_guests(): void
    {
        $this->get('/')->assertOk()->assertSee('Sign in with Google')->assertSee(route('login'));
    }

    public function test_redirect_sends_the_player_to_google(): void
    {
        $this->get('/auth/google')->assertRedirectContains('accounts.google.com');
    }

    public function test_first_sign_in_registers_a_new_account(): void
    {
        $this->fakeGoogle();

        $this->get('/auth/google/callback?code=x&state=y')->assertRedirect(route('game'));

        $this->assertAuthenticated();
        $user = User::sole();
        $this->assertSame('g-123', $user->google_id);
        $this->assertSame('Ada Lovelace', $user->name);
        $this->assertNull($user->password);
        $this->assertNotNull($user->email_verified_at);

        $this->get('/')->assertSee('Ada Lovelace')->assertSee('Sign out')->assertSee('content="Ada"', false);
    }

    public function test_signing_in_again_reuses_the_account(): void
    {
        $this->fakeGoogle();
        $this->get('/auth/google/callback?code=x');
        $this->post('/logout')->assertRedirect(route('game'));
        $this->assertGuest();

        $this->get('/auth/google/callback?code=x');

        $this->assertAuthenticated();
        $this->assertSame(1, User::count());
    }

    public function test_existing_email_account_is_linked_not_duplicated(): void
    {
        $existing = User::factory()->create(['email' => 'ada@example.com']);
        $this->fakeGoogle();

        $this->get('/auth/google/callback?code=x');

        $this->assertAuthenticatedAs($existing);
        $this->assertSame('g-123', $existing->fresh()->google_id);
        $this->assertSame(1, User::count());
    }

    public function test_cancelled_and_failed_sign_ins_return_to_the_game(): void
    {
        $this->get('/auth/google/callback?error=access_denied')
            ->assertRedirect(route('game'))->assertSessionHas('auth_error', 'Sign-in was cancelled.');

        $provider = Mockery::mock(\Laravel\Socialite\Two\GoogleProvider::class);
        $provider->shouldReceive('user')->andThrow(new \Laravel\Socialite\Two\InvalidStateException);
        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);

        $this->get('/auth/google/callback?code=x')
            ->assertRedirect(route('game'))->assertSessionHas('auth_error');
        $this->assertGuest();
    }

    public function test_scores_from_signed_in_players_are_linked_to_their_account(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->postJson('/scores', ['name' => 'Ada', 'wave' => 5, 'score' => 300])->assertCreated();
        $this->app['auth']->forgetGuards();
        $this->postJson('/scores', ['name' => 'Guest', 'wave' => 3, 'score' => 100])->assertCreated();

        $this->assertSame($user->id, Score::where('name', 'Ada')->value('user_id'));
        $this->assertNull(Score::where('name', 'Guest')->value('user_id'));
        $this->getJson('/scores')->assertJsonMissingPath('scores.0.user_id');
    }

    public function test_sign_in_without_credentials_explains_instead_of_crashing(): void
    {
        config(['services.google.client_id' => null]);

        $this->get('/auth/google')->assertRedirect(route('game'))->assertSessionHas('auth_error', 'Google sign-in is not set up yet.');
    }
}
