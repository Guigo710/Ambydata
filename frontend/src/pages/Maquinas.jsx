import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useAuth } from "../auth/contexto";
import MaquinaForm from "../components/MaquinaForm";
import { api, mensagemDeErro } from "../services/api";
import { CHAVE_MAQUINAS, TIPOS_DE_MAQUINA, formatarNumero, useMaquinas } from "../services/maquinas";

// Cadastro das máquinas: o ENGENHEIRO cria, edita e desativa; o DIRETOR só consulta.
export default function Maquinas() {
  const { t } = useTranslation();
  const { perfil } = useAuth();
  const podeEditar = perfil === "ENGENHEIRO";
  const queryClient = useQueryClient();
  const lista = useMaquinas();
  const [painel, setPainel] = useState(null); // null | { maquina? }
  const [aviso, setAviso] = useState(null);

  // Parâmetros da máquina mudam faixa, cadência, potência: os indicadores também se refazem.
  const atualizar = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: CHAVE_MAQUINAS }),
    queryClient.invalidateQueries({ queryKey: ["indicadores"] }),
  ]);

  const salvar = useMutation({
    mutationFn: ({ id, ...dados }) => (id ? api.put(`/api/maquinas/${id}`, dados) : api.post("/api/maquinas", dados)),
    onSuccess: (_, { id }) => {
      setPainel(null);
      setAviso(id ? t("pages.machines.updated") : t("pages.machines.created"));
      return atualizar();
    },
  });

  const alternarAtiva = useMutation({
    mutationFn: (maquina) => api.patch(`/api/maquinas/${maquina.id}/ativa`, { ativa: !maquina.ativa }),
    onSuccess: atualizar,
  });

  const abrir = (novo) => {
    salvar.reset();
    setAviso(null);
    setPainel(novo);
  };

  return (
    <>
      <div className="page-header usuarios-cabecalho">
        <div>
          <h1 className="page-title">{t("pages.machines.title")}</h1>
          <p className="page-greeting">{t("pages.machines.subtitle")}</p>
        </div>
        {podeEditar && <button type="button" className="btn-primario" onClick={() => abrir({})}>{t("pages.machines.new")}</button>}
      </div>

      {aviso && <div className="success-message" role="status">{aviso}</div>}
      {alternarAtiva.isError && <div className="error-message" role="alert">{mensagemDeErro(alternarAtiva.error)}</div>}

      {painel && (
        <MaquinaForm
          key={painel.maquina?.id ?? "nova"}
          maquina={painel.maquina}
          pendente={salvar.isPending}
          erro={salvar.isError
            ? { mensagem: mensagemDeErro(salvar.error), campos: salvar.error?.response?.data?.campos }
            : null}
          onEnviar={(dados) => salvar.mutate(dados)}
          onCancelar={() => abrir(null)}
        />
      )}

      <section className="card">
        {lista.isPending && <p className="tabela-vazia">{t("pages.machines.loading")}</p>}
        {lista.isError && <div className="error-message" role="alert">{mensagemDeErro(lista.error)}</div>}
        {lista.isSuccess && (
          <table className="tabela">
            <thead>
              <tr>
                <th scope="col">{t("common.machine")}</th>
                <th scope="col">{t("common.sector")}</th>
                <th scope="col">{t("common.line")}</th>
                <th scope="col">{t("machines.allowedRange")}</th>
                <th scope="col">{t("machines.critical")}</th>
                <th scope="col">{t("common.situation")}</th>
                {podeEditar && <th scope="col"><span className="sr-only">{t("common.actions")}</span></th>}
              </tr>
            </thead>
            <tbody>
              {lista.data.map((m) => (
                <tr key={m.id} className={m.ativa ? "" : "linha-inativa"}>
                  <td>
                    {m.nome}
                    <span className="tabela-detalhe">
                      {t(`machines.types.${m.tipo}`, { defaultValue: TIPOS_DE_MAQUINA[m.tipo] ?? m.tipo })} · {m.cadenciaIdeal} {t("machines.piecesPerMinute")}
                    </span>
                  </td>
                  <td>{m.setor}</td>
                  <td>{m.linha}</td>
                  <td>{t("machines.rangeValue", {
                    min: formatarNumero(m.faixaTemperatura.min),
                    max: formatarNumero(m.faixaTemperatura.max),
                  })}</td>
                  <td>{t("pages.machines.critical", {
                    min: formatarNumero(m.limiteCritico.min),
                    max: formatarNumero(m.limiteCritico.max),
                  })}</td>
                  <td>
                    <span className={`situacao ${m.ativa ? "situacao-ativo" : "situacao-inativo"}`}>
                      {m.ativa ? t("pages.machines.active") : t("pages.machines.inactive")}
                    </span>
                  </td>
                  {podeEditar && (
                    <td className="tabela-acoes">
                      <button type="button" className="btn-link" onClick={() => abrir({ maquina: m })}>{t("pages.machines.edit")}</button>
                      <button type="button" className="btn-link" disabled={alternarAtiva.isPending}
                        onClick={() => { setAviso(null); alternarAtiva.mutate(m); }}>
                        {m.ativa ? t("pages.machines.deactivate") : t("pages.machines.activate")}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
