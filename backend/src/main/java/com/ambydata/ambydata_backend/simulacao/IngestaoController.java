package com.ambydata.ambydata_backend.simulacao;

import com.ambydata.ambydata_backend.config.CampoInvalidoException;
import com.ambydata.ambydata_backend.maquina.MaquinaService;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import jakarta.validation.Valid;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;

// Porta de entrada dos dispositivos (Marco 6). Autentica pela chave X-Device-Key, não por JWT.
@RestController
public class IngestaoController {

    private final DispositivoProperties dispositivo;
    private final MaquinaService maquinas;
    private final MongoTemplate mongoTemplate;

    public IngestaoController(DispositivoProperties dispositivo, MaquinaService maquinas, MongoTemplate mongoTemplate) {
        this.dispositivo = dispositivo;
        this.maquinas = maquinas;
        this.mongoTemplate = mongoTemplate;
    }

    @PostMapping("/api/leituras")
    @ResponseStatus(HttpStatus.CREATED)
    @SecurityRequirements // sem JWT: usa o header X-Device-Key
    public Leitura receber(@RequestHeader(name = "X-Device-Key", required = false) String chave,
            @Valid @RequestBody LeituraDispositivoRequest dados) {
        if (!chaveValida(chave)) {
            throw new DispositivoNaoAutorizadoException();
        }
        maquinas.buscar(dados.maquinaId()); // 404 se a máquina não existir
        if (dados.pecasBoas() > dados.pecasProduzidas()) {
            throw new CampoInvalidoException("pecasBoas", "Peças boas não podem passar das produzidas.");
        }
        Instant instante = dados.instante() != null ? dados.instante() : Instant.now();
        Leitura leitura = new Leitura(Leitura.idDe(dados.maquinaId(), instante), dados.maquinaId(), instante,
                dados.status(), dados.temperatura(), dados.pecasProduzidas(), dados.pecasBoas(),
                dados.segundosParado(), OrigemLeitura.DISPOSITIVO);
        return mongoTemplate.save(leitura);
    }

    // Comparação em tempo constante, para o tempo de resposta não revelar a chave.
    private boolean chaveValida(String recebida) {
        String esperada = dispositivo.chave();
        if (esperada == null || esperada.isBlank() || recebida == null) {
            return false;
        }
        return MessageDigest.isEqual(esperada.getBytes(StandardCharsets.UTF_8), recebida.getBytes(StandardCharsets.UTF_8));
    }
}
