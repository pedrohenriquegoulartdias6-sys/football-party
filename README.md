# ⚽ FOOTBALL PARTY
Quiz multiplayer de futebol em tempo real (React + Vite, Node + Express + Socket.IO). O servidor é a autoridade: pontos, dinheiro, votos, papel de impostor e timers vivem só no backend; o cliente envia apenas intenções (`submitAnswer`, `submitVote`, `placeBid`) e recebe um `state` filtrado por jogador.

## Rodar localmente
```bash
npm install                  # instala raiz, backend e frontend
npm run dev                  # http://localhost:3000 (API na 3001, com proxy)
# ou versão de produção:
npm run build && npm start   # tudo em http://localhost:3000
```
Celulares na mesma rede Wi‑Fi: `http://IP-DO-COMPUTADOR:3000` (ex.: `http://192.168.1.10:3000`; descubra o IP com `ipconfig` / `ifconfig`). Se não abrir, libere a porta 3000 no firewall.

## Como jogar
1. O anfitrião abre o site → **Criar sala** (código de 6 números). O anfitrião é uma tela de controle e não joga.
2. João Pedro, Pedro, Nicolas e Asaph entram cada um no seu aparelho com código + nome (mínimo 3 jogadores, nomes únicos).
3. O anfitrião escolhe o modo de cada rodada (ou 🎲 Aleatório), revela respostas e inicia votações. **Encerrar campeonato** mostra o campeão.

Modos: Desafio dos Craques (100 pts, ignora maiúsculas/acentos/espaços), Melhor da História (letra + tema sorteados; votação nas respostas dos próprios jogadores, sem votar em si; vencedor +100), 1 contra 1 (dois sorteados, 150 pts), Impostor (pistas + votação; impostor escapa +200, descoberto = +100 aos demais), Leilão (R$50 cada, lance digitado validado no servidor; lance nos últimos 3 s estende o tempo).

## Publicar online (com WebSocket)
**Render.com** (plano gratuito serve): New → Web Service → seu repositório no GitHub. Build: `npm install && npm run build`. Start: `npm start`. Você recebe `https://football-party-xxxx.onrender.com` para enviar aos jogadores. Railway e Fly.io também funcionam. Evite Vercel/Netlify (serverless não sustenta Socket.IO).

## Limitações desta versão
Salas em memória (reiniciar o servidor apaga tudo); recarregar a página tira o jogador da sala; sem banco de dados. Perguntas em `backend/src/data.js`, fáceis de ampliar.
