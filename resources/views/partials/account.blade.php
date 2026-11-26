{{-- Right side of the top menu: Sign in / Register for guests, the account for players. --}}
@auth
    <span class="acct">
        @if (auth()->user()->avatar)
            <img src="{{ auth()->user()->avatar }}" alt="" width="26" height="26" referrerpolicy="no-referrer">
        @endif
        <span class="acct-name">{{ auth()->user()->name }}</span>
        @if (config('game.nikniq_client_id') && ! auth()->user()->nikniq_id)
            <a href="{{ route('auth.nikniq') }}" class="acct-btn" title="Link your nikniq.com account so your games count there">Connect nikniq.com</a>
        @endif
        <form method="POST" action="{{ route('logout') }}">
            @csrf
            <button type="submit" class="acct-btn">Sign out</button>
        </form>
    </span>
@else
    <span class="acct">
        <a href="{{ route('login') }}" class="acct-btn {{ request()->routeIs('login') ? 'on' : '' }}">Sign in</a>
        <a href="{{ route('register') }}" class="acct-btn acct-primary {{ request()->routeIs('register') ? 'on' : '' }}">Register</a>
    </span>
@endauth
