# Bilheteria concorrente

Projeto final de Paradigmas de Linguagens de Programação. Enunciado completo no Blackboard.

Os arquivos de `src/` que vocês escrevem já existem, vazios; o `tipos.ts` e o `servidor.ts` vêm prontos. O que vai em cada um está no passo
indicado do enunciado:

| Arquivo | Passo do enunciado |
| :--- | :--- |
| `src/tipos.ts` (pronto) | 1: os tipos |
| `src/regras.ts` | 2: meia-entrada |
| `src/preco.ts` | 3: preço (funcional) |
| `src/dominio.ts` | 4: evento e erros (orientado a objetos) |
| `src/bilheteria.ts` | 5: a venda, onde a concorrência aparece |
| `src/servidor.ts` (pronto) e `src/main.ts` | 6: ligar o servidor |

Não alterem `src/pagamento.ts`, `src/servidor.ts`, `src/bench.ts` nem `testes/`: a correção usa os originais.

Para começar, sigam o `GUIA.md`. Depois dele, os comandos são:

```bash
npm install
npm test          # correção automática: mostra os pontos
npm start         # serviço em http://localhost:3000
npm run bench     # com o serviço no ar: 200 pedidos simultâneos no evento 1, dois por poltrona
```

Exemplo de pedido:

```bash
curl -X POST localhost:3000/reservas -H 'Content-Type: application/json' \
  -d '{"eventoId":1,"ingressos":[{"nome":"Ana","idade":20,"estudante":true,"pcd":false,"poltrona":7}]}'
```

---

## Preencham (avaliado no vídeo)

**Link do vídeo:** 

### Integrantes

| Nome completo | RGM | Usuário do GitHub | Parte principal |
| :--- | :--- | :--- | :--- |
| João Pedro Coutinho Nóbrega | 33482799 | jotapecoutinho | `bilheteria.ts` — venda e concorrência |
| Ramon Sávio Fontes Rocha | 33676402 | RamonSFR | `regras.ts` e `preco.ts` — meia-entrada e preço funcional |
| João Pedro Urbano Silveira Bastos | 33029491 | JPU2004 | `dominio.ts` — erros e evento |
| Adijair Pinto Viana Gonçalves de Araújo | 33296162 | Adijair | `main.ts`, servidor e bench |

### Decisões

1. **Concorrência.** Como vocês garantem que duas pessoas não ficam com a mesma poltrona? Onde estava o
   `await` perigoso?

   No Node.js, o JavaScript executa em uma única thread (Event Loop) e só cede a vez para outro pedido
   quando encontra um `await`. Por isso, em `bilheteria.ts`, validamos o pedido e chamamos
   `evento.reservar(poltronas)` de forma totalmente síncrona **antes** do `await comTempoLimite(this.#pagar(total), ...)`:
   como não há nenhum `await` entre verificar se as poltronas estão livres e marcá-las no `Set` privado
   do evento, dois pedidos que disputam o mesmo assento nunca se intercalam nessa etapa — o segundo já
   encontra a poltrona ocupada e falha imediatamente com `PoltronaOcupadaErro` (`409`), sem acionar a
   operadora. O `await` perigoso seria exatamente o da cobrança na operadora (`this.#pagar(total)`): se
   verificássemos a disponibilidade antes do `await` e só marcássemos as poltronas depois dele, vários
   pedidos simultâneos veriam a poltrona livre durante a espera da rede, cobrariam todos os clientes e
   venderiam o mesmo lugar mais de uma vez. Com a reserva antes do `await` e o `try/catch` chamando
   `evento.liberar(poltronas)` caso o pagamento falhe ou estoure o tempo limite (`Promise.race`), os
   pagamentos rodam concorrentemente sem fila nem trava global e sem risco de venda dupla.

2. **OO.** O que o `Evento` esconde e por quê? Por que o `reservar` é tudo ou nada? Por que os erros são uma hierarquia de classes?

   O `Evento` esconde o conjunto de poltronas vendidas no campo privado real do JavaScript
   (`#poltronasVendidas = new Set<number>()`) e expõe apenas o getter `get disponivel()` (sem setter):
   assim, nenhum código externo consegue adulterar o contador (`evento.disponivel = 999` falha com
   `TypeError`) nem inserir poltronas inválidas, duplicadas ou fora de `1..capacidade` sem passar pelas
   regras de `reservar` e `liberar`. O método `reservar` é **tudo ou nada** porque um pedido de família
   ou grupo compra várias poltronas juntas: validamos o formato, o intervalo, a ausência de duplicatas
   e a disponibilidade de **todas** as poltronas antes de gravar qualquer uma no `Set`; se marcássemos
   durante o laço de verificação e a última poltrona estivesse ocupada, as primeiras ficariam presas
   sem dono (ninguém comprou e ninguém mais conseguiria comprar). Já os erros formam uma hierarquia com
   `ErroDeNegocio extends Error` (guardando `public readonly status: number`) e quatro subclasses
   (`DadosInvalidosErro` `400`, `NaoEncontradoErro` `404`, `PoltronaOcupadaErro` `409` e `PagamentoErro`
   `502`) para que o domínio expresse a falha pelo tipo sem acoplar com o Express, enquanto o middleware
   de `servidor.ts` trata todos de forma polimórfica com um único `if (erro instanceof ErroDeNegocio)`
   usando `res.status(erro.status)`.

   Por exemplo, se o pedido inclui as poltronas 7 e 8 e a 8 já está ocupada, a 7 continua livre.

