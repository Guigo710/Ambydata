package com.ambydata.ambydata_backend.config;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.Map;

// Formato único de erro da API: { status, erro, campos? }.
@JsonInclude(JsonInclude.Include.NON_EMPTY)
public record ErroResponse(int status, String erro, Map<String, String> campos) {

    public ErroResponse(int status, String erro) {
        this(status, erro, Map.of());
    }
}
