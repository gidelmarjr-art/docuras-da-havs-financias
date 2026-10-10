import { useMemo, useState } from 'react';
import { Pencil, Trash2, X } from 'lucide-react';
import PageHeader from '../../components/PageHeader/PageHeader';
import StatCard from '../../components/StatCard/StatCard';
import EmptyState from '../../components/EmptyState/EmptyState';
import { useToast } from '../../components/Toast/Toast';
import { useMes } from '../../contexts/MesContext';
import { usePerfil } from '../../contexts/PerfilContext';
import { useEntradas } from '../../hooks/useEntradas';
import * as entradasService from '../../services/entradasService';
import { FORMAS_RECEBIMENTO, dataCurta, dataPadrao, moeda, parseValor, rotuloRecebimento } from '../../lib/format';
import './Recebimentos.css';

const liquido = (e) => Number(e.valor) - Number(e.taxa || 0);
const somar = (lista, fn) => lista.reduce((total, e) => total + fn(e), 0);

export default function Recebimentos() {
  const { mes } = useMes();
  const { avisar } = useToast();
  const { perfil } = usePerfil();
  const { entradas, carregando, erro, recarregar } = useEntradas(mes);

  const [editandoId, setEditandoId] = useState(null);
  const [descricao, setDescricao] = useState('');
  const [cliente, setCliente] = useState('');
  const [valor, setValor] = useState('');
  const [taxa, setTaxa] = useState('');
  const [forma, setForma] = useState('pix');
  const [data, setData] = useState(() => dataPadrao(mes));
  const [erroForm, setErroForm] = useState('');
  const [salvando, setSalvando] = useState(false);

  const formaAtual = FORMAS_RECEBIMENTO.find((f) => f.id === forma);

  const totais = useMemo(() => ({
    bruto: somar(entradas, (e) => Number(e.valor)),
    taxas: somar(entradas, (e) => Number(e.taxa || 0)),
    liquido: somar(entradas, liquido),
    porForma: FORMAS_RECEBIMENTO.map((f) => {
      const lista = entradas.filter((e) => e.forma_recebimento === f.id);
      return { ...f, qtd: lista.length, total: somar(lista, liquido) };
    }),
  }), [entradas]);

  function limpar() {
    setEditandoId(null);
    setDescricao(''); setCliente(''); setValor(''); setTaxa('');
    setForma('pix'); setData(dataPadrao(mes)); setErroForm('');
  }

  function editar(e) {
    setEditandoId(e.id);
    setDescricao(e.descricao); setCliente(e.cliente || '');
    setValor(String(e.valor).replace('.', ',')); setTaxa(Number(e.taxa) ? String(e.taxa).replace('.', ',') : '');
    setForma(e.forma_recebimento); setData(e.data_entrada); setErroForm('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function salvar(ev) {
    ev.preventDefault();
    const valorNumerico = parseValor(valor);
    const taxaNumerica = formaAtual.comTaxa && taxa.trim() ? parseValor(taxa) : 0;
    if (!descricao.trim()) return setErroForm('Informe o que foi vendido.');
    if (!(valorNumerico > 0)) return setErroForm('Informe um valor maior que zero.');
    if (!(taxaNumerica >= 0) || taxaNumerica >= valorNumerico) return setErroForm('A taxa deve ser menor que o valor recebido.');
    if (!data) return setErroForm('Informe a data do recebimento.');

    const campos = {
      descricao: descricao.trim(),
      cliente: cliente.trim() || null,
      valor: valorNumerico,
      taxa: taxaNumerica,
      forma_recebimento: forma,
      data_entrada: data,
    };
    setSalvando(true); setErroForm('');
    try {
      if (editandoId) {
        await entradasService.atualizar(editandoId, campos);
        avisar('Recebimento atualizado');
      } else {
        await entradasService.criar({ ...campos, registrado_por: perfil?.nome ?? null });
        avisar('Recebimento registrado');
      }
      limpar();
      recarregar();
    } catch (err) {
      setErroForm(err.message);
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(e) {
    if (!window.confirm(`Excluir o recebimento "${e.descricao}"?`)) return;
    try {
      await entradasService.excluir(e.id);
      avisar('Recebimento excluído');
      if (editandoId === e.id) limpar();
      recarregar();
    } catch (err) {
      avisar(err.message, 'erro');
    }
  }

  return (
    <div className="recebimentos">
      <PageHeader titulo="Recebimentos" descricao="Tudo o que entrou, com a forma de pagamento de cada venda." />

      {erro && <p className="aviso-erro">Não foi possível carregar os recebimentos: {erro}</p>}

      <section className="recebimentos__cards" aria-busy={carregando}>
        <StatCard
          rotulo="Recebido no mês"
          valor={moeda(totais.liquido)}
          detalhe={totais.taxas > 0 ? `${moeda(totais.bruto)} bruto · ${moeda(totais.taxas)} em taxas` : `${entradas.length} ${entradas.length === 1 ? 'lançamento' : 'lançamentos'}`}
          tom="positivo"
        />
        {totais.porForma.map((f) => (
          <StatCard key={f.id} rotulo={f.rotulo} valor={moeda(f.total)} detalhe={`${f.qtd} ${f.qtd === 1 ? 'lançamento' : 'lançamentos'}`} />
        ))}
      </section>

      <div className="recebimentos__grid">
        <section className="painel recebimentos__formulario">
          <header className="recebimentos__topo">
            <h2>{editandoId ? 'Editar recebimento' : 'Registrar recebimento'}</h2>
            {editandoId && (
              <button type="button" className="btn btn--secundario btn--pequeno" onClick={limpar}>
                <X size={15} aria-hidden="true" /> Cancelar
              </button>
            )}
          </header>
          <form onSubmit={salvar} className="recebimentos__form" noValidate>
            <label className="campo">
              <span>O que foi vendido</span>
              <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Bolo de aniversário, caixa de brigadeiros" maxLength={80} />
            </label>
            <label className="campo">
              <span>Cliente (opcional)</span>
              <input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nome do cliente" maxLength={80} />
            </label>

            <fieldset className="recebimentos__formas">
              <legend>Forma de pagamento</legend>
              <div className="recebimentos__formas-opcoes" role="radiogroup">
                {FORMAS_RECEBIMENTO.map((f) => (
                  <button
                    type="button"
                    key={f.id}
                    role="radio"
                    aria-checked={forma === f.id}
                    className={`recebimentos__forma ${forma === f.id ? 'recebimentos__forma--ativa' : ''}`}
                    onClick={() => setForma(f.id)}
                  >
                    {f.rotulo}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="recebimentos__linha">
              <label className="campo">
                <span>Valor recebido (R$)</span>
                <input value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" inputMode="decimal" />
              </label>
              <label className="campo">
                <span>Data</span>
                <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
              </label>
            </div>

            {formaAtual.comTaxa && (
              <label className="campo">
                <span>Taxa da maquininha em R$ (opcional)</span>
                <input value={taxa} onChange={(e) => setTaxa(e.target.value)} placeholder="0,00" inputMode="decimal" />
              </label>
            )}

            {erroForm && <p className="aviso-erro">{erroForm}</p>}
            <button type="submit" className="btn btn--primario" disabled={salvando}>
              {salvando ? 'Salvando…' : editandoId ? 'Salvar alterações' : 'Registrar recebimento'}
            </button>
          </form>
        </section>

        <section className="painel recebimentos__lista" aria-busy={carregando}>
          <header className="recebimentos__topo">
            <div>
              <h2>Lançamentos do mês</h2>
              <p>{entradas.length} {entradas.length === 1 ? 'recebimento' : 'recebimentos'}</p>
            </div>
          </header>
          {!carregando && !erro && entradas.length === 0 ? (
            <EmptyState titulo="Nenhum recebimento neste mês" descricao="Registre uma venda para começar." />
          ) : (
            <ul>
              {entradas.map((e) => (
                <li key={e.id} className="recebimentos__item">
                  <div className="recebimentos__item-info">
                    <strong>{e.descricao}</strong>
                    <small>
                      {dataCurta(e.data_entrada)} · {rotuloRecebimento(e.forma_recebimento)}
                      {e.cliente ? ` · ${e.cliente}` : ''}
                      {e.registrado_por ? ` · por ${e.registrado_por}` : ''}
                    </small>
                  </div>
                  <span className="numero recebimentos__valor">
                    {moeda(liquido(e))}
                    {Number(e.taxa) > 0 && <small>{moeda(e.valor)} − {moeda(e.taxa)}</small>}
                  </span>
                  <button type="button" className="btn btn--secundario btn--icone" onClick={() => editar(e)} aria-label={`Editar ${e.descricao}`}><Pencil size={15} /></button>
                  <button type="button" className="btn btn--perigo btn--icone" onClick={() => excluir(e)} aria-label={`Excluir ${e.descricao}`}><Trash2 size={15} /></button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
