package com.ambydata.ambydata_backend.indicadores;

import com.ambydata.ambydata_backend.maquina.Turno;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;

// O turno que está acontecendo (do início até agora) ou, fora dele, o último que terminou.
public record JanelaTurno(Instant inicio, Instant fim, boolean emAndamento) {

    public static JanelaTurno atualOuUltimo(Turno turno, Instant agora, ZoneId fuso) {
        LocalTime de = LocalTime.parse(turno.inicio());
        LocalTime ate = LocalTime.parse(turno.fim());
        LocalDate hoje = agora.atZone(fuso).toLocalDate();
        // O turno começa uma vez por dia: o mais recente que já começou é o atual ou o último.
        for (LocalDate dia = hoje; ; dia = dia.minusDays(1)) {
            Instant inicio = dia.atTime(de).atZone(fuso).toInstant();
            if (!inicio.isAfter(agora)) {
                LocalDate diaDoFim = ate.isAfter(de) ? dia : dia.plusDays(1); // turno da noite
                Instant fim = diaDoFim.atTime(ate).atZone(fuso).toInstant();
                return fim.isAfter(agora) ? new JanelaTurno(inicio, agora, true) : new JanelaTurno(inicio, fim, false);
            }
        }
    }
}
