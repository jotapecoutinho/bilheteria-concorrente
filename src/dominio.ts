import type { EventoInfo } from "./tipos.ts";

export abstract class ErroDeNegocio extends Error {
  constructor(
    mensagem: string,
    public readonly status: number,
  ) {
    super(mensagem);
    this.name = new.target.name;
  }
}

export class DadosInvalidosErro extends ErroDeNegocio {
  constructor(mensagem: string) {
    super(mensagem, 400);
  }
}

export class NaoEncontradoErro extends ErroDeNegocio {
  constructor(mensagem: string) {
    super(mensagem, 404);
  }
}

export class PoltronaOcupadaErro extends ErroDeNegocio {
  constructor(mensagem: string) {
    super(mensagem, 409);
  }
}

export class PagamentoErro extends ErroDeNegocio {
  constructor(mensagem: string) {
    super(mensagem, 502);
  }
}

export class Evento {
  readonly #poltronasVendidas = new Set<number>();

  constructor(
    public readonly id: number,
    public readonly nome: string,
    public readonly preco: number,
    public readonly capacidade: number,
  ) {}

  get disponivel(): number {
    return this.capacidade - this.#poltronasVendidas.size;
  }

  reservar(poltronas: readonly number[]): void {
    const pedido = this.#validarPoltronas(poltronas);
    for (const poltrona of pedido) {
      if (this.#poltronasVendidas.has(poltrona)) {
        throw new PoltronaOcupadaErro(`A poltrona ${poltrona} está ocupada.`);
      }
    }
    for (const poltrona of pedido) {
      this.#poltronasVendidas.add(poltrona);
    }
  }

  liberar(poltronas: readonly number[]): void {
    const pedido = this.#validarPoltronas(poltronas);
    for (const poltrona of pedido) {
      if (!this.#poltronasVendidas.has(poltrona)) {
        throw new DadosInvalidosErro(`A poltrona ${poltrona} não está reservada.`);
      }
    }
    for (const poltrona of pedido) {
      this.#poltronasVendidas.delete(poltrona);
    }
  }

  info(): EventoInfo {
    return {
      id: this.id,
      nome: this.nome,
      preco: this.preco,
      capacidade: this.capacidade,
      disponivel: this.disponivel,
    };
  }

  #validarPoltronas(poltronas: readonly number[]): Set<number> {
    if (!Array.isArray(poltronas) || poltronas.length === 0) {
      throw new DadosInvalidosErro("Informe pelo menos uma poltrona.");
    }

    const pedido = new Set<number>();
    for (const poltrona of poltronas) {
      if (!Number.isInteger(poltrona) || poltrona < 1 || poltrona > this.capacidade) {
        throw new DadosInvalidosErro("Número de poltrona inválido.");
      }
      if (pedido.has(poltrona)) {
        throw new DadosInvalidosErro(`A poltrona ${poltrona} aparece mais de uma vez.`);
      }
      pedido.add(poltrona);
    }
    return pedido;
  }
}
