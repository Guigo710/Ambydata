package com.ambydata.ambydata_backend.simulacao;

import com.ambydata.ambydata_backend.config.CampoInvalidoException;
import com.ambydata.ambydata_backend.maquina.Maquina;
import com.ambydata.ambydata_backend.maquina.MaquinaService;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import jakarta.validation.Valid;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.time.Instant;

// Porta de entrada dos dispositivos (Marco 6). A chave X-Device-Key é conferida antes, pelo
// ChaveDispositivoInterceptor. Cada máquina tem no máximo uma leitura por bloco de 10 s, e só
// perto de agora: assim um dispositivo não reescreve o histórico nem enche o banco com o futuro.
@RestController
public class IngestaoController {

    static final Duration JANELA_PASSADO = Duration.ofMinutes(5);
    // Nada no futuro: com folga, quem tem a chave ocupava os próximos blocos de 10 s e a leitura
    // real do sensor recebia 409 (e um superaquecimento não abria chamado).
    static final Duration JANELA_FUTURO = Duration.ZERO;

    private final MaquinaService maquinas;
    private final MongoTemplate mongoTemplate;

    public IngestaoController(MaquinaService maquinas, MongoTemplate mongoTemplate) {
        this.maquinas = maquinas;
        this.mongoTemplate = mongoTemplate;
    }

    @PostMapping("/api/leituras")
    @ResponseStatus(HttpStatus.CREATED)
    @SecurityRequirements // sem JWT: usa o header X-Device-Key
    public Leitura receber(
            @Parameter(description = "Chave do dispositivo (DEVICE_KEY)")
            @RequestHeader(name = ChaveDispositivoInterceptor.HEADER, required = false) String chave,
            @Valid @RequestBody LeituraDispositivoRequest dados) {
        Maquina maquina = maquinas.buscar(dados.maquinaId()); // 404 se a máquina não existir
        if (!maquina.isAtiva()) {
            throw new CampoInvalidoException("maquinaId", "Máquina inativa não recebe leituras.");
        }
        if (dados.pecasBoas() > dados.pecasProduzidas()) {
            throw new CampoInvalidoException("pecasBoas", "Peças boas não podem passar das produzidas.");
        }
        Instant agora = Instant.now();
        Instant instante = dados.instante() != null ? dados.instante() : agora;
        if (instante.isBefore(agora.minus(JANELA_PASSADO)) || instante.isAfter(agora.plus(JANELA_FUTURO))) {
            throw new CampoInvalidoException("instante", "O instante precisa estar nos últimos 5 minutos, não no futuro (ou omita o campo).");
        }
        Leitura leitura = new Leitura(Leitura.idDe(dados.maquinaId(), instante), dados.maquinaId(), instante,
                dados.status(), dados.temperatura(), dados.pecasProduzidas(), dados.pecasBoas(),
                dados.segundosParado(), OrigemLeitura.DISPOSITIVO);
        try {
            return mongoTemplate.insert(leitura);
        } catch (DuplicateKeyException e) {
            throw new LeituraDuplicadaException();
        }
    }
}
