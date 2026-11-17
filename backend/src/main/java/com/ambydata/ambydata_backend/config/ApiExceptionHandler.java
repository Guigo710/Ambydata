package com.ambydata.ambydata_backend.config;

import com.ambydata.ambydata_backend.auth.CredenciaisInvalidasException;
import com.ambydata.ambydata_backend.maquina.MaquinaNaoEncontradaException;
import com.ambydata.ambydata_backend.usuario.EmailJaCadastradoException;
import com.ambydata.ambydata_backend.usuario.RegraDeAdminException;
import com.ambydata.ambydata_backend.usuario.SenhaInvalidaException;
import com.ambydata.ambydata_backend.usuario.UsuarioNaoEncontradoException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.LinkedHashMap;
import java.util.Map;

// Converte as exceções da API no formato único de erro (ErroResponse).
@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErroResponse> validacao(MethodArgumentNotValidException ex) {
        Map<String, String> campos = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(erro -> campos.putIfAbsent(erro.getField(), erro.getDefaultMessage()));
        return resposta(HttpStatus.BAD_REQUEST, new ErroResponse(400, "Dados inválidos.", campos));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErroResponse> corpoInvalido(HttpMessageNotReadableException ex) {
        return resposta(HttpStatus.BAD_REQUEST, new ErroResponse(400, "Corpo da requisição inválido."));
    }

    @ExceptionHandler(SenhaInvalidaException.class)
    public ResponseEntity<ErroResponse> senhaInvalida(SenhaInvalidaException ex) {
        return resposta(HttpStatus.BAD_REQUEST, new ErroResponse(400, ex.getMessage()));
    }

    // Mensagem genérica: a de uma IllegalArgumentException pode vir de qualquer biblioteca.
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErroResponse> argumentoInvalido(IllegalArgumentException ex) {
        return resposta(HttpStatus.BAD_REQUEST, new ErroResponse(400, "Requisição inválida."));
    }

    @ExceptionHandler(EmailJaCadastradoException.class)
    public ResponseEntity<ErroResponse> emailDuplicado(EmailJaCadastradoException ex) {
        return resposta(HttpStatus.BAD_REQUEST,
                new ErroResponse(400, ex.getMessage(), Map.of("email", "já cadastrado")));
    }

    @ExceptionHandler(CampoInvalidoException.class)
    public ResponseEntity<ErroResponse> campoInvalido(CampoInvalidoException ex) {
        return resposta(HttpStatus.BAD_REQUEST,
                new ErroResponse(400, ex.getMessage(), Map.of(ex.getCampo(), ex.getMessage())));
    }

    @ExceptionHandler(MaquinaNaoEncontradaException.class)
    public ResponseEntity<ErroResponse> maquinaNaoEncontrada(MaquinaNaoEncontradaException ex) {
        return resposta(HttpStatus.NOT_FOUND, new ErroResponse(404, ex.getMessage()));
    }

    @ExceptionHandler(UsuarioNaoEncontradoException.class)
    public ResponseEntity<ErroResponse> naoEncontrado(UsuarioNaoEncontradoException ex) {
        return resposta(HttpStatus.NOT_FOUND, new ErroResponse(404, ex.getMessage()));
    }

    @ExceptionHandler(RegraDeAdminException.class)
    public ResponseEntity<ErroResponse> regraDeAdmin(RegraDeAdminException ex) {
        return resposta(HttpStatus.CONFLICT, new ErroResponse(409, ex.getMessage()));
    }

    @ExceptionHandler(CredenciaisInvalidasException.class)
    public ResponseEntity<ErroResponse> credenciaisInvalidas(CredenciaisInvalidasException ex) {
        return resposta(HttpStatus.UNAUTHORIZED, new ErroResponse(401, ex.getMessage()));
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ErroResponse> naoAutenticado(AuthenticationException ex) {
        return resposta(HttpStatus.UNAUTHORIZED, new ErroResponse(401, "Faça login para continuar."));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErroResponse> semPermissao(AccessDeniedException ex) {
        return resposta(HttpStatus.FORBIDDEN, new ErroResponse(403, "Seu perfil não tem acesso a este recurso."));
    }

    private static ResponseEntity<ErroResponse> resposta(HttpStatus status, ErroResponse corpo) {
        return ResponseEntity.status(status).body(corpo);
    }
}
