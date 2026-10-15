# NQ Towers

A small canvas tower-defence game served by Laravel.

## Layout

- `public_html/` is the web root (instead of Laravel's default `public/`). Point your web server's document root here. The override lives in `bootstrap/app.php` (`usePublicPath`).
- `public_html/game.js`, `favicon.svg`, `ads.txt`, `assets/` are the static game files.
- `resources/views/game.blade.php` is the page; `app/Http/Controllers/GameController.php` renders it.
- `config/game.php` holds the cache-busting build token (`GAME_BUILD`) and the Google Analytics ID (`GA_MEASUREMENT_ID`), both read from `.env`.
- `scripts/generate_sounds.py` generates the WAV files in `public_html/assets/`.

## Setup

```sh
composer install
cp .env.example .env
php artisan key:generate
php artisan serve
```

Then open http://127.0.0.1:8000.
# nq-towers
