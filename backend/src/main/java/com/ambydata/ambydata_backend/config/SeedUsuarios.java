package com.ambydata.ambydata_backend.config;

import com.ambydata.ambydata_backend.usuario.CriarUsuarioRequest;
import com.ambydata.ambydata_backend.usuario.Perfil;
import com.ambydata.ambydata_backend.usuario.UsuarioRepository;
import com.ambydata.ambydata_backend.usuario.UsuarioService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Locale;

// Cria na subida, depois das migrações, o primeiro ADMIN e, se DEMO_SENHA estiver
// definida, um usuário de demonstração por perfil de produção. Quem já existe
// (pelo e-mail) não é alterado: senhas trocadas depois continuam valendo.
@Component
public class SeedUsuarios implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(SeedUsuarios.class);

    private record Demo(String nome, String email, Perfil perfil) {
    }

    private static final List<Demo> DEMOS = List.of(
            new Demo("Operário Demo", "operario@ambydata.demo", Perfil.OPERARIO),
            new Demo("Engenheiro Demo", "engenheiro@ambydata.demo", Perfil.ENGENHEIRO),
            new Demo("Diretor Demo", "diretor@ambydata.demo", Perfil.DIRETOR));

    private final SeedProperties propriedades;
    private final UsuarioRepository repositorio;
    private final UsuarioService usuarioService;

    public SeedUsuarios(SeedProperties propriedades, UsuarioRepository repositorio, UsuarioService usuarioService) {
        this.propriedades = propriedades;
        this.repositorio = repositorio;
        this.usuarioService = usuarioService;
    }

    @Override
    public void run(String... args) {
        if (preenchido(propriedades.adminEmail()) && preenchido(propriedades.adminSenha())) {
            String nome = preenchido(propriedades.adminNome()) ? propriedades.adminNome() : "Administrador";
            criarSeNaoExiste(nome, propriedades.adminEmail(), propriedades.adminSenha(), Perfil.ADMIN);
        }
        if (preenchido(propriedades.demoSenha())) {
            DEMOS.forEach(demo -> criarSeNaoExiste(demo.nome(), demo.email(), propriedades.demoSenha(), demo.perfil()));
        }
    }

    private void criarSeNaoExiste(String nome, String email, String senha, Perfil perfil) {
        if (repositorio.findByEmail(email.trim().toLowerCase(Locale.ROOT)).isPresent()) {
            return;
        }
        usuarioService.criar(new CriarUsuarioRequest(nome, email, senha, perfil));
        log.info("Usuário inicial criado com perfil {}", perfil);
    }

    private static boolean preenchido(String valor) {
        return valor != null && !valor.isBlank();
    }
}
