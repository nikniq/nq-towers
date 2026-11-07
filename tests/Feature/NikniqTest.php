<?php

namespace Tests\Feature;

use Tests\TestCase;

class NikniqTest extends TestCase
{
    public function test_portal_sdk_is_off_without_a_client_id(): void
    {
        config(['game.nikniq_client_id' => '']);

        $this->get('/')->assertOk()
            ->assertDontSee('name="nikniq"', false)
            ->assertDontSee('/js/nikniq.js', false);
    }

    public function test_portal_sdk_loads_with_a_client_id(): void
    {
        config(['game.nikniq_client_id' => 'abc123', 'game.nikniq_url' => 'https://nikniq.com']);

        $this->get('/')->assertOk()
            ->assertSee('data-client="abc123"', false)
            ->assertSee('https://nikniq.com/js/nikniq.js', false);
    }

    public function test_sign_in_callback_serves_the_game(): void
    {
        config(['game.nikniq_client_id' => 'abc123']);

        $this->get('/auth/callback?code=x&state=y')->assertOk()->assertSee('id="game"', false);
    }
}
