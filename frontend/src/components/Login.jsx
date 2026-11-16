import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import logoAmbydata from '../assets/ambydata-logo.png';

export default function Login() {
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [erro, setErro] = useState("");
    const [carregando, setCarregando] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setErro("");
        setCarregando(true);

        try {
            // Pega a URL do Spring Boot
            const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:22441";

            // Envia o e-mail e senha digitados para a rota de autenticação do Java
            const resposta = await axios.post(`${apiUrl}/api/usuarios/login`, {
                email: email,
                senha: senha
            });
            if (resposta.data) {
                localStorage.setItem("usuarioLogado", JSON.stringify(resposta.data));

                // Redireciona o usuário para o painel principal
                navigate("/painel");
            }
        } catch (error) {
            console.error("Erro ao realizar login:", error);
            // Trata o erro caso o e-mail/senha estejam errados ou o servidor esteja desligado
            if (error.response && error.response.status === 401) {
                setErro("Usuário ou senha incorretos.");
            } else {
                setErro("Não foi possível conectar ao servidor. Tente mais tarde.");
            }
        } finally {
            setCarregando(false);
        }
    };

    return (
        <div className="login-container">
            {/* Caixa do Login */}
            <div
                className="login-box"
                style={{
                    maxWidth: "360px",
                    width: "100%",
                    margin: "0 auto",
                    padding: "32px 28px"     
                }}
            >

                {/* Bloco Superior*/}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "32px" }}>
                    <img
                        src={logoAmbydata}
                        alt="Logo Ambydata Technology"
                        style={{
                            width: "140px",
                            height: "auto",
                            objectFit: "contain",
                            filter: "drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.05))"
                        }}
                    />
                </div>

                {/* Formulário de Credenciais */}
                <form onSubmit={handleLogin} className="login-form">
                    <h3>Acesso ao Sistema</h3>
                    <p className="login-subtitle">Monitore seus dados em tempo real</p>

                    {/* Feedback de erro caso erre a senha */}
                    {erro && <div className="error-message">{erro}</div>}

                    <div className="input-group">
                        <label htmlFor="email">Usuário (E-mail)</label>
                        <input
                            type="email"
                            id="email"
                            placeholder="Digite seu e-mail"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="senha">Senha</label>
                        <input
                            type="password"
                            id="senha"
                            placeholder="Digite sua senha"
                            value={senha}
                            onChange={(e) => setSenha(e.target.value)}
                            required
                        />
                    </div>
                    <div className="login-actions">
                        <button
                            type="button"
                            className="forgot-link"
                            onClick={() => alert("Função de recuperação de senha será integrada ao back-end em Java!")}
                        >
                            Esqueci minha senha
                        </button>
                    </div>

                    <button type="submit" className="login-btn">
                        Entrar
                    </button>
                </form>
            </div>
        </div>
    );
}
