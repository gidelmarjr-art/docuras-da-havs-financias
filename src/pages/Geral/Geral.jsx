import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CircleCheck, Clock3, CreditCard, Landmark, TrendingUp } from 'lucide-react';
import PageHeader from '../../components/PageHeader/PageHeader';
import StatCard from '../../components/StatCard/StatCard';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import EmptyState from '../../components/EmptyState/EmptyState';
import { useMes } from '../../contexts/MesContext';
import { useGastos, useProximosPagamentos } from '../../hooks/useGastos';
import { useEntradas } from '../../hooks/useEntradas';
import { useHistoricoFinanceiro } from '../../hooks/useHistoricoFinanceiro';
import { useCartao } from '../../contexts/CartaoContext';
import {
  FORMAS_RECEBIMENTO,
  dataCurta,
  dataDiaMes,
  moeda,
  periodoDaFatura,
  rotuloTipo,
  statusDoGasto,
  textoPrazo,
} from '../../lib/format';
import './Geral.css';

const soma = (lista) => lista.reduce((total, item) => total + Number(item.valor), 0);

const FORMAS = [
  { id: 'debito', titulo: 'Gastos no débito' },
  { id: 'credito', titulo: 'Gastos no crédito' },
  { id: 'manual', titulo: 'Pagos manualmente' },
];

