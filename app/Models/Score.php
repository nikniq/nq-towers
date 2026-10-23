<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Score extends Model
{
    protected $fillable = ['name', 'map', 'wave', 'score', 'kills', 'ip_hash'];

    protected $hidden = ['ip_hash', 'updated_at'];
}
