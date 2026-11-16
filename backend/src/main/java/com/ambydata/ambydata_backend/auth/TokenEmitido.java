package com.ambydata.ambydata_backend.auth;

import java.time.Instant;

public record TokenEmitido(String token, Instant expiraEm) {
}
