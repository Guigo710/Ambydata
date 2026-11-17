package com.ambydata.ambydata_backend.chamado;

import com.ambydata.ambydata_backend.config.CampoInvalidoException;
import com.ambydata.ambydata_backend.maquina.Maquina;
import com.ambydata.ambydata_backend.maquina.MaquinaService;
import com.ambydata.ambydata_backend.usuario.Usuario;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

// Ciclo do chamado. Cada transição é um findAndModify que só acontece se o status ainda é o
// esperado: dois engenheiros clicando juntos, um ganha e o outro recebe 409.
@Service
public class ChamadoService {

    public static final Duration FINALIZADOS_VISIVEIS = Duration.ofDays(7);
    private static final int LIMITE_LISTA = 500;
    private static final Map<StatusChamado, String> NOME = Map.of(
            StatusChamado.ABERTO, "aberto", StatusChamado.EM_ANDAMENTO, "em andamento",
            StatusChamado.FINALIZADO, "finalizado", StatusChamado.CANCELADO, "cancelado");

    private final MongoTemplate mongoTemplate;
    private final MaquinaService maquinas;

    public ChamadoService(MongoTemplate mongoTemplate, MaquinaService maquinas) {
        this.mongoTemplate = mongoTemplate;
        this.maquinas = maquinas;
    }

    public Chamado abrir(AbrirChamadoRequest dados, Usuario usuario) {
        Maquina maquina = maquinas.buscar(dados.maquinaId());
        if (!maquina.isAtiva()) {
            throw new CampoInvalidoException("maquinaId", "Máquina inativa não recebe chamados.");
        }
        Instant agora = Instant.now();
        Chamado c = new Chamado();
        c.setTipo(dados.tipo());
        c.setMaquinaId(maquina.getId());
        c.setMaquinaNome(maquina.getNome());
        c.setSetor(maquina.getSetor());
        c.setLinha(maquina.getLinha());
        c.setDescricao(dados.descricao().trim());
        c.setPrioridade(dados.prioridade());
        c.setStatus(StatusChamado.ABERTO);
        c.setAbertoPor(pessoa(usuario));
        c.setAbertoEm(agora);
        c.setHistorico(new ArrayList<>(List.of(new EventoChamado(agora, TipoEvento.ABERTO,
                "Chamado aberto.", usuario.getNome()))));
        return mongoTemplate.insert(c);
    }

    // Sem status: abertos, em andamento e finalizados dos últimos 7 dias (o kanban).
    public List<Chamado> listar(String status, String maquinaId, Instant agora) {
        Criteria criterio;
        if (status == null || status.isBlank()) {
            criterio = new Criteria().orOperator(
                    Criteria.where("status").in(StatusChamado.ABERTO, StatusChamado.EM_ANDAMENTO),
                    Criteria.where("status").is(StatusChamado.FINALIZADO).and("finalizadoEm").gte(agora.minus(FINALIZADOS_VISIVEIS)));
        } else {
            StatusChamado filtro = statusDe(status);
            criterio = Criteria.where("status").is(filtro);
            if (filtro == StatusChamado.FINALIZADO) {
                criterio = criterio.and("finalizadoEm").gte(agora.minus(FINALIZADOS_VISIVEIS));
            }
        }
        Query query = Query.query(criterio).with(Sort.by(Sort.Direction.DESC, "abertoEm")).limit(LIMITE_LISTA);
        if (maquinaId != null && !maquinaId.isBlank()) {
            query.addCriteria(Criteria.where("maquinaId").is(maquinaId));
        }
        return mongoTemplate.find(query, Chamado.class);
    }

    public Chamado buscar(String id) {
        Chamado c = mongoTemplate.findById(id, Chamado.class);
        if (c == null) {
            throw new ChamadoNaoEncontradoException();
        }
        return c;
    }

    public Chamado assumir(String id, Usuario engenheiro) {
        Instant agora = Instant.now();
        return transicao(id, StatusChamado.ABERTO, new Update()
                .set("status", StatusChamado.EM_ANDAMENTO)
                .set("responsavel", pessoa(engenheiro))
                .set("assumidoEm", agora)
                .push("historico", new EventoChamado(agora, TipoEvento.ASSUMIDO, "Assumido.", engenheiro.getNome())),
                "Só um chamado aberto pode ser assumido");
    }

    public Chamado finalizar(String id, String solucao, Usuario engenheiro) {
        Instant agora = Instant.now();
        return transicao(id, StatusChamado.EM_ANDAMENTO, new Update()
                .set("status", StatusChamado.FINALIZADO)
                .set("finalizadoEm", agora)
                .set("solucao", solucao.trim())
                .push("historico", new EventoChamado(agora, TipoEvento.FINALIZADO, "Finalizado: " + solucao.trim(), engenheiro.getNome())),
                "Só um chamado em andamento pode ser finalizado");
    }

    public Chamado cancelar(String id, String motivo, Usuario engenheiro) {
        Instant agora = Instant.now();
        Query query = Query.query(Criteria.where("_id").is(id).and("status").in(StatusChamado.ABERTO, StatusChamado.EM_ANDAMENTO));
        Chamado c = mongoTemplate.findAndModify(query, new Update()
                .set("status", StatusChamado.CANCELADO)
                .set("canceladoEm", agora)
                .set("motivoCancelamento", motivo.trim())
                .push("historico", new EventoChamado(agora, TipoEvento.CANCELADO, "Cancelado: " + motivo.trim(), engenheiro.getNome())),
                FindAndModifyOptions.options().returnNew(true), Chamado.class);
        if (c == null) {
            throw recusa(id, "Só um chamado aberto ou em andamento pode ser cancelado");
        }
        return c;
    }

    private Chamado transicao(String id, StatusChamado esperado, Update update, String regra) {
        Chamado c = mongoTemplate.findAndModify(Query.query(Criteria.where("_id").is(id).and("status").is(esperado)),
                update, FindAndModifyOptions.options().returnNew(true), Chamado.class);
        if (c == null) {
            throw recusa(id, regra);
        }
        return c;
    }

    private RuntimeException recusa(String id, String regra) {
        Chamado atual = buscar(id); // 404 se não existe
        return new TransicaoInvalidaException(regra + "; este está " + NOME.get(atual.getStatus()) + ".");
    }

    private static PessoaChamado pessoa(Usuario usuario) {
        return new PessoaChamado(usuario.getId(), usuario.getNome(), false);
    }

    private static StatusChamado statusDe(String texto) {
        try {
            return StatusChamado.valueOf(texto);
        } catch (IllegalArgumentException e) {
            throw new CampoInvalidoException("status", "Use ABERTO, EM_ANDAMENTO, FINALIZADO ou CANCELADO.");
        }
    }
}
