<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('scores', function (Blueprint $table) {
            $table->id();
            $table->string('name', 16);
            $table->unsignedInteger('wave');
            $table->unsignedInteger('score');
            $table->unsignedInteger('kills')->default(0);
            $table->string('ip_hash', 64)->nullable();
            $table->timestamps();

            // The leaderboard reads "top N by score", so index for that.
            $table->index(['score', 'wave']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scores');
    }
};
