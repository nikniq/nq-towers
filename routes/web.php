<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\GameController;
use App\Http\Controllers\GoogleAuthController;
use App\Http\Controllers\GuideController;
use App\Http\Controllers\ScoreController;
use Illuminate\Support\Facades\Route;

Route::get('/', GameController::class)->name('game');
// nikniq.com sends players back here after sign-in; game.js finishes the exchange.
Route::get('/auth/callback', GameController::class)->name('nikniq.callback');
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
