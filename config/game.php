<?php

return [
    // Cache-busting token appended to game.js and favicon.svg.
    'build' => env('GAME_BUILD', '2025-12-27'),

    // Google Analytics measurement ID. Leave empty to disable the tag.
    'ga_id' => env('GA_MEASUREMENT_ID', ''),
];
