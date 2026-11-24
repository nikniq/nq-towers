<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\GameController;
use App\Http\Controllers\GoogleAuthController;
use App\Http\Controllers\GuideController;
use App\Http\Controllers\NikniqAuthController;
use App\Http\Controllers\ScoreController;
use Illuminate\Support\Facades\Route;

Route::get('/', GameController::class)->name('game');
// Sign in with nikniq.com. Not guest-only: a signed-in player can connect it too.
Route::get('/auth/nikniq', [NikniqAuthController::class, 'redirect'])->middleware('throttle:20,1')->name('auth.nikniq');
Route::get('/auth/callback', [NikniqAuthController::class, 'callback'])->middleware('throttle:20,1')->name('nikniq.callback');
Route::get('/guide', GuideController::class)->name('guide');

Route::get('/scores', [ScoreController::class, 'index'])->name('scores.index');
Route::post('/scores', [ScoreController::class, 'store'])
    ->middleware('throttle:10,1')
    ->name('scores.store');

Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:6,1');
    Route::get('/register', [AuthController::class, 'showRegister'])->name('register');
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:6,1');
    Route::get('/auth/google', [GoogleAuthController::class, 'redirect'])->name('auth.google');
    Route::get('/auth/google/callback', [GoogleAuthController::class, 'callback'])->name('auth.google.callback');
});
Route::post('/logout', [GoogleAuthController::class, 'logout'])->middleware('auth')->name('logout');
