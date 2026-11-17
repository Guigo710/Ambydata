package com.ambydata.ambydata_backend.maquina;

import com.ambydata.ambydata_backend.config.CampoInvalidoException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;

// Cadastro de máquinas (o ENGENHEIRO configura parâmetros e limites de alerta).
@Service
public class MaquinaService {

    static final Sort ORDEM = Sort.by("linha", "nome");

    private final MaquinaRepository repositorio;

    public MaquinaService(MaquinaRepository repositorio) {
        this.repositorio = repositorio;
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
        return salvar(maquina);
    }

    public Maquina atualizar(String id, MaquinaRequest dados) {
        Maquina maquina = buscar(id);
        aplicar(maquina, dados);
        return salvar(maquina);
    }

    public Maquina alterarAtiva(String id, boolean ativa) {
        Maquina maquina = buscar(id);
        maquina.setAtiva(ativa);
        return repositorio.save(maquina);
    }

    private void aplicar(Maquina maquina, MaquinaRequest dados) {
        String nome = dados.nome().trim();
        repositorio.findByNomeIgnoreCase(nome)
                .filter(outra -> !outra.getId().equals(maquina.getId()))
                .ifPresent(outra -> { throw new CampoInvalidoException("nome", "Já existe uma máquina com esse nome."); });
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

    private Maquina salvar(Maquina maquina) {
        try {
            return repositorio.save(maquina);
        } catch (DuplicateKeyException e) {
            throw new CampoInvalidoException("nome", "Já existe uma máquina com esse nome.");
        }
    }
}
