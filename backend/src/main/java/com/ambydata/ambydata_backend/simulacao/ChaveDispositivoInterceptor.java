package com.ambydata.ambydata_backend.simulacao;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

// Confere X-Device-Key antes de o corpo ser lido: sem chave válida, 401 sem dizer nada sobre os campos.
@Component
public class ChaveDispositivoInterceptor implements HandlerInterceptor {

    public static final String HEADER = "X-Device-Key";

    private final DispositivoProperties dispositivo;

    public ChaveDispositivoInterceptor(DispositivoProperties dispositivo) {
        this.dispositivo = dispositivo;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!chaveValida(request.getHeader(HEADER))) {
            throw new DispositivoNaoAutorizadoException();
        }
        return true;
    }

    // Comparação em tempo constante, para o tempo de resposta não revelar a chave.
    private boolean chaveValida(String recebida) {
        if (!dispositivo.ativa() || recebida == null) {
            return false;
        }
        return MessageDigest.isEqual(dispositivo.chave().getBytes(StandardCharsets.UTF_8),
                recebida.getBytes(StandardCharsets.UTF_8));
    }
}
