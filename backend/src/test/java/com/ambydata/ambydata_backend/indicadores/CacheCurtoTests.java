package com.ambydata.ambydata_backend.indicadores;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CacheCurtoTests {

    private final AtomicLong agora = new AtomicLong();
    private final AtomicInteger calculos = new AtomicInteger();

    @Test
    void reaproveitaDentroDaValidadeERecalculaDepois() {
        CacheCurto cache = new CacheCurto(Duration.ofSeconds(5), agora::get);

        assertThat(cache.obter("resumo", calculos::incrementAndGet)).isEqualTo(1);
        agora.addAndGet(Duration.ofSeconds(4).toNanos());
        assertThat(cache.obter("resumo", calculos::incrementAndGet)).isEqualTo(1);
        assertThat(cache.obter("agora:m1", calculos::incrementAndGet)).isEqualTo(2); // outra chave
        agora.addAndGet(Duration.ofSeconds(2).toNanos());
        assertThat(cache.obter("resumo", calculos::incrementAndGet)).isEqualTo(3);
    }

    @Test
    void validadeZeroNaoGuarda() {
        CacheCurto cache = new CacheCurto(Duration.ZERO, agora::get);
        cache.obter("resumo", calculos::incrementAndGet);
        cache.obter("resumo", calculos::incrementAndGet);
        assertThat(calculos).hasValue(2);
    }

    @Test
    void erroNaoFicaGuardado() {
        CacheCurto cache = new CacheCurto(Duration.ofSeconds(5), agora::get);
        assertThatThrownBy(() -> cache.obter("agora:x", () -> { throw new IllegalStateException("falhou"); }))
                .isInstanceOf(IllegalStateException.class);
        assertThat(cache.obter("agora:x", calculos::incrementAndGet)).isEqualTo(1);
    }
}
