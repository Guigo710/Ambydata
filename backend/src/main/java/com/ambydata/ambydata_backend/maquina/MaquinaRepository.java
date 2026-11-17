package com.ambydata.ambydata_backend.maquina;

import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface MaquinaRepository extends MongoRepository<Maquina, String> {

    Optional<Maquina> findByNomeIgnoreCase(String nome);

    List<Maquina> findByAtiva(boolean ativa, Sort ordem);
}
