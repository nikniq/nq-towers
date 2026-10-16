<?php

namespace App\Http\Controllers;

use Illuminate\Contracts\View\View;

class GameController extends Controller
{
    public function __invoke(): View
    {
        return view('game', [
            'build' => config('game.build'),
            'gaId' => config('game.ga_id'),
            'jsVersion' => $this->version('game.js'),
            'iconVersion' => $this->version('favicon.svg'),
        ]);
    }

    /**
     * Cache-busting token taken from the file's contents. The host serves
     * static files with a one-year max-age, so a hand-maintained token that
     * is not bumped leaves returning players on a stale script. A content
     * hash changes exactly when the file does.
     */
    private function version(string $file): string
    {
        $path = public_path($file);

        return is_file($path)
            ? substr(md5_file($path), 0, 12)
            : (string) config('game.build');
    }
}
