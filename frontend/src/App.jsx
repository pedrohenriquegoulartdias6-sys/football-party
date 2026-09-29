import {useEffect,useState} from 'react';import {io} from 'socket.io-client';
const socket=io(import.meta.env.VITE_API_URL || undefined),send=(e,d)=>socket.emit(e,d);
const MODES=[['craques','🏆 Desafio dos Craques'],['melhor','🐐 Melhor da História'],['duelo','⚔️ 1 contra 1'],['impostor','🕵️ Impostor'],['leilao','💰 Leilão'],['random','🎲 Aleatório']];
function Timer({s}){const[,t]=useState(0),off=s.now-Date.now();
 useEffect(()=>{const i=setInterval(()=>t(x=>x+1),250);return()=>clearInterval(i)},[]);
 return s.endsAt?<div className="timer">⏱️ {Math.max(0,Math.ceil((s.endsAt-Date.now()-off)/1000))}</div>:null}
function Input({label,onSend,type='text',pre}){const[v,setV]=useState('');
 return<div className="card"><input value={v} type={type} inputMode={type==='number'?'numeric':undefined} placeholder={label} onChange={e=>setV(e.target.value)}/>
 <button onClick={()=>{onSend(v);setV('')}}>{pre}</button></div>}
function Ranking({s}){const ps=[...s.players].sort((a,b)=>b.score-a.score);
 return<div className="card"><h2>🏆 Campeonato</h2>{ps.map((p,i)=><div className="row" key={p.name}><span>{['🥇','🥈','🥉'][i]||i+1+'º'} {p.name}</span><b>{p.score} pts · R${p.money}</b></div>)}</div>}
function Prompt({s}){
 if(s.mode==='melhor')return<div className="card"><div className="timer">🔤 LETRA: {s.letter}</div><div className="big">🐐 {s.theme}</div></div>;
 if(s.mode==='impostor')return<div className="card big">{s.role?.impostor?'🕵️ VOCÊ É O IMPOSTOR — dê uma pista vaga':s.role?.word?`Tema: ${s.role.word} — dê uma pista sem dizer o nome`:'Rodada do Impostor'}</div>;
 if(s.mode==='duelo')return<div className="card big">⚔️ {s.players.filter(p=>p.playing).map(p=>p.name).join(' VS ')}<br/>{s.q}</div>;
 return<div className="card big">🏆 {s.q}</div>}
function Result({r}){if(!r)return null;
 return<div className="card"><h2>Resultado</h2>
 {r.correct&&<div>Resposta: <b>{r.answer}</b><br/>Acertaram: {r.correct.join(', ')||'ninguém'}</div>}
 {r.tally&&r.tally.map(t=><div className="row" key={t.text}><span>{t.text} <small className="muted">({t.by.join(', ')})</small></span><b>{t.votes} voto(s)</b></div>)}
 {r.impostor&&<div className="big">Impostor: {r.impostor} ({r.word}) — {r.caught?'descoberto!':'escapou!'}</div>}
 {'winner' in r&&(r.winner?<div className="big">{r.winner} levou {r.item} por R${r.bid} (saldo R${r.left})</div>:<div>Ninguém deu lance.</div>)}</div>}
