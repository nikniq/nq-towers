<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rules\Password;

/**
 * Email and password accounts, alongside Sign in with Google. Both kinds
 * share the users table: a Google account has no password until one is set.
 */
class AuthController extends Controller
{
    public function showLogin(): View
    {
        return view('auth.login');
    }

    public function login(Request $request): RedirectResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (! Auth::attempt($credentials, $request->boolean('remember'))) {
            $user = User::where('email', $credentials['email'])->first();
            $message = $user && $user->password === null && $user->google_id
                ? 'This account uses Google. Use Sign in with Google instead.'
                : 'That email and password do not match.';

            return back()->withErrors(['email' => $message])->onlyInput('email', 'remember');
        }

        $request->session()->regenerate();

        return redirect()->intended(route('game'))
            ->with('auth_status', 'Signed in as '.Auth::user()->name.'.');
    }

    public function showRegister(): View
    {
        return view('auth.register');
    }

    public function register(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:60'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::min(8)],
        ], [
            'email.unique' => 'An account with this email already exists. Sign in instead.',
        ]);

        $user = User::create($data);

        Auth::login($user, remember: true);
        $request->session()->regenerate();

        return redirect()->route('game')->with('auth_status', 'Welcome, '.$user->name.'! Your account is ready.');
    }
}
