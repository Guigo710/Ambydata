package com.ambydata.ambydata_backend.chamado;

import com.fasterxml.jackson.annotation.JsonInclude;

// MTTR (tempo médio de reparo) = média de (finalização − abertura) dos chamados finalizados
// nos últimos `dias`. Sem chamados finalizados, mttrMinutos fica ausente.
@JsonInclude(JsonInclude.Include.NON_NULL)
public record MttrResponse(String maquinaId, int dias, int chamadosFinalizados, Double mttrMinutos) {
}
