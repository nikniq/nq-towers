<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class NikniqTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['game.nikniq_client_id' => 'abc123', 'game.nikniq_url' => 'https://nikniq.com', 'game.nikniq_client_secret' => '']);
    }

    public function test_portal_sdk_is_off_without_a_client_id(): void
    {
        config(['game.nikniq_client_id' => '']);

        $this->get('/')->assertOk()
            ->assertDontSee('name="nikniq"', false)
            ->assertDontSee('/js/nikniq.js', false);
    }

    public function test_portal_sdk_loads_with_a_client_id(): void
    {
        config(['game.nikniq_client_id' => 'abc123', 'game.nikniq_url' => 'https://nikniq.com']);

        $this->get('/')->assertOk()
            ->assertSee('data-client="abc123"', false)
            ->assertSee('https://nikniq.com/js/nikniq.js', false);
    }

    private function startSignIn(): string
    {
        $location = $this->get('/auth/nikniq')->assertRedirect()->headers->get('Location');
        $this->assertStringStartsWith('https://nikniq.com/sso/authorize?', $location);
        parse_str(parse_url($location, PHP_URL_QUERY), $q);
        $this->assertSame('abc123', $q['client_id']);
        $this->assertSame(route('nikniq.callback'), $q['redirect_uri']);
        $this->assertSame('S256', $q['code_challenge_method']);

        return $q['state'];
    }

    private function fakePortal(int $id = 7, string $email = 'ada@example.com'): void
    {
        Http::fake(['nikniq.com/api/sso/token' => Http::response([
            'access_token' => 'tok', 'expires_at' => '2030-01-01T00:00:00Z',
            'player' => ['id' => $id, 'name' => 'Ada', 'email' => $email, 'avatar' => null],
        ])]);
    }

    public function test_sign_in_creates_an_account_and_hands_the_token_to_the_game(): void
    {
        $this->fakePortal();
        $state = $this->startSignIn();

        $this->get('/auth/callback?code=c&state='.$state)->assertRedirect(route('game'));

        $this->assertAuthenticated();
        $this->assertSame(7, User::sole()->nikniq_id);
        Http::assertSent(fn ($r) => $r['code'] === 'c' && strlen($r['code_verifier']) === 64 && ! isset($r['client_secret']));
        $this->get('/')->assertSee('data-token=', false)->assertSee('tok');
        $this->get('/')->assertDontSee('data-token=', false);
    }

    public function test_signing_in_again_reuses_the_account(): void
    {
        $this->fakePortal();
        $this->get('/auth/callback?code=c&state='.$this->startSignIn());
        $this->post('/logout');
        $this->get('/auth/callback?code=c&state='.$this->startSignIn());

        $this->assertSame(1, User::count());
        $this->assertAuthenticated();
    }

    public function test_a_wrong_state_is_rejected(): void
    {
        $this->fakePortal();
        $this->startSignIn();

        $this->get('/auth/callback?code=c&state=forged')->assertRedirect(route('game'));

        $this->assertGuest();
        Http::assertNothingSent();
    }

    public function test_an_existing_email_is_not_taken_over(): void
    {
        User::factory()->create(['email' => 'ada@example.com']);
        $this->fakePortal();

        $this->get('/auth/callback?code=c&state='.$this->startSignIn())->assertRedirect(route('login'));

        $this->assertGuest();
        $this->assertNull(User::sole()->nikniq_id);
    }

    public function test_a_signed_in_player_can_connect_nikniq(): void
    {
        $user = User::factory()->create(['email' => 'ada@example.com']);
        $this->actingAs($user);
        $this->get('/')->assertSee('Connect nikniq.com');
        $this->fakePortal();

        $this->get('/auth/callback?code=c&state='.$this->startSignIn())->assertRedirect(route('game'));

        $this->assertSame(7, $user->fresh()->nikniq_id);
        $this->get('/')->assertDontSee('Connect nikniq.com');
    }

    public function test_portal_failure_shows_an_error(): void
    {
        Http::fake(['nikniq.com/*' => Http::response(['error' => 'invalid_grant'], 400)]);

        $this->get('/auth/callback?code=c&state='.$this->startSignIn())->assertRedirect(route('game'))->assertSessionHas('auth_error');

        $this->assertGuest();
    }
}
