package com.ambydata.ambydata_backend.usuario;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;
import java.util.Optional;

// Regras de usuário: autenticação, troca de senha e a gestão feita pelo ADMIN.
@Service
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    public UsuarioService(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public Optional<Usuario> autenticar(String email, String senha) {
        if (email == null || email.isBlank() || senha == null || senha.isBlank()) {
            return Optional.empty();
        }
        return usuarioRepository.findByEmail(normalizarEmail(email))
                .filter(usuario -> Boolean.TRUE.equals(usuario.getAtivo())
                        && usuario.getSenhaHash() != null
                        && passwordEncoder.matches(senha, usuario.getSenhaHash()));
    }

    // Troca feita pelo próprio usuário: exige a senha atual.
    public void trocarPropriaSenha(Usuario usuario, String senhaAtual, String novaSenha) {
        if (usuario.getSenhaHash() == null || !passwordEncoder.matches(senhaAtual, usuario.getSenhaHash())) {
            throw new IllegalArgumentException("Senha atual incorreta.");
        }
        usuario.setSenhaHash(passwordEncoder.encode(novaSenha));
        usuarioRepository.save(usuario);
    }

    public List<Usuario> listar() {
        return usuarioRepository.findAll(Sort.by("nome"));
    }

    public Usuario criar(CriarUsuarioRequest dados) {
        String email = normalizarEmail(dados.email());
        if (usuarioRepository.findByEmail(email).isPresent()) {
            throw new EmailJaCadastradoException();
        }
        Usuario usuario = new Usuario(null, dados.nome().trim(), email,
                passwordEncoder.encode(dados.senha()), dados.perfil(), true);
        return salvarComEmailUnico(usuario);
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
        usuario.setNome(dados.nome().trim());
        usuario.setEmail(email);
        usuario.setPerfil(dados.perfil());
        return salvarComEmailUnico(usuario);
    }

    public Usuario alterarAtivo(String id, boolean ativo, Usuario solicitante) {
        Usuario usuario = buscar(id);
        if (!ativo && usuario.getId().equals(solicitante.getId())) {
            throw new RegraDeAdminException("Você não pode desativar o próprio usuário.");
        }
        if (deixariaSemAdminAtivo(usuario, usuario.getPerfil(), ativo)) {
            throw new RegraDeAdminException("O sistema precisa de pelo menos um ADMIN ativo.");
        }
        usuario.setAtivo(ativo);
        return usuarioRepository.save(usuario);
    }

    // Redefinição feita pelo ADMIN ("Esqueci minha senha" → "Procure seu gestor").
    public void redefinirSenha(String id, String novaSenha) {
        Usuario usuario = buscar(id);
        usuario.setSenhaHash(passwordEncoder.encode(novaSenha));
        usuarioRepository.save(usuario);
    }

    private Usuario buscar(String id) {
        return usuarioRepository.findById(id).orElseThrow(UsuarioNaoEncontradoException::new);
    }

    // Verdadeiro se o usuário é hoje um ADMIN ativo, deixaria de ser, e é o único.
    private boolean deixariaSemAdminAtivo(Usuario usuario, Perfil novoPerfil, Boolean novoAtivo) {
        boolean eAdminAtivo = usuario.getPerfil() == Perfil.ADMIN && Boolean.TRUE.equals(usuario.getAtivo());
        boolean continuaAdminAtivo = novoPerfil == Perfil.ADMIN && Boolean.TRUE.equals(novoAtivo);
        return eAdminAtivo && !continuaAdminAtivo
                && usuarioRepository.countByPerfilAndAtivo(Perfil.ADMIN, true) <= 1;
    }

    // O índice único de e-mail é a garantia final contra cadastros simultâneos.
    private Usuario salvarComEmailUnico(Usuario usuario) {
        try {
            return usuarioRepository.save(usuario);
        } catch (DuplicateKeyException e) {
            throw new EmailJaCadastradoException();
        }
    }

    private static String normalizarEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
