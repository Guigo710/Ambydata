package com.ambydata.ambydata_backend.chamado;

import com.ambydata.ambydata_backend.config.CampoInvalidoException;
import com.ambydata.ambydata_backend.maquina.Maquina;
import com.ambydata.ambydata_backend.maquina.MaquinaService;
import com.ambydata.ambydata_backend.notificacao.NotificacaoService;
import com.ambydata.ambydata_backend.usuario.Usuario;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    private static final Logger log = LoggerFactory.getLogger(ChamadoService.class);

    public static final Duration FINALIZADOS_VISIVEIS = Duration.ofDays(7);
    public static final int LIMITE_FINALIZADOS = 200;      // finalizados na tela (os mais recentes)
    public static final int LIMITE_ATIVOS = 1000;          // abertos e em andamento: todos, com teto de segurança
    public static final int LIMITE_HISTORICO = 200;        // eventos guardados por chamado (os mais recentes)
    public static final int MAXIMO_POR_JANELA = 10;        // chamados que uma pessoa abre em 10 min
    static final Duration JANELA_ABERTURA = Duration.ofMinutes(10);
    private static final Map<StatusChamado, String> NOME = Map.of(
            StatusChamado.ABERTO, "aberto", StatusChamado.EM_ANDAMENTO, "em andamento",
            StatusChamado.FINALIZADO, "finalizado", StatusChamado.CANCELADO, "cancelado");

    private final MongoTemplate mongoTemplate;
    private final MaquinaService maquinas;
    private final NotificacaoService notificacoes;

    public ChamadoService(MongoTemplate mongoTemplate, MaquinaService maquinas, NotificacaoService notificacoes) {
        this.mongoTemplate = mongoTemplate;
        this.maquinas = maquinas;
        this.notificacoes = notificacoes;
    }

    public Chamado abrir(AbrirChamadoRequest dados, Usuario usuario) {
        Maquina maquina = maquinas.buscar(dados.maquinaId());
        if (!maquina.isAtiva()) {
            throw new CampoInvalidoException("maquinaId", "Máquina inativa não recebe chamados.");
        }
        Instant agora = Instant.now();
        long recentes = mongoTemplate.count(Query.query(Criteria.where("abertoPor.usuarioId").is(usuario.getId())
                .and("abertoEm").gte(agora.minus(JANELA_ABERTURA))), Chamado.class);
        if (recentes >= MAXIMO_POR_JANELA) {
            throw new MuitosChamadosException();
        }
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

    // Sem status: abertos e em andamento (todos) e os finalizados dos últimos 7 dias (os 200
    // mais recentes) — finalizados em massa não empurram os abertos para fora da lista. Sem o
    // histórico, que só o detalhe usa.
    public List<Chamado> listar(String status, String maquinaId, Instant agora) {
        List<StatusChamado> ativos = List.of(StatusChamado.ABERTO, StatusChamado.EM_ANDAMENTO);
        List<Chamado> resultado = new ArrayList<>();
        if (status == null || status.isBlank()) {
            resultado.addAll(buscarLista(Criteria.where("status").in(ativos), maquinaId, "abertoEm", LIMITE_ATIVOS));
            resultado.addAll(buscarLista(finalizadosRecentes(agora), maquinaId, "finalizadoEm", LIMITE_FINALIZADOS));
            return resultado;
        }
        StatusChamado filtro = statusDe(status);
        return switch (filtro) {
            case FINALIZADO -> buscarLista(finalizadosRecentes(agora), maquinaId, "finalizadoEm", LIMITE_FINALIZADOS);
            case CANCELADO -> buscarLista(Criteria.where("status").is(filtro), maquinaId, "canceladoEm", LIMITE_FINALIZADOS);
            default -> buscarLista(Criteria.where("status").is(filtro), maquinaId, "abertoEm", LIMITE_ATIVOS);
        };
    }

    private static Criteria finalizadosRecentes(Instant agora) {
        return Criteria.where("status").is(StatusChamado.FINALIZADO).and("finalizadoEm").gte(agora.minus(FINALIZADOS_VISIVEIS));
    }

    private List<Chamado> buscarLista(Criteria criterio, String maquinaId, String ordem, int limite) {
        Query query = Query.query(criterio).with(Sort.by(Sort.Direction.DESC, ordem)).limit(limite);
        if (maquinaId != null && !maquinaId.isBlank()) {
            query.addCriteria(Criteria.where("maquinaId").is(maquinaId));
        }
        query.fields().exclude("historico");
        return mongoTemplate.find(query, Chamado.class);
    }

    // Acrescenta um evento guardando só os LIMITE_HISTORICO mais recentes.
    public static Update registrarEvento(Update update, EventoChamado evento) {
        update.push("historico").slice(-LIMITE_HISTORICO).each(evento);
        return update;
    }

    public MttrResponse mttr(String maquinaId, int dias, Instant agora) {
        if (dias < 1 || dias > 30) {
            throw new CampoInvalidoException("dias", "Informe de 1 a 30 dias.");
        }
        Query query = Query.query(Criteria.where("status").is(StatusChamado.FINALIZADO)
                .and("finalizadoEm").gte(agora.minus(Duration.ofDays(dias))));
        if (maquinaId != null && !maquinaId.isBlank()) {
            query.addCriteria(Criteria.where("maquinaId").is(maquinaId));
        }
        query.fields().include("abertoEm").include("finalizadoEm");
        List<Chamado> finalizados = mongoTemplate.find(query, Chamado.class);
        Double media = finalizados.isEmpty() ? null : finalizados.stream()
                .mapToDouble(c -> Duration.between(c.getAbertoEm(), c.getFinalizadoEm()).toSeconds() / 60.0)
                .average().orElseThrow();
        return new MttrResponse(maquinaId, dias, finalizados.size(), media);
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
        Update update = new Update()
                .set("status", StatusChamado.EM_ANDAMENTO)
                .set("responsavel", pessoa(engenheiro))
                .set("assumidoEm", agora);
        return transicao(Criteria.where("_id").is(id).and("status").is(StatusChamado.ABERTO),
                registrarEvento(update, new EventoChamado(agora, TipoEvento.ASSUMIDO, "Assumido.", engenheiro.getNome())),
                id, "Só um chamado aberto pode ser assumido", engenheiro);
    }

    // Avisa quem abriu (se foi uma pessoa, e não quem está finalizando).
    public Chamado finalizar(String id, String solucao, Usuario engenheiro) {
        Chamado finalizado = finalizarSemAviso(id, solucao, engenheiro);
        avisarQuemAbriu(finalizado, engenheiro, "foi finalizado por " + engenheiro.getNome() + ".");
        return finalizado;
    }

    // O aviso é consequência: se falhar, a transição (já feita) não vira erro para o cliente.
    private void avisarQuemAbriu(Chamado c, Usuario quem, String oQueAconteceu) {
        PessoaChamado abriu = c.getAbertoPor();
        if (abriu.sistema() || abriu.usuarioId() == null || abriu.usuarioId().equals(quem.getId())) {
            return;
        }
        try {
            notificacoes.criar(abriu.usuarioId(), "Seu chamado da máquina " + c.getMaquinaNome() + " " + oQueAconteceu, link(c));
        } catch (RuntimeException e) {
            log.warn("Chamados: {} sem aviso para quem abriu: {}", c.getId(), e.getMessage());
        }
    }

    public static String link(Chamado c) {
        return "/manutencao?chamado=" + c.getId();
    }

    // Só o responsável finaliza o que assumiu (quem resolveu é quem fica no histórico e no MTTR).
    private Chamado finalizarSemAviso(String id, String solucao, Usuario engenheiro) {
        Instant agora = Instant.now();
        Update update = new Update()
                .set("status", StatusChamado.FINALIZADO)
                .set("finalizadoEm", agora)
                .set("solucao", solucao.trim())
                .unset("ativoAutomatico");
        return transicao(Criteria.where("_id").is(id).and("status").is(StatusChamado.EM_ANDAMENTO)
                        .and("responsavel.usuarioId").is(engenheiro.getId()),
                registrarEvento(update, new EventoChamado(agora, TipoEvento.FINALIZADO, "Finalizado: " + solucao.trim(), engenheiro.getNome())),
                id, "Só um chamado em andamento pode ser finalizado", engenheiro);
    }

    // Aberto: qualquer engenheiro cancela. Em andamento: só o responsável.
    public Chamado cancelar(String id, String motivo, Usuario engenheiro) {
        Instant agora = Instant.now();
        Update update = new Update()
                .set("status", StatusChamado.CANCELADO)
                .set("canceladoEm", agora)
                .set("motivoCancelamento", motivo.trim())
                .unset("ativoAutomatico");
        Criteria podeCancelar = new Criteria().orOperator(
                Criteria.where("status").is(StatusChamado.ABERTO),
                Criteria.where("status").is(StatusChamado.EM_ANDAMENTO).and("responsavel.usuarioId").is(engenheiro.getId()));
        Chamado cancelado = transicao(new Criteria().andOperator(Criteria.where("_id").is(id), podeCancelar),
                registrarEvento(update, new EventoChamado(agora, TipoEvento.CANCELADO, "Cancelado: " + motivo.trim(), engenheiro.getNome())),
                id, "Só um chamado aberto ou em andamento pode ser cancelado", engenheiro);
        avisarQuemAbriu(cancelado, engenheiro, "foi cancelado por " + engenheiro.getNome() + ": " + motivo.trim());
        return cancelado;
    }

    private Chamado transicao(Criteria condicao, Update update, String id, String regra, Usuario quem) {
        Chamado c = mongoTemplate.findAndModify(Query.query(condicao), update,
                FindAndModifyOptions.options().returnNew(true), Chamado.class);
        if (c == null) {
            throw recusa(id, regra, quem);
        }
        return c;
    }

    private RuntimeException recusa(String id, String regra, Usuario quem) {
        Chamado atual = buscar(id); // 404 se não existe
        PessoaChamado responsavel = atual.getResponsavel();
        if (atual.getStatus() == StatusChamado.EM_ANDAMENTO && responsavel != null
                && !quem.getId().equals(responsavel.usuarioId())) {
            return new TransicaoInvalidaException("Só o responsável (" + responsavel.nome() + ") pode encerrar este chamado.");
        }
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
