#!/usr/bin/env bash
#================================================================
# Production deploy for nq-towers. Run ON the server, from the app root:
#
#   ./deploy.sh            # pull + deps (if changed) + migrate + caches + verify
#   ./deploy.sh --seed     # ...and re-run the database seeder (confirms first)
#   ./deploy.sh --build    # ...and force an asset rebuild (npm run build)
#
# One command for the whole sequence so the steps cannot drift apart:
# pulling without migrating is how a Laravel site ends up serving 500s
# ("Base table or view not found") after a deploy that "worked".
#
# Its counterpart on your workstation is cx.sh, which drives this over ssh.
#================================================================

set -euo pipefail
cd "$(dirname "$0")"

SEED=no
BUILD=no
for arg in "$@"; do
    case "$arg" in
        --seed)  SEED=yes ;;
        --build) BUILD=yes ;;
        *) echo "Unknown option: $arg"; echo "Usage: ./deploy.sh [--seed] [--build]"; exit 2 ;;
    esac
done

# Refuse to run with local edits on the server: git pull would either fail
# or merge them, and either way the server stops matching the repo.
if [ -n "$(git status --porcelain)" ]; then
    echo "✗ The server tree has local changes. Resolve them before deploying:"
    git status --short
    exit 1
fi

echo "→ git pull"
# Remember the lockfiles before pulling so we only reinstall when the
# dependencies actually moved. Hashing the committed blob (not the file)
# means an untouched lockfile costs nothing.
COMPOSER_BEFORE=$(git rev-parse HEAD:composer.lock 2>/dev/null || echo none)
NPM_BEFORE=$(git rev-parse HEAD:package.json 2>/dev/null || echo none)
git pull --ff-only
COMPOSER_AFTER=$(git rev-parse HEAD:composer.lock 2>/dev/null || echo none)
NPM_AFTER=$(git rev-parse HEAD:package.json 2>/dev/null || echo none)

if [ "$COMPOSER_BEFORE" != "$COMPOSER_AFTER" ] || [ ! -d vendor ]; then
    if command -v composer >/dev/null 2>&1; then
        echo "→ composer install (lockfile changed or vendor/ missing)"
        composer install --no-dev --optimize-autoloader --no-interaction
    else
        # Not fatal: the pull has already landed, and stopping here would
        # leave the tree un-migrated as well. Say so loudly instead.
        echo "⚠ composer.lock changed but composer is not on PATH."
        echo "  Install dependencies manually before trusting this deploy."
    fi
fi

# Vite assets live in public_html/build, which is gitignored, so the server
# has to build them. The game page itself loads public_html/game.js directly
# (cache-busted by GAME_BUILD in .env), so a missing npm only affects the
# Tailwind/Vite bundle, not the game.
if [ "$BUILD" = yes ] || [ "$NPM_BEFORE" != "$NPM_AFTER" ] || [ ! -d public_html/build ]; then
    if command -v npm >/dev/null 2>&1; then
        echo "→ npm ci && npm run build"
        npm ci --ignore-scripts --no-audit --no-fund
        npm run build
    else
        echo "⚠ Assets need building but npm is not on PATH."
        echo "  Build locally and upload public_html/build, or run cx.sh option 27."
    fi
fi

# First deploy on a fresh server: no .env means no APP_KEY, and Laravel
# answers every request with a 500 (MissingAppKeyException). Create it from
# the example and generate a key, then stop so the real settings can be
# filled in before anything migrates against the wrong database.
if [ ! -f .env ]; then
    echo "→ no .env — creating from .env.example"
    cp .env.example .env
    sed -i.bak -e 's/^APP_ENV=.*/APP_ENV=production/' -e 's/^APP_DEBUG=.*/APP_DEBUG=false/' .env && rm -f .env.bak
    php artisan key:generate --force
    echo "✗ .env created with a fresh APP_KEY. Edit APP_URL, DB_*, GAME_BUILD, then run ./deploy.sh again."
    exit 1
fi
if ! grep -qE '^APP_KEY=base64:.+' .env; then
    echo "→ APP_KEY is empty — generating"
    php artisan key:generate --force
fi

# database/*.sqlite is gitignored, so a fresh checkout has no database
# file and every request 500s (SQLiteDatabaseDoesNotExistException).
# migrate --force does not create it non-interactively, so do it here.
DB_CONN=$(grep -E '^DB_CONNECTION=' .env | cut -d= -f2- | tr -d '"'"'"' ')
if [ "${DB_CONN:-sqlite}" = "sqlite" ]; then
    DB_FILE=$(grep -E '^DB_DATABASE=' .env | cut -d= -f2- | tr -d '"'"'"' ')
    DB_FILE="${DB_FILE:-database/database.sqlite}"
    if [ ! -f "$DB_FILE" ]; then
        echo "→ creating SQLite database at $DB_FILE"
        mkdir -p "$(dirname "$DB_FILE")"
        touch "$DB_FILE"
    fi
fi

echo "→ migrate"
php artisan migrate --force

if [ "$SEED" = yes ]; then
    echo "⚠ This re-runs DatabaseSeeder and overwrites any field a seeder sets."
    read -r -p "Type 'yes' to continue: " confirm
    if [ "$confirm" = "yes" ]; then
        echo "→ db:seed"
        php artisan db:seed --force
    else
        echo "→ skipped seeding"
    fi
fi

echo "→ storage link"
# Idempotent; prints "already exists" on later runs.
php artisan storage:link 2>/dev/null || true

echo "→ cache config/routes/views"
php artisan optimize

echo "→ verify"
FAIL=0
if [ "$(php artisan migrate:status --pending 2>/dev/null | grep -c Pending || true)" != "0" ]; then
    echo "  ✗ migrations still pending"; FAIL=1
else
    echo "  ✓ migrations up to date"
fi
if grep -qE '^APP_KEY=base64:.+' .env; then
    echo "  ✓ APP_KEY set"
else
    echo "  ✗ APP_KEY missing — every request will 500"; FAIL=1
fi
if php -r 'exit(file_exists(".env") && preg_match("/^APP_DEBUG=true/m", file_get_contents(".env")) ? 1 : 0);'; then
    echo "  ✓ APP_DEBUG is not true"
else
    echo "  ✗ APP_DEBUG=true in production .env"; FAIL=1
fi
if [ -w storage/logs ] && [ -w storage/framework ] && [ -w bootstrap/cache ]; then
    echo "  ✓ storage/ and bootstrap/cache writable"
else
    echo "  ✗ storage/ or bootstrap/cache not writable"; FAIL=1
fi
if php artisan about --only=environment >/dev/null 2>&1; then
    echo "  ✓ application boots"
else
    echo "  ✗ application failed to boot (php artisan about)"; FAIL=1
fi

if [ "$FAIL" = 1 ]; then
    echo "✗ deployed $(git log --oneline -1) with warnings above"
    exit 1
fi
echo "✓ deployed $(git log --oneline -1)"
