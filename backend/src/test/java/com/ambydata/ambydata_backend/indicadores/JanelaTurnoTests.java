package com.ambydata.ambydata_backend.indicadores;

import com.ambydata.ambydata_backend.maquina.Turno;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;

class JanelaTurnoTests {

    private static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");
    private static final Turno DIA = new Turno("06:00", "22:00");
    private static final Turno NOITE = new Turno("22:00", "06:00");

    @Test
    void duranteOTurnoVaiDoInicioAteAgora() {
        JanelaTurno j = JanelaTurno.atualOuUltimo(DIA, sp(2026, 11, 10, 13, 20), FUSO);
        assertThat(j.inicio()).isEqualTo(sp(2026, 11, 10, 6, 0));
        assertThat(j.fim()).isEqualTo(sp(2026, 11, 10, 13, 20));
        assertThat(j.emAndamento()).isTrue();
    }

    @Test
    void depoisDoTurnoMostraOQueAcabouDeTerminar() {
        JanelaTurno j = JanelaTurno.atualOuUltimo(DIA, sp(2026, 11, 10, 23, 0), FUSO);
        assertThat(j.inicio()).isEqualTo(sp(2026, 11, 10, 6, 0));
        assertThat(j.fim()).isEqualTo(sp(2026, 11, 10, 22, 0));
        assertThat(j.emAndamento()).isFalse();
    }

    @Test
    void antesDoTurnoDeHojeMostraODeOntem() {
        JanelaTurno j = JanelaTurno.atualOuUltimo(DIA, sp(2026, 11, 10, 3, 0), FUSO);
        assertThat(j.inicio()).isEqualTo(sp(2026, 11, 9, 6, 0));
        assertThat(j.fim()).isEqualTo(sp(2026, 11, 9, 22, 0));
    }

    @Test
    void turnoDaNoiteAtravessaAMeiaNoite() {
        JanelaTurno madrugada = JanelaTurno.atualOuUltimo(NOITE, sp(2026, 11, 10, 2, 0), FUSO);
        assertThat(madrugada.inicio()).isEqualTo(sp(2026, 11, 9, 22, 0));
        assertThat(madrugada.fim()).isEqualTo(sp(2026, 11, 10, 2, 0));

        JanelaTurno manha = JanelaTurno.atualOuUltimo(NOITE, sp(2026, 11, 10, 10, 0), FUSO);
        assertThat(manha.inicio()).isEqualTo(sp(2026, 11, 9, 22, 0));
        assertThat(manha.fim()).isEqualTo(sp(2026, 11, 10, 6, 0));
    }

    private static Instant sp(int ano, int mes, int dia, int hora, int minuto) {
        return LocalDateTime.of(ano, mes, dia, hora, minuto).atZone(FUSO).toInstant();
    }
}