export default function App(){
 const[s,setS]=useState(null),[err,setErr]=useState(''),[code,setCode]=useState(''),[name,setName]=useState('');
 useEffect(()=>{socket.on('state',setS);socket.on('closed',()=>{setS(null);setErr('O anfitrião saiu')});
  socket.on('err',m=>{setErr(m);setTimeout(()=>setErr(''),3000)});return()=>socket.off()},[]);
 const E=err&&<div className="err">{err}</div>;
 if(!s)return<div className="wrap">{E}<h1>⚽ Football Party</h1>
  <div className="card"><button onClick={()=>send('createRoom')}>CRIAR SALA</button></div>
  <div className="card"><h2>Entrar na sala</h2><input placeholder="Código (6 números)" inputMode="numeric" value={code} onChange={e=>setCode(e.target.value)}/>
  <input placeholder="Seu nome" value={name} onChange={e=>setName(e.target.value)}/><button className="alt" onClick={()=>send('joinRoom',{code,name})}>ENTRAR</button></div></div>;
 const H=s.isHost;
 const Menu=H&&(s.phase==='menu'||s.phase==='result')&&<div className="card">{MODES.map(([m,l])=><button key={m} onClick={()=>send('startRound',{mode:m})}>{l}</button>)}
  <button className="alt" onClick={()=>send('finishGame')}>ENCERRAR CAMPEONATO</button></div>;
 let body;
 if(s.phase==='lobby')body=<div className="card"><h2>Sala</h2><div className="code">{s.code}</div><div className="muted">Compartilhe este código.</div>
  {s.players.map(p=><div key={p.name}>🟢 {p.name}</div>)}<div className="muted">{s.players.length} jogador(es)</div>
  {H?<button disabled={s.players.length<3} onClick={()=>send('startGame')}>INICIAR PARTIDA</button>:<b>Você entrou, {s.me?.name}! Aguardando o anfitrião...</b>}</div>;
 else if(s.phase==='final'){const w=[...s.players].sort((a,b)=>b.score-a.score)[0];
  body=<><div className="card" style={{textAlign:'center'}}><h2>🏆 Campeão do Football Party</h2><h1>{w.name}</h1><div className="big">{w.score} PONTOS ⚽ PARABÉNS!</div></div><Ranking s={s}/></>}
 else body=<>
  {s.phase==='menu'&&<div className="card big">{H?'Escolha o modo da rodada':'Aguardando o anfitrião escolher o modo...'}</div>}
  {['answering','closed','reveal','voting','result'].includes(s.phase)&&<Prompt s={s}/>}
  <Timer s={s}/>
  {s.phase==='answering'&&(H?<div className="card">{s.players.filter(p=>p.playing).map(p=><div key={p.name}>{p.done?'✓':'⏳'} {p.name}</div>)}</div>
   :!s.me?.playing?<div className="card">Você acompanha esta rodada.</div>
   :s.me.answered?<div className="card big">🔒 RESPOSTA ENVIADA<br/><span className="muted">Aguarde os outros jogadores.</span></div>
   :<Input label="Sua resposta..." pre="ENVIAR" onSend={t=>send('submitAnswer',{text:t})}/>)}
  {s.phase==='closed'&&(H?<button onClick={()=>send('advance')}>REVELAR RESPOSTAS</button>:<div className="card">Respostas encerradas. Aguarde o anfitrião.</div>)}
  {(s.phase==='reveal'||s.phase==='result')&&s.answers&&<div className="card"><h2>Respostas</h2>{s.answers.map(a=><div key={a.name}>{a.name} → <b>{a.text}</b></div>)}</div>}
  {s.phase==='reveal'&&H&&<button onClick={()=>send('advance')}>INICIAR VOTAÇÃO</button>}
  {s.phase==='voting'&&(H?<div className="card">{s.players.map(p=><div key={p.name}>{p.done?'✓':'⏳'} {p.name}</div>)}</div>
   :s.me.voted?<div className="card big">🔒 VOTO ENVIADO</div>
   :<div className="card"><h2>{s.mode==='impostor'?'Quem é o impostor?':'Vote na melhor resposta'}</h2>
    {s.options.filter(o=>s.mode!=='impostor'||o.text!==s.me.name).map(o=><button key={o.key} onClick={()=>send('submitVote',{key:o.key})}>{o.text}</button>)}</div>)}
  {s.phase==='auction'&&<><div className="card"><h2>💰 Leilão</h2><div className="big">{s.auction.item.name} (+{s.auction.item.pts} pts)</div>
   <div>Lance atual: <b>R${s.auction.bid}</b> {s.auction.by&&`— ${s.auction.by}`}</div>
   {s.players.map(p=><div className="row" key={p.name}><span>{p.name}</span><b>R${p.money}</b></div>)}</div>
   {!H&&<Input label={`Seu lance (saldo R$${s.me.money})`} type="number" pre="DAR LANCE" onSend={v=>send('placeBid',{bid:v})}/>}</>}
  {s.phase==='result'&&<Result r={s.result}/>}
  {Menu}<Ranking s={s}/></>;
 return<div className="wrap">{E}<h1>⚽ Football Party{H?' · Anfitrião':''}</h1>{body}</div>}