export default function Geral() {
  const { mes } = useMes();
  const { cartao } = useCartao();
  const { gastos, carregando: carregandoGastos, erro: erroGastos } = useGastos(mes);
  const { entradas, carregando: carregandoEntradas, erro: erroEntradas } = useEntradas(mes);
  const { proximos, erro: erroProximos } = useProximosPagamentos();
  const { meses: historico, carregando: carregandoHistorico, erro: erroHistorico } = useHistoricoFinanceiro(mes);

  const { formas, resumo } = useMemo(() => {
    const abertos = gastos.filter((g) => !g.pago);
    const pagos = gastos.filter((g) => g.pago);
    const entrou = entradas.reduce((total, e) => total + Number(e.valor) - Number(e.taxa || 0), 0);

    const totais = (lista) => {
      const pago = soma(lista.filter((g) => g.pago));
      const total = soma(lista);
      return { lista, total, pago, aPagar: total - pago };
    };

    return {
      formas: FORMAS.map((forma) => ({
        ...forma,
        ...totais(gastos.filter((g) => g.forma_pagamento === forma.id)),
      })),
      resumo: {
        entrou,
        total: soma(gastos),
        pago: soma(pagos),
        divida: soma(abertos),
        qtdAbertos: abertos.length,
        qtdAtrasados: abertos.filter((g) => statusDoGasto(g) === 'atrasado').length,
        saldo: entrou - soma(gastos),
        percentual: gastos.length ? Math.round((pagos.length / gastos.length) * 100) : 0,
        qtdPagos: pagos.length,
      },
    };
  }, [gastos, entradas]);

  const recebidoPorForma = useMemo(() => FORMAS_RECEBIMENTO.map((f) => {
    const lista = entradas.filter((e) => e.forma_recebimento === f.id);
    return { ...f, qtd: lista.length, total: lista.reduce((t, e) => t + Number(e.valor) - Number(e.taxa || 0), 0) };
  }), [entradas]);

  const erro = erroGastos || erroEntradas || erroProximos || erroHistorico;
  const carregando = carregandoGastos || carregandoEntradas;

  const [debito, credito] = formas;
  const periodo = periodoDaFatura(mes, cartao);
  const maiorValorDoGrafico = Math.max(1, ...historico.flatMap((item) => [item.entradas, item.gastos]));

  return (
    <div className="geral">
      <PageHeader titulo="Geral" descricao="Tudo do mês da confeitaria, em detalhe." />

      {erro && <p className="aviso-erro geral__erro">Não foi possível carregar os dados: {erro}</p>}

      <section className="geral__cards" aria-busy={carregando}>
        <StatCard
          rotulo="Entrou no mês"
          valor={moeda(resumo.entrou)}
          detalhe={`${entradas.length} ${entradas.length === 1 ? 'entrada' : 'entradas'}`}
          tom="positivo"
          icone={TrendingUp}
        />
        <StatCard
          rotulo="Já pago"
          valor={moeda(resumo.pago)}
          detalhe={`${resumo.qtdPagos} de ${gastos.length} contas`}
          icone={CircleCheck}
        />
        <StatCard
          rotulo="Em dívida"
          valor={moeda(resumo.divida)}
          detalhe={
            resumo.qtdAbertos === 0
              ? 'Nenhuma conta em aberto'
              : resumo.qtdAtrasados > 0
                ? `${resumo.qtdAbertos} em aberto, ${resumo.qtdAtrasados} atrasada${resumo.qtdAtrasados > 1 ? 's' : ''}`
                : `${resumo.qtdAbertos} em aberto, nenhuma atrasada`
          }
          tom={resumo.qtdAtrasados > 0 ? 'perigo' : 'alerta'}
          icone={Clock3}
        />
        <StatCard
          rotulo="Gastos no débito"
          valor={moeda(debito.total)}
          detalhe={
            debito.lista.length === 0
              ? 'Nenhuma compra no débito'
              : `${debito.lista.length} ${debito.lista.length === 1 ? 'compra' : 'compras'} · já pagas`
          }
          icone={Landmark}
        />
        <StatCard
          rotulo="Gastos no crédito"
          valor={moeda(credito.total)}
          detalhe={
            credito.lista.length === 0
              ? 'Nenhuma compra no cartão'
              : `${credito.aPagar > 0 ? `${moeda(credito.aPagar)} em aberto` : 'Fatura paga'} · ${dataDiaMes(periodo.inicio)} a ${dataDiaMes(periodo.fim)}`
          }
          tom={credito.aPagar > 0 ? 'alerta' : 'neutro'}
          icone={CreditCard}
        />
      </section>

      <section className="painel geral__grafico" aria-busy={carregandoHistorico}>
        <header className="geral__grafico-topo">
          <div>
            <h2>Entradas e gastos por mês</h2>
            <p>Todos os meses registrados aparecem aqui; role para ver períodos antigos.</p>
          </div>
          <div className="geral__legenda" aria-label="Legenda do gráfico">
            <span><i className="geral__legenda-entrada" />Entradas</span>
            <span><i className="geral__legenda-gasto" />Gastos</span>
          </div>
        </header>
        <div className="geral__barras-rolagem">
          <div className="geral__barras" style={{ '--quantidade': Math.max(6, historico.length) }} role="img" aria-label="Gráfico de entradas e gastos por mês">
            {historico.map((item) => (
              <div className="geral__grupo-barra" key={item.referencia}>
                <div className="geral__colunas-grafico">
                  <span className="geral__barra-grafico geral__barra-grafico--entrada" title={`${item.rotulo}: ${moeda(item.entradas)} em entradas`} style={{ height: `${(item.entradas / maiorValorDoGrafico) * 100}%` }} />
                  <span className="geral__barra-grafico geral__barra-grafico--gasto" title={`${item.rotulo}: ${moeda(item.gastos)} em gastos`} style={{ height: `${(item.gastos / maiorValorDoGrafico) * 100}%` }} />
                </div>
                <span className="geral__rotulo-mes">{item.rotulo}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="geral__colunas">
        <section className="painel geral__lista">
          <header className="geral__lista-topo">
            <h2>Próximos pagamentos</h2>
            <Link to="/pagamentos" className="geral__link">Confirmar pagamento</Link>
          </header>
          {proximos.length === 0 ? (
            <EmptyState titulo="Nada a pagar" descricao="Todas as contas cadastradas estão pagas." />
          ) : (
            <ul>
              {proximos.map((g) => (
                <li key={g.id} className="geral__item">
                  <div className="geral__item-info">
                    <strong>{g.nome}</strong>
                    <small>{rotuloTipo(g)} · {dataCurta(g.data_pagamento)} · {textoPrazo(g.data_pagamento)}</small>
                  </div>
                  <StatusBadge status={statusDoGasto(g)} />
                  <span className="numero geral__item-valor">{moeda(g.valor)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="painel geral__lista">
          <header className="geral__lista-topo">
            <div>
              <h2>Recebimentos do mês</h2>
              <p className="geral__sub">{entradas.length === 1 ? '1 lançamento' : `${entradas.length} lançamentos`} por forma de pagamento</p>
            </div>
            <Link to="/recebimentos" className="geral__link">Registrar recebimento</Link>
          </header>
          {entradas.length === 0 ? (
            <EmptyState titulo="Nenhum recebimento neste mês" descricao="Registre as vendas na aba Recebimentos." />
          ) : (
            <ul>
              {recebidoPorForma.map((f) => (
                <li key={f.id} className="geral__item">
                  <div className="geral__item-info">
                    <strong>{f.rotulo}</strong>
                    <small>{f.qtd} {f.qtd === 1 ? 'lançamento' : 'lançamentos'}</small>
                  </div>
                  <span className="numero geral__item-valor geral__item-valor--entrada">{moeda(f.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