3. **Funcional.** O que ganhamos com `preco.ts` puro? Como vocês testariam ele sem subir o servidor?

   Em `preco.ts`, o cálculo não altera as pessoas nem os ingressos recebidos e não guarda estado entre
   pedidos: com as mesmas entradas e a mesma regra de meia, obtemos o mesmo resultado. As funções
   `valorDoIngresso` e `aplicarTaxa` devolvem funções que guardam o preço base ou o percentual em um
   closure; `montarIngressos` recebe a regra de meia por parâmetro, usa `map` para criar um ingresso por
   pessoa na mesma ordem, e `calcularTotal` usa `reduce` para somar antes de aplicar a taxa de 10% uma
   única vez. Arredondamos a meia e o resultado da taxa para duas casas, evitando resíduos como
   `36.660000000000004`; para testar sem servidor, basta importar as funções e conferir, por exemplo,
   `valorDoIngresso(80)("meia") === 40`, `aplicarTaxa(0.1)(33.33) === 36.66` e
   `calcularTotal([]) === 0`, além de passar outra regra de meia e entradas congeladas com
   `Object.freeze` para verificar que a regra recebida é respeitada e não há mutação.

4. **Se fosse em outro paradigma.** Escolham uma das partes e expliquem como ficaria em outro
   paradigma, e se ficaria melhor ou pior.

   O cálculo de preço poderia ser imperativo: percorrer as pessoas com um `for`, preencher uma lista
   com `push`, acumular os valores em uma variável e aplicar a taxa depois do laço. Essa versão poderia
   produzir os mesmos resultados e também ser pura se só alterasse variáveis locais, mas exigiria
   controlar explicitamente a lista e o acumulador, aumentando as oportunidades de esquecer um valor
   ou aplicar a taxa no lugar errado. Para esta transformação de uma lista de pessoas em ingressos e
   depois em um total, preferimos `map` e `reduce` porque deixam essas duas etapas claras; isso não
   substitui o controle de estado das poltronas em `Evento`, que tem outra responsabilidade.

5. **Concorrente × paralelo.** O Node roda o JavaScript numa linha só: os pedidos de vocês são
   concorrentes, não paralelos. O que mudaria se a venda rodasse em vários núcleos ao mesmo tempo?

   No modelo atual do Node, os pedidos são **concorrentes** (vários pagamentos aguardam I/O ao mesmo
   tempo), mas o código JavaScript que lê e altera `#poltronasVendidas` roda em uma única thread, um
   trecho síncrono por vez — o que torna `evento.reservar(poltronas)` naturalmente atômico enquanto não
   houver `await` no meio. Se a venda rodasse em paralelo de verdade em vários núcleos (por exemplo, com
   `worker_threads` compartilhando memória ou vários processos acessando o mesmo estado), duas threads
   poderiam executar o `for` de verificação de `evento.reservar` ao mesmo tempo em núcleos diferentes,
   ambas enxergarem a poltrona livre e ambas gravarem a reserva, causando condição de corrida (*race
   condition*) mesmo sem `await`. Nesse cenário paralelo, não bastaria reservar antes do `await`: seria
   obrigatório sincronizar o acesso ao conjunto de poltronas com exclusão mútua (mutex/lock por evento
   ou operação atômica do tipo *compare-and-swap* em memória compartilhada, ou transação/constraint de
   unicidade em um banco de dados) para garantir que a leitura e a marcação continuassem indivisíveis.

### Resultados do bench

| Cenário | Pedidos | Tempo (ms) | Vendidos | Poltrona ocupada | Falha de pagamento |
| :--- | ---: | ---: | ---: | ---: | ---: |
| Padrão (`main.ts`) | 200 | 248 | 90 | 100 | 10 |

O bench ocupa as poltronas do evento 1: para rodar de novo, parem o `npm start` (Ctrl+C) e subam outra
vez.

O que os números mostram: Dos 200 pedidos simultâneos disputando as 100 poltronas do evento 1 (dois por poltrona), exatamente 100 receberam `409` antes mesmo de acionar a operadora, garantindo que nenhuma poltrona fosse vendida duas vezes. Dos 100 pedidos que chegaram ao pagamento (com taxa de falha configurada em 10%), 90 foram aprovados (`201`) e 10 falharam na operadora (`502`), devolvendo essas 10 poltronas ao evento (`disponivel: 10` ao final). Como a reserva ocorre de forma síncrona antes do `await` e os pagamentos com latência de 80 ms aguardam de forma concorrente no Event Loop, todos os 200 pedidos terminaram em 248 ms (806 pedidos/s), muito abaixo dos cerca de 8.000 ms que 100 cobranças em série levariam.
