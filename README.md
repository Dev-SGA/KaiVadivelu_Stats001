# Kai Vadivelu — Stats 001

App Next.js (Vercel) para as estatísticas individuais de **Kai Vadivelu** (Cincinnati United Soccer Club) na partida contra o Vardar Soccer Club.

O visual segue o Stats 002: tema escuro SGA, Source Sans 3 e Good Times.

## Partidas

- **Vardar** — única partida registrada. **Season** soma as partidas disponíveis.

## Diferenças em relação ao Stats 002

- O split **Under pressure / Not under pressure** é opcional: quando `passResults.combined` está preenchido, só o medidor de passes totais aparece.
- Novo card **Attacking Movement** com **Overlaps** e **Underlaps** (total e quantas vezes recebeu a bola), preenchido em `attackingMovement` de cada partida.
- O card **Stats** mostra **Progressive Passes** (total e % dos passes) no lugar de Offensive Duels quando não há duelos ofensivos registrados.
- `player.photo` e `player.clubLogo` são opcionais — sem foto, um placeholder com as iniciais é exibido.

## Desenvolvimento

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Dados

Edite `data/gameStats.json`. Cada partida tem passes, posses, `attackingMovement` e o bloco `duels`.
