package com.ambydata.ambydata_backend.indicadores;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.LongSupplier;
import java.util.function.Supplier;

// Guarda por alguns segundos as respostas "ao vivo" (resumo, agora de uma máquina), que são as
// mesmas para todos os perfis de produção: muitas telas abertas buscando a cada 10 s viram uma
// consulta ao banco por janela. 0 desliga (testes). Exceções não são guardadas.
@Component
public class CacheCurto {

    private record Entrada(long expiraEm, Object valor) {
    }

    private final long validadeNanos;
    private final LongSupplier relogio;
    private final Map<String, Entrada> entradas = new ConcurrentHashMap<>();

    @Autowired
    public CacheCurto(@Value("${app.indicadores.cache-segundos:5}") int segundos) {
        this(Duration.ofSeconds(segundos), System::nanoTime);
    }

    CacheCurto(Duration validade, LongSupplier relogio) {
        this.validadeNanos = validade.toNanos();
        this.relogio = relogio;
    }

    @SuppressWarnings("unchecked")
    public <T> T obter(String chave, Supplier<T> calcular) {
        if (validadeNanos == 0) {
            return calcular.get();
        }
        long agora = relogio.getAsLong();
        Entrada atual = entradas.get(chave);
        if (atual != null && agora - atual.expiraEm() < 0) {
            return (T) atual.valor();
        }
        T valor = calcular.get();
        entradas.put(chave, new Entrada(agora + validadeNanos, valor));
        return valor;
    }
}
