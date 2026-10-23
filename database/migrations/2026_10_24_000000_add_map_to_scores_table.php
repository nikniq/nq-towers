<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('scores', function (Blueprint $table) {
            // Existing scores were all played on the original map.
            $table->string('map', 20)->default('meadow')->after('name');
            $table->index(['map', 'score']);
        });
    }

    public function down(): void
    {
        Schema::table('scores', function (Blueprint $table) {
            $table->dropIndex(['map', 'score']);
            $table->dropColumn('map');
        });
    }
};
