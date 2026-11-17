package com.ambydata.ambydata_backend.maquina;

import org.junit.jupiter.api.Test;

import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;

class TurnoTests {

    @Test
    void turnoDoDiaIncluiOInicioEExcluiOFim() {
        Turno dia = new Turno("06:00", "22:00");
        assertThat(dia.contem(LocalTime.of(6, 0))).isTrue();
        assertThat(dia.contem(LocalTime.of(21, 59))).isTrue();
        assertThat(dia.contem(LocalTime.of(22, 0))).isFalse();
        assertThat(dia.contem(LocalTime.of(3, 0))).isFalse();
    }

    @Test
    void turnoQueAtravessaAMeiaNoite() {
        Turno noite = new Turno("22:00", "06:00");
        assertThat(noite.contem(LocalTime.of(23, 30))).isTrue();
        assertThat(noite.contem(LocalTime.MIDNIGHT)).isTrue();
        assertThat(noite.contem(LocalTime.of(5, 59))).isTrue();
        assertThat(noite.contem(LocalTime.of(6, 0))).isFalse();
        assertThat(noite.contem(LocalTime.of(12, 0))).isFalse();
    }
}
