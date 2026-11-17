import { UI, load, save, settings, todayIdx, dateKey, log, onChange } from './state.js';
import { $, toast } from './dom.js';
import { initSync, pushState } from './sync.js';
import { render, applyTheme, initModal } from './render.js';

/* Composition root: wire state -> sync without either module importing the
   other directly (avoids the state.js<->sync.js circular import). */
onChange(pushState);

/* ============ LOGIN ============ */
function enter(user){UI.curUser=user;localStorage.setItem('nutriplan_lastUser',user);
  $('#login').style.display='none';$('#app').classList.add('show');
  document.querySelectorAll('.profile-tabs button').forEach(x=>x.classList.toggle('active',x.dataset.prof===user));
  document.body.classList.remove('profile-fran','profile-lua');document.body.classList.add('profile-'+user);
  UI.curSec='hoy';UI.curDayIdx=todayIdx();go('hoy')}
document.querySelectorAll('.who-btn').forEach(b=>b.onclick=()=>enter(b.dataset.prof));

/* ============ NAV ============ */
function go(sec){UI.curSec=sec;document.querySelectorAll('.nav button').forEach(b=>b.classList.toggle('active',b.dataset.sec===sec));
  document.querySelectorAll('.section').forEach(s=>s.classList.toggle('active',s.id==='sec-'+sec));render()}

function initSwipe(){
  let tsX=0, tsY=0;
  const sections=['hoy','historial','compra','ajustes'];
  document.addEventListener('touchstart',e=>{tsX=e.changedTouches[0].screenX;tsY=e.changedTouches[0].screenY},{passive:true});
  document.addEventListener('touchend',e=>{
    const teX=e.changedTouches[0].screenX, teY=e.changedTouches[0].screenY;
    const dx=teX-tsX, dy=teY-tsY;
    if(Math.abs(dx)>Math.abs(dy) && Math.abs(dx)>50){
      const i=sections.indexOf(UI.curSec);
      if(dx<0 && i<sections.length-1) go(sections[i+1]); // swipe left -> next
      else if(dx>0 && i>0) go(sections[i-1]); // swipe right -> prev
    }
  },{passive:true});
}

/* ============ STEPS DEEP-LINK INGESTION ============ */
function ingestSteps(){const p=new URLSearchParams(location.search);const u=p.get('user'),st=p.get('steps');
  if(u&&st&&['fran','lua'].includes(u)&&st!=='PASOS'){const n=parseInt(st);if(!isNaN(n)){const prev=UI.curUser;UI.curUser=u;log(dateKey()).steps=n;UI.curUser=prev;save();
    history.replaceState({},'',location.pathname);setTimeout(()=>toast(`👟 ${n.toLocaleString('es')} pasos de ${u==='fran'?'Fran':'Lua'} sincronizados`),600);
    return u}}
  return null}

/* ============ BOOT ============ */
initModal();
load();
const stepUser=ingestSteps();
const last=stepUser||localStorage.getItem('nutriplan_lastUser');
if(last&&['fran','lua'].includes(last)){enter(last)}
else{applyTheme()}
initSync(render);
document.querySelectorAll('.nav button').forEach(b=>b.onclick=()=>go(b.dataset.sec));
document.querySelectorAll('.profile-tabs button').forEach(b=>b.onclick=()=>{UI.curUser=b.dataset.prof;
  document.querySelectorAll('.profile-tabs button').forEach(x=>x.classList.toggle('active',x.dataset.prof===UI.curUser));
  document.body.classList.remove('profile-fran','profile-lua');document.body.classList.add('profile-'+UI.curUser);render()});
$('#themeBtn').onclick=()=>{const s=settings();s.theme=document.body.classList.contains('dark')?'light':'dark';save();applyTheme()};
$('#logoutBtn').onclick=()=>{localStorage.removeItem('nutriplan_lastUser');$('#app').classList.remove('show');$('#login').style.display='grid'};
initSwipe();

/* ============ PWA ============ */
if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js').catch(()=>{})}
