<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

/**
 * Sign in with a nikniq.com account (authorization code flow with PKCE).
 *
 * The portal's player token is handed to the page once, so game.js can
 * report finished games to the same account without a second sign-in.
 * A signed-in player who connects nikniq.com has it linked to their
 * current account instead.
 */
class NikniqAuthController extends Controller
{
    private const SESSION_KEY = 'nikniq_oauth';

    public function redirect(Request $request): RedirectResponse
    {
        if (! config('game.nikniq_client_id')) {
            return redirect()->route('game')->with('auth_error', 'nikniq.com sign-in is not set up yet.');
        }

        $verifier = Str::random(64);
        $state = Str::random(40);
        $request->session()->put(self::SESSION_KEY, ['state' => $state, 'verifier' => $verifier]);

        $challenge = rtrim(strtr(base64_encode(hash('sha256', $verifier, true)), '+/', '-_'), '=');

        return redirect()->away(config('game.nikniq_url').'/sso/authorize?'.http_build_query([
            'client_id' => config('game.nikniq_client_id'),
            'redirect_uri' => route('nikniq.callback'),
            'state' => $state,
            'code_challenge' => $challenge,
            'code_challenge_method' => 'S256',
        ]));
    }

    public function callback(Request $request): RedirectResponse
    {
        $pending = $request->session()->pull(self::SESSION_KEY);

        if ($request->has('error')) {
            return redirect()->route('game')->with('auth_error', 'nikniq.com sign-in was cancelled.');
        }
        if (! $pending || ! is_string($request->query('state')) || ! hash_equals($pending['state'], $request->query('state')) || ! is_string($request->query('code'))) {
            return redirect()->route('game')->with('auth_error', 'nikniq.com sign-in expired. Please try again.');
        }

        try {
            $response = Http::acceptJson()->timeout(10)->post(config('game.nikniq_url').'/api/sso/token', array_filter([
                'grant_type' => 'authorization_code',
                'client_id' => config('game.nikniq_client_id'),
                'client_secret' => config('game.nikniq_client_secret') ?: null,
                'code' => $request->query('code'),
                'redirect_uri' => route('nikniq.callback'),
                'code_verifier' => $pending['verifier'],
            ]));
            $response->throw();
            $body = $response->json();
            $player = $body['player'] ?? null;
            if (! is_array($player) || ! isset($player['id'], $body['access_token'])) {
                throw new \RuntimeException('Token response has no player.');
            }
        } catch (Throwable $e) {
            Log::warning('nikniq.com sign-in failed', ['error' => $e->getMessage()]);

            return redirect()->route('game')->with('auth_error', 'nikniq.com sign-in failed. Please try again.');
        }

        $nikniqId = (int) $player['id'];
        $linked = User::where('nikniq_id', $nikniqId)->first();
        $current = $request->user();

        if ($current) {
            // Connecting nikniq.com to the account already signed in.
            if ($linked && $linked->id !== $current->id) {
                return redirect()->route('game')->with('auth_error', 'That nikniq.com account is already linked to another player.');
            }
            $user = $current;
        } elseif ($linked) {
            $user = $linked;
        } else {
            // Never take over an existing account by matching email: the
            // owner has to sign in to it first and connect from there.
            $email = $player['email'] ?? null;
            if ($email && User::where('email', $email)->exists()) {
                return redirect()->route('login')->with('auth_error', 'An account with that email already exists. Sign in to it, then use "Connect nikniq.com".');
            }
            $user = new User;
            $user->fill(['name' => $player['name'] ?: 'Player', 'email' => $email ?: "nikniq-{$nikniqId}@users.nikniq.com"]);
        }

        $user->nikniq_id = $nikniqId;
        if (! $user->avatar && ! empty($player['avatar'])) {
            $user->avatar = $player['avatar'];
        }
        $user->save();

        if (! $current) {
            Auth::login($user, remember: true);
            $request->session()->regenerate();
        }

        return redirect()->route('game')
            ->with('auth_status', $current ? 'nikniq.com connected.' : 'Signed in as '.$user->name.'.')
            ->with('nikniq_token', ['access_token' => $body['access_token'], 'expires_at' => $body['expires_at'] ?? now()->addDays(30)->toIso8601String()]);
    }
}
