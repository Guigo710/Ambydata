package com.ambydata.ambydata_backend.usuario;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

// Regras de usuário: autenticação, troca de senha e a gestão feita pelo ADMIN.
// Alterações gravam só os campos que mudam ($set), nunca o documento inteiro: assim
// uma requisição que carregou o usuário antes não desfaz o que outra gravou depois
// (por exemplo, uma troca de senha não reativa quem o ADMIN acabou de desativar).
@Service
public class UsuarioService {

    // Limite do BCrypt: bytes além disso seriam ignorados ou recusados pela biblioteca.
    private static final int MAXIMO_BYTES_SENHA = 72;

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final MongoTemplate mongoTemplate;

    // Conferido quando o e-mail não existe, para o login levar o mesmo tempo nos dois casos.
    private final String hashFicticio;

    public UsuarioService(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder,
            MongoTemplate mongoTemplate) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.mongoTemplate = mongoTemplate;
        this.hashFicticio = passwordEncoder.encode(UUID.randomUUID().toString());
    }

    public Optional<Usuario> autenticar(String email, String senha) {
        if (email == null || email.isBlank() || senha == null || senha.isBlank()) {
            return Optional.empty();
        }
        Optional<Usuario> encontrado = usuarioRepository.findByEmail(normalizarEmail(email));
        String hash = encontrado.map(Usuario::getSenhaHash).orElse(hashFicticio);
        boolean senhaConfere = passwordEncoder.matches(senha, hash);
        return encontrado.filter(usuario -> senhaConfere
                && usuario.getSenhaHash() != null
                && Boolean.TRUE.equals(usuario.getAtivo()));
    }

    // Troca feita pelo próprio usuário: exige a senha atual.
    public void trocarPropriaSenha(Usuario usuario, String senhaAtual, String novaSenha) {
        if (usuario.getSenhaHash() == null || !passwordEncoder.matches(senhaAtual, usuario.getSenhaHash())) {
            throw new SenhaInvalidaException("Senha atual incorreta.");
        }
        definir(usuario.getId(), Update.update("senhaHash", hashDe(novaSenha)));
    }

    public List<Usuario> listar() {
        return usuarioRepository.findAll(Sort.by("nome"));
    }

    public Usuario criar(CriarUsuarioRequest dados) {
        String email = normalizarEmail(dados.email());
        if (usuarioRepository.findByEmail(email).isPresent()) {
            throw new EmailJaCadastradoException();
        }
        Usuario usuario = new Usuario(null, dados.nome().trim(), email, hashDe(dados.senha()), dados.perfil(), true);
        try {
            return usuarioRepository.insert(usuario);
        } catch (DuplicateKeyException e) {
            throw new EmailJaCadastradoException();
        }
    }

    public Usuario atualizar(String id, AtualizarUsuarioRequest dados) {
        Usuario usuario = buscar(id);
        String email = normalizarEmail(dados.email());
        usuarioRepository.findByEmail(email)
                .filter(outro -> !outro.getId().equals(id))
                .ifPresent(outro -> { throw new EmailJaCadastradoException(); });
        if (deixariaSemAdminAtivo(usuario, dados.perfil(), usuario.getAtivo())) {
            throw new RegraDeAdminException("O sistema precisa de pelo menos um ADMIN ativo.");
        }
        try {
            definir(id, new Update().set("nome", dados.nome().trim()).set("email", email).set("perfil", dados.perfil()));
        } catch (DuplicateKeyException e) {
            throw new EmailJaCadastradoException();
        }
        return buscar(id);
    }

    public Usuario alterarAtivo(String id, boolean ativo, Usuario solicitante) {
        Usuario usuario = buscar(id);
        if (!ativo && usuario.getId().equals(solicitante.getId())) {
            throw new RegraDeAdminException("Você não pode desativar o próprio usuário.");
        }
        if (deixariaSemAdminAtivo(usuario, usuario.getPerfil(), ativo)) {
            throw new RegraDeAdminException("O sistema precisa de pelo menos um ADMIN ativo.");
        }
        definir(id, Update.update("ativo", ativo));
        return buscar(id);
    }

    // Redefinição feita pelo ADMIN ("Esqueci minha senha" → "Procure seu gestor").
    public void redefinirSenha(String id, String novaSenha) {
        buscar(id);
        definir(id, Update.update("senhaHash", hashDe(novaSenha)));
    }

    private Usuario buscar(String id) {
        return usuarioRepository.findById(id).orElseThrow(UsuarioNaoEncontradoException::new);
    }

    private void definir(String id, Update campos) {
        mongoTemplate.updateFirst(Query.query(Criteria.where("_id").is(id)), campos, Usuario.class);
    }

    private String hashDe(String senha) {
        if (senha.getBytes(StandardCharsets.UTF_8).length > MAXIMO_BYTES_SENHA) {
            throw new SenhaInvalidaException("A senha pode ter no máximo 72 bytes.");
        }
        return passwordEncoder.encode(senha);
    }

    // Verdadeiro se o usuário é hoje um ADMIN ativo, deixaria de ser, e é o único.
    private boolean deixariaSemAdminAtivo(Usuario usuario, Perfil novoPerfil, Boolean novoAtivo) {
        boolean eAdminAtivo = usuario.getPerfil() == Perfil.ADMIN && Boolean.TRUE.equals(usuario.getAtivo());
        boolean continuaAdminAtivo = novoPerfil == Perfil.ADMIN && Boolean.TRUE.equals(novoAtivo);
        return eAdminAtivo && !continuaAdminAtivo
                && usuarioRepository.countByPerfilAndAtivo(Perfil.ADMIN, true) <= 1;
    }

    private static String normalizarEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
