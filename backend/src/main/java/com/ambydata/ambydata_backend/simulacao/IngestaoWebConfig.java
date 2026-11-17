package com.ambydata.ambydata_backend.simulacao;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class IngestaoWebConfig implements WebMvcConfigurer {

    private final ChaveDispositivoInterceptor chaveDispositivo;

    public IngestaoWebConfig(ChaveDispositivoInterceptor chaveDispositivo) {
        this.chaveDispositivo = chaveDispositivo;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(chaveDispositivo).addPathPatterns("/api/leituras");
    }
}
