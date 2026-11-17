package com.ambydata.ambydata_backend.maquina;

import com.ambydata.ambydata_backend.config.CampoInvalidoException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.util.List;

// Cadastro de máquinas (o ENGENHEIRO configura parâmetros e limites de alerta).
@Service
public class MaquinaService {

    static final Sort ORDEM = Sort.by("linha", "nome");

    private final MaquinaRepository repositorio;
    private final MongoTemplate mongoTemplate;

    public MaquinaService(MaquinaRepository repositorio, MongoTemplate mongoTemplate) {
        this.repositorio = repositorio;
        this.mongoTemplate = mongoTemplate;
    }

    public List<Maquina> listar(boolean somenteAtivas) {
        return somenteAtivas ? repositorio.findByAtiva(true, ORDEM) : repositorio.findAll(ORDEM);
    }

    public Maquina buscar(String id) {
        return repositorio.findById(id).orElseThrow(MaquinaNaoEncontradaException::new);
    }

    public Maquina criar(MaquinaRequest dados) {
        Maquina maquina = new Maquina();
        aplicar(maquina, dados);
        try {
            return repositorio.insert(maquina);
        } catch (DuplicateKeyException e) {
            throw nomeRepetido();
        }
    }

    // $set só nos campos do formulário: um PATCH de ativa (ou o cenário) gravado ao mesmo tempo
    // não é desfeito por este PUT.
    public Maquina atualizar(String id, MaquinaRequest dados) {
        Maquina maquina = buscar(id);
        aplicar(maquina, dados);
        Update update = new Update()
                .set("nome", maquina.getNome()).set("tipo", maquina.getTipo())
                .set("setor", maquina.getSetor()).set("linha", maquina.getLinha())
                .set("cadenciaIdeal", maquina.getCadenciaIdeal())
                .set("faixaTemperatura", maquina.getFaixaTemperatura()).set("alertas", maquina.getAlertas())
                .set("custoHora", maquina.getCustoHora()).set("valorPorPeca", maquina.getValorPorPeca())
                .set("turnoPlanejado", maquina.getTurnoPlanejado());
        try {
            mongoTemplate.updateFirst(porId(id), update, Maquina.class);
        } catch (DuplicateKeyException e) {
            throw nomeRepetido();
        }
        return buscar(id);
    }

    public Maquina alterarAtiva(String id, boolean ativa) {
        buscar(id); // 404 se não existir
        mongoTemplate.updateFirst(porId(id), new Update().set("ativa", ativa), Maquina.class);
        return buscar(id);
    }

    private static Query porId(String id) {
        return Query.query(Criteria.where("_id").is(id));
    }

    private static CampoInvalidoException nomeRepetido() {
        return new CampoInvalidoException("nome", "Já existe uma máquina com esse nome.");
    }

    private void aplicar(Maquina maquina, MaquinaRequest dados) {
        String nome = dados.nome().trim();
        repositorio.findByNomeIgnoreCase(nome)
                .filter(outra -> !outra.getId().equals(maquina.getId()))
                .ifPresent(outra -> { throw nomeRepetido(); });
        if (dados.faixaTemperatura().min() >= dados.faixaTemperatura().max()) {
            throw new CampoInvalidoException("faixaTemperatura", "A temperatura mínima precisa ser menor que a máxima.");
        }
        if (dados.turnoPlanejado().inicio().equals(dados.turnoPlanejado().fim())) {
            throw new CampoInvalidoException("turnoPlanejado", "O início e o fim do turno precisam ser diferentes.");
        }
        maquina.setNome(nome);
        maquina.setTipo(dados.tipo());
        maquina.setSetor(dados.setor().trim());
        maquina.setLinha(dados.linha().trim());
        maquina.setCadenciaIdeal(dados.cadenciaIdeal());
        maquina.setFaixaTemperatura(dados.faixaTemperatura());
        maquina.setAlertas(dados.alertas());
        maquina.setCustoHora(dados.custoHora());
        maquina.setValorPorPeca(dados.valorPorPeca());
        maquina.setTurnoPlanejado(dados.turnoPlanejado());
    }
}
