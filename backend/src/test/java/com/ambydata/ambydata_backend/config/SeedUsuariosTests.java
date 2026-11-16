package com.ambydata.ambydata_backend.config;

import com.ambydata.ambydata_backend.TestcontainersConfig;
import com.ambydata.ambydata_backend.usuario.Perfil;
import com.ambydata.ambydata_backend.usuario.Usuario;
import com.ambydata.ambydata_backend.usuario.UsuarioRepository;
import com.ambydata.ambydata_backend.usuario.UsuarioService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Import(TestcontainersConfig.class)
class SeedUsuariosTests {

    @Autowired
    private UsuarioRepository repositorio;

    @Autowired
    private UsuarioService usuarioService;

    @BeforeEach
    void limpar() {
        repositorio.deleteAll();
    }

    @Test
    void semConfiguracaoNaoCriaNinguem() {
        seed(new SeedProperties(null, null, null, null)).run();

        assertThat(repositorio.count()).isZero();
    }

    @Test
    void criaOAdminConfigurado() {
        seed(new SeedProperties("Admin@ambydata.demo", "senha-do-admin", "Ana Admin", null)).run();

        Usuario admin = repositorio.findByEmail("admin@ambydata.demo").orElseThrow();
        assertThat(admin.getPerfil()).isEqualTo(Perfil.ADMIN);
        assertThat(admin.getNome()).isEqualTo("Ana Admin");
        assertThat(usuarioService.autenticar("admin@ambydata.demo", "senha-do-admin")).isPresent();
    }

    @Test
    void nomePadraoDoAdminEAdministrador() {
        seed(new SeedProperties("admin@ambydata.demo", "senha-do-admin", "", null)).run();

        assertThat(repositorio.findByEmail("admin@ambydata.demo").orElseThrow().getNome()).isEqualTo("Administrador");
    }

    @Test
    void semDemoSenhaNaoCriaUsuariosDeDemonstracao() {
        seed(new SeedProperties("admin@ambydata.demo", "senha-do-admin", null, "")).run();

        assertThat(repositorio.count()).isEqualTo(1);
    }

    @Test
    void comDemoSenhaCriaUmUsuarioPorPerfilDeProducao() {
        seed(new SeedProperties(null, null, null, "senha-de-demo")).run();

        assertThat(repositorio.findByEmail("operario@ambydata.demo").orElseThrow().getPerfil()).isEqualTo(Perfil.OPERARIO);
        assertThat(repositorio.findByEmail("engenheiro@ambydata.demo").orElseThrow().getPerfil()).isEqualTo(Perfil.ENGENHEIRO);
        assertThat(repositorio.findByEmail("diretor@ambydata.demo").orElseThrow().getPerfil()).isEqualTo(Perfil.DIRETOR);
        assertThat(usuarioService.autenticar("diretor@ambydata.demo", "senha-de-demo")).isPresent();
        assertThat(repositorio.count()).isEqualTo(3);
    }

    @Test
    void rodarDeNovoNaoDuplicaNemTrocaSenhas() {
        SeedProperties config = new SeedProperties("admin@ambydata.demo", "senha-do-admin", null, "senha-de-demo");
        seed(config).run();
        Usuario operario = repositorio.findByEmail("operario@ambydata.demo").orElseThrow();
        usuarioService.trocarPropriaSenha(operario, "senha-de-demo", "senha-trocada-pelo-usuario");

        seed(config).run();

        assertThat(repositorio.count()).isEqualTo(4);
        assertThat(usuarioService.autenticar("operario@ambydata.demo", "senha-trocada-pelo-usuario")).isPresent();
        assertThat(usuarioService.autenticar("operario@ambydata.demo", "senha-de-demo")).isEmpty();
    }

    private SeedUsuarios seed(SeedProperties propriedades) {
        return new SeedUsuarios(propriedades, repositorio, usuarioService);
    }
}
