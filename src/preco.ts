import type { TipoIngresso } from "./tipos.ts";

export function valorDoIngresso(precoBase: number): (tipo: TipoIngresso) => number {
  return (tipo) => tipo === "meia" ? Math.round((precoBase / 2) * 100) / 100 : precoBase;
}

export function aplicarTaxa(percentual: number): (valor: number) => number {
  return (valor) => Math.round(valor * (1 + percentual) * 100) / 100;
}
