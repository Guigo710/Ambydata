package com.ambydata.ambydata_backend.notificacao;

import com.ambydata.ambydata_backend.usuario.Perfil;
import com.ambydata.ambydata_backend.usuario.Usuario;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

// Cada usuário só vê e marca as suas: toda consulta filtra pelo usuário do token.
@Service
public class NotificacaoService {

    public static final int MAXIMO_NO_SINO = 50;

    private final MongoTemplate mongoTemplate;

    public NotificacaoService(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    public void criar(String usuarioId, String texto, String link) {
        mongoTemplate.insert(new Notificacao(null, usuarioId, texto, link, false, Instant.now()));
    }

    // Para todos os usuários ativos de um perfil (ex.: chamado automático → engenheiros).
    public void criarParaPerfil(Perfil perfil, String texto, String link) {
        Query query = Query.query(Criteria.where("perfil").is(perfil).and("ativo").is(true));
        query.fields().include("_id");
        Instant agora = Instant.now();
        List<Notificacao> novas = mongoTemplate.find(query, Usuario.class).stream()
                .map(u -> new Notificacao(null, u.getId(), texto, link, false, agora)).toList();
        if (!novas.isEmpty()) {
            mongoTemplate.insertAll(novas);
        }
    }

    public NotificacoesResponse listar(Usuario usuario) {
        Criteria minhas = Criteria.where("usuarioId").is(usuario.getId());
        List<Notificacao> itens = mongoTemplate.find(Query.query(minhas)
                .with(Sort.by(Sort.Direction.DESC, "criadaEm").and(Sort.by(Sort.Direction.DESC, "_id"))).limit(MAXIMO_NO_SINO),
                Notificacao.class);
        long naoLidas = mongoTemplate.count(Query.query(Criteria.where("usuarioId").is(usuario.getId()).and("lida").is(false)),
                Notificacao.class);
        return new NotificacoesResponse(naoLidas, itens);
    }

    public void marcarLida(String id, Usuario usuario) {
        var resultado = mongoTemplate.updateFirst(Query.query(Criteria.where("_id").is(id).and("usuarioId").is(usuario.getId())),
                new Update().set("lida", true), Notificacao.class);
        if (resultado.getMatchedCount() == 0) {
            throw new NotificacaoNaoEncontradaException(); // inexistente ou de outra pessoa: mesma resposta
        }
    }

    public void marcarTodas(Usuario usuario) {
        mongoTemplate.updateMulti(Query.query(Criteria.where("usuarioId").is(usuario.getId()).and("lida").is(false)),
                new Update().set("lida", true), Notificacao.class);
    }
}
