import { criarBilheteria } from "./bilheteria.ts";
import { Evento } from "./dominio.ts";
import { criarPagamentoFalso } from "./pagamento.ts";
import { criarServidor } from "./servidor.ts";

const eventos = [
  new Evento(1, "Festival de Verão", 120, 100),
  new Evento(2, "Noite de Jazz", 180, 60),
  new Evento(3, "Teatro Municipal", 90, 40),
];

const pagar = criarPagamentoFalso({ latenciaMs: 80, taxaDeFalha: 0.1 });

const bilheteria = criarBilheteria({
  eventos,
  pagar,
  limitePagamentoMs: 500,
});

const servidor = criarServidor(bilheteria);

servidor.listen(3000, () => {
  console.log("Bilheteria no ar em http://localhost:3000");
});
