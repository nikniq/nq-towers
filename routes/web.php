<?php

use App\Http\Controllers\GameController;
use App\Http\Controllers\ScoreController;
use Illuminate\Support\Facades\Route;

Route::get('/', GameController::class)->name('game');

Route::get('/scores', [ScoreController::class, 'index'])->name('scores.index');
Route::post('/scores', [ScoreController::class, 'store'])
    ->middleware('throttle:10,1')
    ->name('scores.store');
