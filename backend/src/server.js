import express from 'express';import http from 'http';import path from 'path';import {fileURLToPath} from 'url';import {Server} from 'socket.io';
import {Q,DUEL,THEMES,LETTERS,WORDS,ITEMS} from './data.js';
const app=express(),srv=http.createServer(app),io=new Server(srv,{
  cors:{
    origin:process.env.FRONTEND_URL||'*',
    methods:['GET','POST']
  }
});
const dist=path.join(path.dirname(fileURLToPath(import.meta.url)),'../../frontend/dist');
app.use(express.static(dist));app.get('*',(_,res)=>res.sendFile(path.join(dist,'index.html')));
const rooms=new Map(),T={answer:20000,vote:15000,auction:20000};
const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const rnd=a=>a[Math.floor(Math.random()*a.length)],shuffle=a=>[...a].sort(()=>Math.random()-.5);
const nm=(r,i)=>r.players.find(p=>p.id===i)?.name;
const add=(r,i,n)=>{const p=r.players.find(p=>p.id===i);if(p)p.score+=n};
const arm=(r,ms,fn)=>{clearTimeout(r.timer);r.endsAt=Date.now()+ms;r.timer=setTimeout(fn,ms)};
const stop=r=>{clearTimeout(r.timer);r.endsAt=0};
function view(r,id){
 const me=r.players.find(p=>p.id===id),P=r.phase,d=r.data,cur=P==='voting'?r.votes:r.answers;
 const v={code:r.code,phase:P,mode:r.mode,round:r.round,isHost:id===r.host,now:Date.now(),endsAt:r.endsAt,result:r.result,
  players:r.players.map(p=>({name:p.name,score:p.score,money:p.money,bought:p.bought,done:cur[p.id]!==undefined,playing:!r.who||r.who.includes(p.id)})),
  me:me&&{name:me.name,money:me.money,playing:!r.who||r.who.includes(id),answered:r.answers[id]!==undefined,voted:r.votes[id]!==undefined}};
 if(d.q)v.q=d.q.q;if(d.letter){v.letter=d.letter;v.theme=d.theme}
 if(r.mode==='impostor'&&me)v.role=id===d.imp?{impostor:true}:{word:d.word};
 if(P==='reveal'||P==='result')v.answers=(r.who||[]).map(i=>({name:nm(r,i),text:r.answers[i]??'—'}));
 if(P==='voting')v.options=r.options.map(o=>({key:o.key,text:o.text}));
 if(r.auction)v.auction={item:d.item,bid:r.auction.bid,by:nm(r,r.auction.by)};
 return v}
const sync=r=>[r.host,...r.players.map(p=>p.id)].forEach(i=>io.to(i).emit('state',view(r,i)));
function startRound(r,mode){
 if(mode==='random')mode=rnd(['craques','melhor','duelo','impostor','leilao']);
 Object.assign(r,{round:r.round+1,mode,answers:{},votes:{},result:null,data:{},auction:null,options:[],who:r.players.map(p=>p.id)});
 if(mode==='craques')r.data.q=rnd(Q);
 if(mode==='melhor')r.data={letter:rnd(LETTERS),theme:rnd(THEMES)};
 if(mode==='duelo'){r.who=shuffle(r.who).slice(0,2);r.data.q=rnd(DUEL)}
 if(mode==='impostor')r.data={word:rnd(WORDS),imp:rnd(r.who)};
 if(mode==='leilao'){r.data.item=rnd(ITEMS);r.auction={bid:0,by:null};r.phase='auction';arm(r,T.auction,()=>endAuction(r))}
 else{r.phase='answering';arm(r,T.answer,()=>closeAnswers(r))}
 sync(r)}
function closeAnswers(r){if(r.phase!=='answering')return;stop(r);r.phase='closed';sync(r)}
function scoreQuiz(r){const ok=[];r.who.forEach(i=>{if(r.data.q.a.some(a=>norm(a)===norm(r.answers[i]))){ok.push(nm(r,i));add(r,i,r.mode==='duelo'?150:100)}});
 r.result={correct:ok,answer:r.data.q.a[0]};r.phase='result'}
function startVoting(r){
 if(r.mode==='impostor')r.options=r.players.map(p=>({key:p.id,text:p.name,ids:[p.id]}));
 else{const g={};r.who.forEach(i=>{const t=r.answers[i];if(t===undefined)return;(g[norm(t)]??={key:norm(t),text:t,ids:[]}).ids.push(i)});r.options=Object.values(g)}
 r.phase='voting';arm(r,T.vote,()=>closeVoting(r))}
