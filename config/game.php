<?php

return [
    // Cache-busting token appended to game.js and favicon.svg.
    'build' => env('GAME_BUILD', '2026-10-15'),

    // Google Analytics measurement ID. Leave empty to disable the tag.
    'ga_id' => env('GA_MEASUREMENT_ID', ''),

    // nikniq.com game portal: finished games are reported to the signed-in
    // player's account. Leave the client ID empty to turn this off.
    'nikniq_url' => rtrim((string) env('NIKNIQ_URL', 'https://nikniq.com'), '/'),
    'nikniq_client_id' => env('NIKNIQ_CLIENT_ID', ''),
];
