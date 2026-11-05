@extends('layouts.page')
@section('title', 'Sign in')
@section('content')
<div class="auth">
    <h1>Sign in</h1>
    <p class="lead">Your name is filled in on the leaderboard and your scores are linked to your account.</p>
    <div class="card">
        @if (session('auth_error'))<p class="flash">{{ session('auth_error') }}</p>@endif
        <a href="{{ route('auth.google') }}" class="btn btn-google"><svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg> Continue with Google</a>
        <div class="divider">or with email</div>
        <form method="POST" action="{{ route('login') }}" novalidate>
            @csrf
            <label for="email">Email</label>
            <input id="email" type="email" name="email" value="{{ old('email') }}" autocomplete="email" required autofocus>
            @error('email')<p class="error" role="alert">{{ $message }}</p>@enderror
            <label for="password">Password</label>
            <input id="password" type="password" name="password" autocomplete="current-password" required>
            @error('password')<p class="error" role="alert">{{ $message }}</p>@enderror
            <label class="check"><input type="checkbox" name="remember" value="1" {{ old('remember') ? 'checked' : '' }}> Keep me signed in</label>
            <p style="margin:16px 0 0"><button type="submit" class="btn btn-primary">Sign in</button></p>
        </form>
    </div>
    <p class="foot">New here? <a href="{{ route('register') }}">Create an account</a></p>
</div>
@endsection
