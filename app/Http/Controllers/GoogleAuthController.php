<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Laravel\Socialite\Facades\Socialite;
use Throwable;

/**
 * Sign in with Google. There is no separate registration: the first
 * sign-in creates the account, later ones log into it.
 */
class GoogleAuthController extends Controller
{
    public function redirect(): RedirectResponse
    {
        if (! config('services.google.client_id')) {
            return redirect()->route('game')->with('auth_error', 'Google sign-in is not set up yet.');
        }

        return Socialite::driver('google')->redirect();
    }

    public function callback(Request $request): RedirectResponse
    {
        if ($request->has('error')) {
            // The player pressed Cancel on Google's consent screen.
            return redirect()->route('game')->with('auth_error', 'Sign-in was cancelled.');
        }

        try {
            $google = Socialite::driver('google')->user();
        } catch (Throwable $e) {
            Log::warning('Google sign-in failed', ['error' => $e->getMessage()]);

            return redirect()->route('game')->with('auth_error', 'Google sign-in failed. Please try again.');
        }

        // Match on the Google account first, then link an existing user
        // with the same verified email, otherwise create a new account.
        $user = User::where('google_id', $google->getId())->first()
            ?? User::where('email', $google->getEmail())->first()
            ?? new User;

        $user->fill([
            'name' => $google->getName() ?: $google->getNickname() ?: 'Player',
            'email' => $google->getEmail(),
        ]);
        $user->google_id = $google->getId();
        $user->avatar = $google->getAvatar();
        $user->email_verified_at ??= now();
        $user->save();

        Auth::login($user, remember: true);
        $request->session()->regenerate();

        return redirect()->intended(route('game'))->with('auth_status', 'Signed in as '.$user->name.'.');
    }

    public function logout(Request $request): RedirectResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('game')->with('auth_status', 'Signed out.');
    }
}
