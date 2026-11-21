import type { Comprovante, ConfigBilheteria, EventoInfo, Pedido } from "./tipos.ts";
import type { Evento } from "./dominio.ts";
import { DadosInvalidosErro, NaoEncontradoErro, PagamentoErro } from "./dominio.ts";
import type { Pagamento } from "./pagamento.ts";
import { calcularTotal, montarIngressos } from "./preco.ts";
import { direitoAMeia } from "./regras.ts";

function comTempoLimite<T>(promessa: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<never>((_, rejeitar) => {
    timer = setTimeout(() => rejeitar(new Error("Tempo limite excedido.")), ms);
  });
  return Promise.race([promessa, limite]).finally(() => clearTimeout(timer));
}

export class Bilheteria {
  readonly #eventos: Evento[];
  readonly #pagar: Pagamento;
  readonly #limitePagamentoMs: number;
  #ultimoReservaId = 0;

  constructor(config: ConfigBilheteria) {
    this.#eventos = config.eventos;
    this.#pagar = config.pagar;
    this.#limitePagamentoMs = config.limitePagamentoMs;
  }

  listarEventos(): EventoInfo[] {
    return this.#eventos.map((evento) => evento.info());
  }

  async reservar(pedido: Pedido): Promise<Comprovante> {
    if (!pedido || !Array.isArray(pedido.ingressos) || pedido.ingressos.length === 0) {
      throw new DadosInvalidosErro("O pedido precisa ter pelo menos um ingresso.");
    }

    const evento = this.#eventos.find((e) => e.id === pedido.eventoId);
    if (!evento) {
      throw new NaoEncontradoErro(`Evento ${pedido.eventoId} não encontrado.`);
    }

    const poltronas = pedido.ingressos.map((pessoa) => pessoa.poltrona);
    evento.reservar(poltronas);

    const ingressos = montarIngressos(evento.preco, pedido.ingressos, direitoAMeia);
    const total = calcularTotal(ingressos);

    try {
      await comTempoLimite(this.#pagar(total), this.#limitePagamentoMs);
    } catch {
      evento.liberar(poltronas);
      throw new PagamentoErro("A operadora não aprovou o pagamento.");
    }

    this.#ultimoReservaId += 1;

    return {
      reservaId: this.#ultimoReservaId,
      eventoId: evento.id,
      ingressos,
      total,
    };
  }
}

export function criarBilheteria(config: ConfigBilheteria): Bilheteria {
  return new Bilheteria(config);
}