function closeVoting(r){
 if(r.phase!=='voting')return;stop(r);const c={};Object.values(r.votes).forEach(k=>c[k]=(c[k]||0)+1);
 const top=Math.max(0,...r.options.map(o=>c[o.key]||0)),win=r.options.filter(o=>top>0&&(c[o.key]||0)===top);
 const tally=r.options.map(o=>({text:o.text,votes:c[o.key]||0,by:o.ids.map(i=>nm(r,i))})).sort((a,b)=>b.votes-a.votes);
 if(r.mode==='melhor'){win.forEach(o=>o.ids.forEach(i=>add(r,i,100)));r.result={tally,winners:win.map(o=>o.text)}}
 else{const caught=win.length===1&&win[0].key===r.data.imp;
  r.players.forEach(p=>{if(caught&&p.id!==r.data.imp)p.score+=100;if(!caught&&p.id===r.data.imp)p.score+=200});
  r.result={tally,impostor:nm(r,r.data.imp),word:r.data.word,caught}}
 r.phase='result';sync(r)}
function endAuction(r){
 if(r.phase!=='auction')return;stop(r);const a=r.auction,p=r.players.find(p=>p.id===a.by);
 if(p){p.money-=a.bid;p.bought.push(r.data.item.name);p.score+=r.data.item.pts}
 r.result={winner:p?.name,bid:a.bid,left:p?.money,item:r.data.item.name};r.phase='result';sync(r)}
io.on('connection',s=>{
 const on=(e,fn)=>s.on(e,(d={})=>{try{const r=rooms.get(s.data.code);if(e==='createRoom'||e==='joinRoom')fn(d);else if(r)fn(d,r,r.players.find(p=>p.id===s.id))}catch{s.emit('err','Erro no servidor')}});
 const host=(fn)=>(d,r,p)=>{if(r.host===s.id)fn(d,r)};
 on('createRoom',()=>{let c;do c=String(100000+Math.floor(Math.random()*900000));while(rooms.has(c));
  rooms.set(c,{code:c,host:s.id,players:[],phase:'lobby',mode:null,round:0,data:{},answers:{},votes:{},options:[],endsAt:0});s.data.code=c;sync(rooms.get(c))});
 on('joinRoom',d=>{const r=rooms.get(String(d.code).trim()),n=String(d.name||'').trim().slice(0,16);
  if(!r)return s.emit('err','Sala não encontrada');if(r.phase!=='lobby')return s.emit('err','A partida já começou');
  if(!n)return s.emit('err','Digite um nome');if(r.players.some(p=>norm(p.name)===norm(n)))return s.emit('err','Nome já em uso');
  if(r.players.length>=8)return s.emit('err','Sala cheia');r.players.push({id:s.id,name:n,score:0,money:50,bought:[]});s.data.code=r.code;sync(r)});
 on('startGame',host((d,r)=>{if(r.phase!=='lobby')return;if(r.players.length<3)return s.emit('err','Mínimo de 3 jogadores');r.phase='menu';sync(r)}));
 on('startRound',host((d,r)=>{if(['menu','result'].includes(r.phase)&&['craques','melhor','duelo','impostor','leilao','random'].includes(d.mode))startRound(r,d.mode)}));
 on('submitAnswer',(d,r,p)=>{if(!p||r.phase!=='answering'||!r.who.includes(s.id)||r.answers[s.id]!==undefined)return s.emit('err','Resposta não aceita');
  const t=String(d.text||'').trim().slice(0,60);if(!t)return s.emit('err','Digite algo');
  if(r.mode==='melhor'&&norm(t)[0]!==norm(r.data.letter))return s.emit('err','Comece com a letra '+r.data.letter);
  r.answers[s.id]=t;r.who.every(i=>r.answers[i]!==undefined)?closeAnswers(r):sync(r)});
 on('advance',host((d,r)=>{if(r.phase==='closed'){if(r.mode==='craques'||r.mode==='duelo')scoreQuiz(r);else r.phase='reveal';sync(r)}
  else if(r.phase==='reveal'){startVoting(r);sync(r)}}));
 on('submitVote',(d,r,p)=>{if(!p||r.phase!=='voting'||r.votes[s.id]!==undefined)return s.emit('err','Voto não aceito');
  const o=r.options.find(o=>o.key===d.key);if(!o||o.ids.includes(s.id))return s.emit('err','Você não pode votar nisso');
  r.votes[s.id]=o.key;r.players.every(q=>r.votes[q.id]!==undefined)?closeVoting(r):sync(r)});
 on('placeBid',(d,r,p)=>{const b=Number(d.bid);if(!p||r.phase!=='auction'||!Number.isInteger(b))return s.emit('err','Lance inválido');
  if(b<=r.auction.bid)return s.emit('err','O lance precisa superar R$'+r.auction.bid);if(b>p.money)return s.emit('err','Você só tem R$'+p.money);
  r.auction={bid:b,by:s.id};if(r.endsAt-Date.now()<3000)arm(r,3000,()=>endAuction(r));sync(r)});
 on('finishGame',host((d,r)=>{stop(r);r.phase='final';sync(r)}));
 s.on('disconnect',()=>{const r=rooms.get(s.data.code);if(!r)return;
  if(r.host===s.id){stop(r);rooms.delete(r.code);r.players.forEach(p=>io.to(p.id).emit('closed'))}
  else if(r.phase==='lobby'){r.players=r.players.filter(p=>p.id!==s.id);sync(r)}})});
srv.listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('Football Party na porta',process.env.PORT||3000));
