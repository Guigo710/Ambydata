package com.ambydata.ambydata_backend.config;

import com.ambydata.ambydata_backend.auth.JwtAuthFilter;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.servlet.HandlerExceptionResolver;

import java.util.List;

// Quem pode chamar o quê. Toda rota nova precisa de uma linha aqui: o padrão é negar.
@Configuration
public class SecurityConfig {

    // Perfis que veem as telas de produção (o ADMIN cuida só de usuários).
    private static final String[] PRODUCAO = {"OPERARIO", "ENGENHEIRO", "DIRETOR"};

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, JwtAuthFilter jwtAuthFilter,
            @Qualifier("handlerExceptionResolver") HandlerExceptionResolver resolver) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            // Sem sessão no servidor: "sair" é o frontend apagar o token.
            .logout(AbstractHttpConfigurer::disable)
            .cors(cors -> {})
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
            // 401 e 403 saem no formato padrão de erro, montado pelo ApiExceptionHandler.
            .exceptionHandling(e -> e
                .authenticationEntryPoint((req, res, ex) -> resolver.resolveException(req, res, null, ex))
                .accessDeniedHandler((req, res, ex) -> resolver.resolveException(req, res, null, ex)))
            .authorizeHttpRequests(a -> a
                .requestMatchers("/error").permitAll()
                // Documentação pública (decisão da spec do identity): só descreve a API.
                .requestMatchers(HttpMethod.GET, "/v3/api-docs", "/v3/api-docs/**",
                        "/swagger-ui.html", "/swagger-ui/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                // Dispositivos (ESP32) se autenticam pela chave X-Device-Key no próprio controller.
                .requestMatchers(HttpMethod.POST, "/api/leituras").permitAll()
                .requestMatchers("/api/auth/**").authenticated()
                .requestMatchers("/api/usuarios/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/maquinas", "/api/maquinas/**").hasAnyRole(PRODUCAO)
                .requestMatchers(HttpMethod.GET, "/api/energia/tarifas").hasAnyRole("ENGENHEIRO", "DIRETOR")
                .requestMatchers(HttpMethod.PUT, "/api/energia/tarifas").hasRole("ENGENHEIRO")
                .requestMatchers(HttpMethod.GET, "/api/indicadores/financeiro").hasRole("DIRETOR")
                .requestMatchers(HttpMethod.GET, "/api/indicadores/energia").hasAnyRole("ENGENHEIRO", "DIRETOR")
                .requestMatchers(HttpMethod.GET, "/api/indicadores/**").hasAnyRole(PRODUCAO)
                .requestMatchers(HttpMethod.GET, "/api/chamados", "/api/chamados/**").hasAnyRole(PRODUCAO)
                .requestMatchers(HttpMethod.POST, "/api/chamados").hasAnyRole("OPERARIO", "ENGENHEIRO")
                .requestMatchers(HttpMethod.POST, "/api/chamados/*/assumir", "/api/chamados/*/finalizar",
                        "/api/chamados/*/cancelar").hasRole("ENGENHEIRO")
                .requestMatchers("/api/maquinas", "/api/maquinas/**").hasRole("ENGENHEIRO")
                .anyRequest().denyAll());
        return http.build();
    }

    // O filtro do JWT roda só dentro da cadeia do Spring Security, não como filtro solto.
    @Bean
    public FilterRegistrationBean<JwtAuthFilter> jwtAuthFilterRegistration(JwtAuthFilter filtro) {
        FilterRegistrationBean<JwtAuthFilter> registro = new FilterRegistrationBean<>(filtro);
        registro.setEnabled(false);
        return registro;
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource(CorsProperties propriedades) {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(propriedades.origins());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }
}
