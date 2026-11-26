<footer class="site-foot">
    <nav aria-label="Footer">
        <a href="{{ route('game') }}">Play</a>
        <a href="{{ route('game') }}#leaderboard">Leaderboard</a>
        <a href="{{ route('guide') }}">Towers &amp; enemies</a>
        @guest
            <a href="{{ route('login') }}">Sign in</a>
            <a href="{{ route('register') }}">Register</a>
        @endguest
        <a href="https://nikniq.com">More games on nikniq.com</a>
    </nav>
    <p>© {{ date('Y') }} nikniq.com · Tower Defence</p>
</footer>
