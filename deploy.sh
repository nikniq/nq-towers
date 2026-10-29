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

# set -e aborts on the first failing command; without this it did so
# silently, leaving no clue which step stopped the deploy.
trap 'echo "✗ deploy.sh aborted at line $LINENO (see the command above)"' ERR

SEED=no
BUILD=no
for arg in "$@"; do
    case "$arg" in
        --seed)  SEED=yes ;;
        --build) BUILD=yes ;;
        *) echo "Unknown option: $arg"; echo "Usage: ./deploy.sh [--seed] [--build]"; exit 2 ;;
    esac
done

# Files the host edits itself. SiteGround writes the PHP version picked in
# Site Tools (and its caching rules) into public_html/.htaccess, so a change
# there is expected and must survive the deploy rather than block it.
HOST_MANAGED=("public_html/.htaccess")

# Refuse to run with any other edits to tracked files on the server: git pull
# would either fail or merge them, and the server would stop matching the
# repo. Untracked files are not checked: the host drops its own (logs/,
# webstats/, php.ini) into the app root, and they do not get in the way.
DIRTY=$(git diff --name-only HEAD)
UNEXPECTED=$(printf '%s\n' "$DIRTY" | grep -vxF -f <(printf '%s\n' "${HOST_MANAGED[@]}") | grep -v '^$' || true)
if [ -n "$UNEXPECTED" ]; then
    echo "✗ The server has edits to tracked files. Resolve them before deploying:"
    printf '  %s\n' $UNEXPECTED
    exit 1
fi

HOST_STASHED=no
if [ -n "$DIRTY" ]; then
    echo "→ keeping the host's edits to: $(echo $DIRTY)"
    git diff --stat HEAD -- "${HOST_MANAGED[@]}"
    git stash push --quiet --message "deploy.sh: host edits" -- "${HOST_MANAGED[@]}"
    HOST_STASHED=yes
fi

echo "→ git pull"
# Remember the lockfiles before pulling so we only reinstall when the
# dependencies actually moved. Hashing the committed blob (not the file)
# means an untouched lockfile costs nothing.
COMPOSER_BEFORE=$(git rev-parse HEAD:composer.lock 2>/dev/null || echo none)
NPM_BEFORE=$(git rev-parse HEAD:package.json 2>/dev/null || echo none)
if ! git pull --ff-only; then
    # Never leave the host's edits parked: the PHP version lives in there.
    [ "$HOST_STASHED" = yes ] && git stash pop --quiet
    echo "✗ git pull failed; nothing was changed."
    exit 1
fi
if [ "$HOST_STASHED" = yes ]; then
    # Put the host's edits back on top of whatever the pull brought.
    if ! git stash pop --quiet; then
        echo "✗ The repo and the host both changed ${HOST_MANAGED[*]}."
        echo "  The repo version is in place; the host's version is kept in 'git stash list'."
        echo "  Merge them by hand (git stash show -p), then run ./deploy.sh again."
        git checkout -- "${HOST_MANAGED[@]}"
        exit 1
    fi
fi
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
# would have to build them. Today no page uses Vite (the game loads
# public_html/game.js directly), so only build when a view starts using
# @vite or when asked with --build.
NEEDS_VITE=no
if grep -rqs "@vite" resources/views; then NEEDS_VITE=yes; fi
if [ "$BUILD" = yes ] || { [ "$NEEDS_VITE" = yes ] && { [ "$NPM_BEFORE" != "$NPM_AFTER" ] || [ ! -d public_html/build ]; }; }; then
    if command -v npm >/dev/null 2>&1; then
        # npm ci needs a lockfile; without one, fall back to a normal install.
        if [ -f package-lock.json ]; then
            echo "→ npm ci && npm run build"
            npm ci --ignore-scripts --no-audit --no-fund
        else
            echo "→ npm install && npm run build (no package-lock.json)"
            npm install --ignore-scripts --no-audit --no-fund
        fi
        npm run build
    else
        echo "⚠ Assets need building but npm is not on PATH."
        echo "  Build locally and upload public_html/build, or run cx.sh option 27."
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
