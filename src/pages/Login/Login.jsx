import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabaseConfigurado } from '../../lib/supabaseClient';
import './Login.css';

export default function Login() {
  const { sessao, carregando, entrar } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  // A tela de entrada é sempre clara, com o degradê da marca.
  useEffect(() => { document.documentElement.dataset.theme = 'light'; }, []);

  if (!carregando && sessao) return <Navigate to="/geral" replace />;

  async function aoEnviar(e) {
    e.preventDefault();
    setEnviando(true);
    setErro('');
    try {
      await entrar(email.trim(), senha);
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="login">
      <section className="login__marca">
        <span className="login__logo" aria-hidden="true">
          H
        </span>
        <h1>Doçuras da Hav's</h1>
        <p>
          Recebimentos, contas e o que vence nos próximos dias da confeitaria — tudo num só lugar.
        </p>
      </section>

      <section className="login__painel">
        <form className="login__form" onSubmit={aoEnviar}>
          <h2>Entrar</h2>
          <p className="login__sub">Use o e-mail e a senha cadastrados no sistema.</p>

          {!supabaseConfigurado && (
            <p className="aviso-erro">
              Supabase não configurado. Crie o arquivo <code>.env</code> a partir de{' '}
              <code>.env.example</code> e reinicie o servidor.
            </p>
          )}

          <label className="campo">
            <span>E-mail</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="campo">
            <span>Senha</span>
            <input
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </label>

          {erro && <p className="aviso-erro">{erro}</p>}

          <button type="submit" className="btn btn--primario" disabled={enviando || !supabaseConfigurado}>
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </section>
    </div>
  );
}
