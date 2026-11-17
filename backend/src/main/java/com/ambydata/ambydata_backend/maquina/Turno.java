package com.ambydata.ambydata_backend.maquina;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.time.LocalTime;

// Horário em que a máquina deveria produzir (HH:mm). Fora dele, parada não conta como downtime.
public record Turno(
        @NotNull @Pattern(regexp = "([01]\\d|2[0-3]):[0-5]\\d", message = "use o formato HH:mm") String inicio,
        @NotNull @Pattern(regexp = "([01]\\d|2[0-3]):[0-5]\\d", message = "use o formato HH:mm") String fim) {

    public boolean contem(LocalTime hora) {
        LocalTime de = LocalTime.parse(inicio);
        LocalTime ate = LocalTime.parse(fim);
        return de.isBefore(ate)
                ? !hora.isBefore(de) && hora.isBefore(ate)
                : !hora.isBefore(de) || hora.isBefore(ate); // turno que atravessa a meia-noite
    }
}
