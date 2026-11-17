import { DB, UI, SEED, DAYS, DAY_AB, S, activePlan, dayTotals, mealMacros, weekDateKeys, log, settings, save, dateKey, todayIdx } from './state.js';
import { $, esc, toast } from './dom.js';
import { syncOn } from './sync.js';
import { parseDocxText, emptyMeal } from './docxParser.js';

/* ============ THEME ============ */
export function applyTheme(){const t=settings().theme;let dark=t==='dark';if(t==='auto')dark=matchMedia('(prefers-color-scheme:dark)').matches;
  document.body.classList.toggle('dark',dark);
  $('#themeBtn').textContent=dark?'☀️':'🌙';
  $('#theme-color-meta').setAttribute('content',dark?'#11161f':'#f4f6fb');}
matchMedia('(prefers-color-scheme:dark)').addEventListener('change',()=>{if(settings().theme==='auto')applyTheme()});

/* ============ RING (SVG) ============ */
function ring(pct,r,color){const c=2*Math.PI*r;const fill=Math.min(pct,1)*c;
  return `<circle cx="90" cy="90" r="${r}" fill="none" stroke="var(--track)" stroke-width="11"/>
  <circle cx="90" cy="90" r="${r}" fill="none" stroke="${color}" stroke-width="11" stroke-linecap="round" stroke-dasharray="${fill.toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 90 90)"/>`}

function formatWeekRange(){const k=weekDateKeys();const o={month:'short',day:'numeric'};return new Date(k[0]).toLocaleDateString('es-ES',o)+' - '+new Date(k[6]).toLocaleDateString('es-ES',o)}
function weekNavHeader(){
  let lbl = UI.curWeekOff===0?'Esta semana':(UI.curWeekOff===1?'Próxima semana':(UI.curWeekOff===-1?'Semana pasada':`Semana ${UI.curWeekOff>0?'+':''}${UI.curWeekOff}`));
  return `<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:var(--card);border:1px solid var(--border);border-radius:var(--r-xl);margin-bottom:14px;box-shadow:var(--shadow-card)">
    <button class="wnav-btn" data-woff="-1" style="width:36px;height:36px;background:var(--bg-2);border-radius:10px;font-weight:800;color:var(--text)">←</button>
    <div style="text-align:center"><div style="font-weight:800;font-size:14px">${lbl}</div><div style="font-size:11px;color:var(--muted)">${formatWeekRange()}</div></div>
    <button class="wnav-btn" data-woff="1" style="width:36px;height:36px;background:var(--bg-2);border-radius:10px;font-weight:800;color:var(--text)">→</button>
  </div>`}
function bindWeekNav(){document.querySelectorAll('.wnav-btn').forEach(b=>b.onclick=()=>{UI.curWeekOff+=parseInt(b.dataset.woff);renderHoy()})}

/* ============ RENDER: HOY ============ */
export function renderHoy(){
  const s=settings(),d=S()[UI.curDayIdx],t=dayTotals(d);
  const logKey = weekDateKeys()[UI.curDayIdx];
  const lg=log(logKey);
  const isFran=UI.curUser==='fran';const name=isFran?'Fran':'Lua';
  const trainKey='train_'+logKey;const isTrain=!!lg[trainKey];
  const kpct=t.k/s.objKcal,ppct=t.p/s.objProt,cpct=t.c/s.objCarb,fpct=t.f/s.objFat;
  const dayName=(UI.curWeekOff===0&&UI.curDayIdx===todayIdx())?`Hoy · ${DAYS[UI.curDayIdx]}`:DAYS[UI.curDayIdx];

  let h=weekNavHeader()+`<div class="card psum">
    <div class="avatar ${UI.curUser}">${name[0]}</div>
    <div class="who"><h2>${dayName}</h2><p>${isTrain?'🔥 Día de entreno':'Día de descanso'}</p></div>
    <div class="train-toggle-wrap"><span>Entreno</span><div class="toggle ${isTrain?'on':''}" id="trainToggle"></div></div>
  </div>`;

  let pills=S().map((dy,i)=>{const lg2=DB.user[UI.curUser].logs[weekDateKeys()[i]];const tr=lg2&&lg2['train_'+weekDateKeys()[i]];
    return `<button class="day-pill ${i===UI.curDayIdx?'active':''}" data-day="${i}"><span class="ab">${DAY_AB[i]}</span><span class="num">${dy.dia}</span>${tr?'<span class="tr"></span>':''}</button>`}).join('');

  h+=`<div class="day-pills">${pills}</div>`;

  h+=`<div class="card ring-card">
    <div class="ring-wrap"><svg viewBox="0 0 180 180" width="136" height="136">
      ${ring(ppct,54,'var(--prot)')}${ring(cpct,42,'var(--carb)')}${ring(fpct,30,'var(--fat)')}
    </svg><div class="ring-center"><div class="big" style="color:var(--kcal);font-size:24px">${Math.round(t.k)}</div><div class="sub" style="font-size:10px">/ ${s.objKcal} kcal</div></div></div>
    <div class="macro-bars">
      ${mbar('Proteína','var(--prot)',t.p,s.objProt,'g')}
      ${mbar('Carbos','var(--carb)',t.c,s.objCarb,'g')}
      ${mbar('Grasa','var(--fat)',t.f,s.objFat,'g')}
    </div></div>`;

  // meals
  h+=mealCard('comida','🍽️','Comida',d.comida,lg);
  h+=mealCard('cena','🌙','Cena',d.cena,lg);

  // trackers
  if(s.water||s.steps){h+='<div class="trackers">';
    if(s.water)h+=waterTracker(lg);
    if(s.steps)h+=stepsTracker(lg);
    h+='</div>'}

  if(s.weight)h+=weightCard(logKey);

  $('#sec-hoy').innerHTML=h;
  bindWeekNav();
  bindHoy();
}
function mbar(name,color,val,obj,u){const p=Math.min(val/obj*100,100);
  return `<div class="mbar"><div class="top"><b style="color:${color}">${name}</b><span>${Math.round(val)}/${obj}${u}</span></div><div class="bar"><div class="fill" style="width:${p}%;background:${color}"></div></div></div>`}
function mealCard(type,ico,label,m,lg){const mm=mealMacros(m);const done=!!(lg.done&&lg.done[type]);const empty=!m.nombre||m.nombre==='Libre';
  let macros = (mm.k||mm.p||mm.c||mm.f)?
    `<span class="chip kcal">🔥 ${mm.k}</span><span class="chip prot">P ${mm.p}</span><span class="chip carb">C ${mm.c}</span><span class="chip fat">G ${mm.f}</span>`
    :`<span class="chip muted">Sin macros · estimar</span>`;
  return `<div class="card meal" data-type="${type}">
    <div class="meal-head"><div class="meal-ico">${ico}</div><div class="label">${label}</div>
      <button class="done-btn ${done?'on':''}" data-done="${type}">✓</button></div>
    <div class="meal-name ${empty?'empty':''}">${esc(m.nombre||'Libre / a tu gusto')}</div>
    <div class="meal-macros">${macros}</div>
    <button class="edit-btn" data-edit="${type}">✏️ Editar</button>
  </div>`}
function waterTracker(lg){const goal=8;const p=Math.min((lg.water||0)/goal,1);
  return `<div class="card tw water"><div class="h"><div class="ic">💧</div>Agua<small>${lg.water||0}/${goal}</small></div>
    <div style="display:flex;align-items:center;gap:12px;margin-top:4px">
      <div class="ring-wrap" style="width:64px;height:64px"><svg viewBox="0 0 180 180" width="64" height="64">${ring(p,70,'#3b82f6')}</svg>
      <div class="ring-center"><div style="font-size:16px;font-weight:800;color:#3b82f6">${lg.water||0}</div></div></div>
      <div style="display:flex;flex-direction:column;gap:6px;flex:1">
        <button class="steps-btn" id="waterAdd" style="width:100%;background:rgba(59,130,246,.15);color:#3b82f6">＋ Vaso</button>
        <button class="steps-btn" id="waterSub" style="width:100%;background:var(--bg-2);color:var(--muted)">－</button>
      </div>
    </div></div>`}
function stepsTracker(lg){const goal=8000;const p=Math.min((lg.steps||0)/goal,1);
  return `<div class="card tw steps"><div class="h"><div class="ic">👟</div>Pasos</div>
    <div style="display:flex;align-items:center;gap:12px;margin-top:4px">
      <div class="ring-wrap" style="width:64px;height:64px"><svg viewBox="0 0 180 180" width="64" height="64">${ring(p,70,'#22c55e')}</svg>
      <div class="ring-center"><div style="font-size:13px;font-weight:800;color:#22c55e">${Math.round((lg.steps||0)/1000)}k</div></div></div>
      <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:6px">
        <div class="steps-row" style="margin:0"><input class="steps-in" id="stepsIn" type="number" value="${lg.steps||0}" style="font-size:14px;padding:6px 8px"><button class="steps-btn" id="stepsAdd">＋</button></div>
        <div class="steps-src" style="line-height:1.2;margin:0">📱 Atajo de iPhone</div>
      </div>
    </div></div>`}
function weightCard(logKey){const w=DB.user[UI.curUser].weights;const last=w[w.length-1];const first=w[0];
  let spark='', delta='';if(w.length>1){const pts=w.slice(-14).map((x,i,a)=>`${i*10},${30-((x.kg-a[0].kg)*5)}`).join(' ');
    spark=`<svg viewBox="0 -10 130 50" style="width:100%;height:40px;margin-top:8px;overflow:visible"><polyline fill="none" stroke="var(--accent)" stroke-width="2" points="${pts}"/></svg>`;
    const diff=last.kg-first.kg;const dcls=diff>0?'up':diff<0?'down':'flat';delta=(diff>0?'+':'')+diff.toFixed(1)+' kg total'}
  return `<div class="card weight-card" id="weightCardEl" style="cursor:pointer" title="Añadir nuevo peso"><div class="weight-head"><div class="now">${last?last.kg.toFixed(1):'--'}<small> kg</small></div>
    ${delta?`<div class="weight-delta ${dcls}">${delta}</div>`:''}</div>${spark}
    <div style="font-size:11px;color:var(--muted);text-align:center;margin-top:12px;text-transform:uppercase;letter-spacing:0.04em;font-weight:700">Toca para añadir nuevo peso</div></div>`}

function bindHoy(){
  const logKey = weekDateKeys()[UI.curDayIdx];
  const tt=$('#trainToggle');if(tt)tt.onclick=()=>{const lg=log(logKey);const k='train_'+logKey;lg[k]=!lg[k];save();renderHoy()};
  document.querySelectorAll('[data-done]').forEach(b=>b.onclick=()=>{const lg=log(logKey);lg.done=lg.done||{};lg.done[b.dataset.done]=!lg.done[b.dataset.done];if(lg.done[b.dataset.done]){navigator.vibrate&&navigator.vibrate(15)}save();renderHoy()});
  document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editMeal(UI.curDayIdx,b.dataset.edit));
  const waAdd=$('#waterAdd'),waSub=$('#waterSub');
  if(waAdd)waAdd.onclick=()=>{const lg=log(logKey);lg.water=Math.min(8,(lg.water||0)+1);if(lg.water===8)navigator.vibrate&&navigator.vibrate([10,40,10]);save();renderHoy()};
  if(waSub)waSub.onclick=()=>{const lg=log(logKey);lg.water=Math.max(0,(lg.water||0)-1);save();renderHoy()};
  const si=$('#stepsIn'),sa=$('#stepsAdd');if(sa)sa.onclick=()=>{const lg=log(logKey);lg.steps=parseInt(si.value)||0;save();renderHoy();toast('Pasos guardados')};

  const wc=$('#weightCardEl');if(wc)wc.onclick=()=>{
    const v=parseFloat(prompt('Introduce tu nuevo peso (kg):'));if(!v||isNaN(v))return;
    const w=DB.user[UI.curUser].weights;const today=dateKey(0);const ex=w.find(x=>x.date===today);
    if(ex)ex.kg=v;else w.push({date:today,kg:v});w.sort((a,b)=>a.date<b.date?-1:1);save();renderHoy();toast('Peso registrado')
  };

  document.querySelectorAll('#sec-hoy [data-day]').forEach(b=>b.onclick=()=>{UI.curDayIdx=+b.dataset.day;renderHoy()});
}

/* ============ RENDER: HISTORIAL ============ */
let progressMonth='';
export function renderHistorial(){
  const prof=UI.curUser;
  const hist=DB.user[prof].logs||{};
  if(!progressMonth){
    const d=new Date();progressMonth=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  }
  const [yyyy,mm]=progressMonth.split('-').map(Number);
  const mNames=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const mName=mNames[mm-1];

  const firstDayObj=new Date(yyyy,mm-1,1);
  const lastDayObj=new Date(yyyy,mm,0);
  const daysInMonth=lastDayObj.getDate();
  const startDow=(firstDayObj.getDay()+6)%7;

  const todayKey=dateKey(0);

  let h=`<div class="cal-header"><button data-act="cal-prev">◀</button><h3>${mName} ${yyyy}</h3><button data-act="cal-next">▶</button></div>
  <div class="cal-grid">${['L','M','X','J','V','S','D'].map(d=>`<div class="cal-dow">${d}</div>`).join('')}`;

  for(let i=0;i<startDow;i++) h+=`<div class="cal-day empty"></div>`;

  let mSteps=0,mWater=0,mTrain=0,mDays=0;

  for(let d=1;d<=daysInMonth;d++){
    const dateStr=`${yyyy}-${String(mm).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const hData=hist[dateStr]||{};
    const isToday=dateStr===todayKey;
    const isFuture=dateStr>todayKey;

    if(!isFuture && dateStr<=todayKey){
      mSteps+=(hData.steps||0);
      mWater+=(hData.water||0);
      if(hData['train_'+dateStr]) mTrain++;
      mDays++;
    }

    let dataHtml='';
    if(hData.water||hData.steps||hData['train_'+dateStr]){
      dataHtml=`<div class="cal-day-data">`;
      if(hData.water) dataHtml+=`<div><span>💧</span><span>${hData.water}</span></div>`;
      if(hData.steps){
        const sFmt=hData.steps>=1000?(hData.steps/1000).toFixed(1)+'k':hData.steps;
        const color=hData.steps>=10000?'#10b981':(hData.steps>=6000?'#f59e0b':'inherit');
        dataHtml+=`<div style="color:${color}"><span>👟</span><span>${sFmt}</span></div>`;
      }
      if(hData['train_'+dateStr]) dataHtml+=`<div><span>🏋️</span><span>✓</span></div>`;
      dataHtml+=`</div>`;
    }

    let cls="cal-day"+(isToday?' today':'')+(isFuture?' future':'');
    h+=`<div class="${cls}" ${isFuture?'':`data-date="${dateStr}"`}><div class="d-num">${d}</div>${dataHtml}</div>`;
  }
  h+=`</div>`;

  // Stats block
  const avgS=mDays?Math.round(mSteps/mDays):0;
  const avgW=mDays?(mWater/mDays).toFixed(1):0;
  h+=`<div class="section-title">Estadísticas del mes</div>
  <div class="stats-grid">
    <div class="stats-card"><span class="stats-lbl">Media Pasos</span><span class="stats-val" style="color:#10b981">${avgS.toLocaleString()}</span></div>
    <div class="stats-card"><span class="stats-lbl">Media Agua</span><span class="stats-val" style="color:#3b82f6">${avgW} <span style="font-size:14px">v/d</span></span></div>
    <div class="stats-card full"><span class="stats-lbl">Días Entrenados</span><span class="stats-val" style="color:#f97316">${mTrain} <span style="font-size:14px">días</span></span></div>
  </div>`;

  $('#sec-historial').innerHTML=h;

  document.querySelectorAll('#sec-historial button[data-act]').forEach(b=>b.onclick=e=>{
    const act=e.currentTarget.dataset.act;
    let m=mm, y=yyyy;
    if(act==='cal-prev'){m--;if(m<1){m=12;y--}}
    if(act==='cal-next'){m++;if(m>12){m=1;y++}}
    progressMonth=`${y}-${String(m).padStart(2,'0')}`;
    renderHistorial();
  });
  document.querySelectorAll('#sec-historial .cal-day[data-date]').forEach(el=>el.onclick=()=>openEditPastModal(el.dataset.date));
}

function openEditPastModal(exactDate){
  const lg=log(exactDate);
  const trKey='train_'+exactDate;
  $('#modal').innerHTML=`<h3>📝 Día ${exactDate}</h3>
    <p class="sub">Tus registros exactos de este día. Al guardar, afectarán también a los anillos de ese día.</p>
    <div class="fld"><label>Pasos</label><input type="number" id="e-past-steps" value="${lg.steps||0}"></div>
    <div class="fld"><label>Vasos de agua</label><input type="number" id="e-past-water" value="${lg.water||0}"></div>
    <div class="set-row" style="margin-top:16px"><div class="tx"><div class="t">Entrenamiento</div><div class="d">¿Entrenaste este día?</div></div>
      <div class="toggle ${lg[trKey]?'on':''}" id="e-past-train"></div>
    </div>
    <div class="m-acts" style="margin-top:24px"><button class="btn-cancel" id="e-cancel">Cancelar</button><button class="btn-ok" id="e-save">Guardar</button></div>`;
  openModal();
  $('#e-past-train').onclick=()=>$('#e-past-train').classList.toggle('on');
  $('#e-cancel').onclick=closeModal;
  $('#e-save').onclick=()=>{
    lg.steps=+$('#e-past-steps').value||0;
    lg.water=+$('#e-past-water').value||0;
    lg[trKey]=$('#e-past-train').classList.contains('on');
    save();closeModal();renderHistorial();toast('Día actualizado');
  };
}

/* ============ EDIT MEAL MODAL ============ */
function editMeal(dayIdx,type){
  const m=S()[dayIdx][type];
  $('#modal').innerHTML=`<h3>Editar ${type} · ${DAYS[dayIdx]}</h3>
    <div class="fld"><label>Nombre</label><input id="e-nombre" value="${esc(m.nombre)}"></div>
    <div class="fld"><label>Ingredientes (separados por coma)</label><input id="e-ings" value="${esc((m.ingredientes||[]).join(', '))}"></div>
    <label style="font-size:11px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.04em">Macros</label>
    <div class="macro4" style="margin-top:6px">
      <div class="fld"><label>Kcal</label><input id="e-k" type="number" value="${m.calorias||0}"></div>
      <div class="fld"><label>Prot</label><input id="e-p" type="number" value="${m.proteinas||0}"></div>
      <div class="fld"><label>Carb</label><input id="e-c" type="number" value="${m.carbohidratos||0}"></div>
      <div class="fld"><label>Grasa</label><input id="e-f" type="number" value="${m.grasas||0}"></div>
    </div>
    <div class="m-acts"><button class="btn-cancel" id="e-cancel">Cancelar</button><button class="btn-ok" id="e-save">Guardar</button></div>`;
  openModal();
  $('#e-cancel').onclick=closeModal;
  $('#e-save').onclick=()=>{m.nombre=$('#e-nombre').value;m.ingredientes=$('#e-ings').value.split(',').map(x=>x.trim()).filter(Boolean);
    m.calorias=+$('#e-k').value||0;m.proteinas=+$('#e-p').value||0;m.carbohidratos=+$('#e-c').value||0;m.grasas=+$('#e-f').value||0;
    save();closeModal();render();toast('Comida actualizada')};
}
function openModal(){$('#backdrop').classList.add('show')}
function closeModal(){$('#backdrop').classList.remove('show')}

/** Called once from app.js's boot sequence (module load order shouldn't be
    relied on for wiring DOM listeners — explicit init instead). */
export function initModal(){
  $('#backdrop').onclick=e=>{if(e.target===$('#backdrop'))closeModal()};
}

/* ============ RENDER: COMPRA ============ */
const CATS=[{n:'Carnes y pescados',e:'🥩',kw:['pollo','pavo','ternera','res','cerdo','carne','pescado','atún','salmón','merluza','fajita','jamón','fiambre']},
  {n:'Verduras y fruta',e:'🥦',kw:['brécol','brócoli','verdura','ensalada','tomate','zanahoria','patata','boniato','fruta','piña','mango','lechuga','pepino','cebolla','pimiento']},
  {n:'Lácteos y huevos',e:'🥚',kw:['huevo','queso','yogur','leche','mozzarella','mozarela']},
  {n:'Cereales y otros',e:'🍞',kw:['arroz','pan','tostada','pasta','pizza','cereal','avena']}];
function catOf(name){const l=name.toLowerCase();for(const c of CATS)if(c.kw.some(k=>l.includes(k)))return c.n;return 'Otros'}
export function renderCompra(){
  if(!settings().shopping){$('#sec-compra').innerHTML=`<div class="card empty"><span class="emo">🛒</span><h3>Lista de la compra desactivada</h3><p>Actívala en Ajustes.</p></div>`;return}
  const map={};S().forEach(d=>['comida','cena'].forEach(mt=>{(d[mt].ingredientes||[]).forEach(ing=>{const key=ing.toLowerCase();map[key]=map[key]||{name:ing,count:0};map[key].count++})}));
  const items=Object.values(map);
  const checked=DB.user[UI.curUser].shopChecked=DB.user[UI.curUser].shopChecked||{};
  const groups={};items.forEach(it=>{const c=catOf(it.name);(groups[c]=groups[c]||[]).push(it)});
  const total=items.length,doneN=items.filter(it=>checked[it.name.toLowerCase()]).length;
  let h=`<div class="card shop-head"><div class="ct">Lista de la compra<small>${doneN}/${total} marcados</small></div><button class="shop-clear" id="shopClear">Limpiar</button></div>`;
  const order=[...CATS.map(c=>c.n),'Otros'];
  order.forEach(cn=>{if(!groups[cn])return;const emo=(CATS.find(c=>c.n===cn)||{e:'📦'}).e;
    h+=`<div class="card cat"><div class="cat-h"><span class="emo">${emo}</span>${cn}<span class="n">${groups[cn].length}</span></div>`;
    groups[cn].forEach(it=>{const k=it.name.toLowerCase();const dn=checked[k];
      h+=`<div class="sitem ${dn?'done':''}" data-shop="${esc(k)}"><div class="ck">✓</div><span class="nm">${esc(it.name)}</span>${it.count>1?`<span class="chip muted">×${it.count}</span>`:''}</div>`});
    h+='</div>'});
  if(!total)h=`<div class="card empty"><span class="emo">🛒</span><h3>Sin ingredientes</h3><p>Edita las comidas de la semana.</p></div>`;
  $('#sec-compra').innerHTML=h;
  document.querySelectorAll('[data-shop]').forEach(el=>el.onclick=()=>{const k=el.dataset.shop;checked[k]=!checked[k];save();renderCompra()});
  const sc=$('#shopClear');if(sc)sc.onclick=()=>{DB.user[UI.curUser].shopChecked={};save();renderCompra()};
}

/* ============ RENDER: AJUSTES ============ */
export function renderAjustes(){
  const s=settings();
  const tg=(key,on,acc)=>`<div class="toggle ${acc?'acc':''} ${on?'on':''}" data-set="${key}"></div>`;
  let h=`<div class="section-title">Características visibles · ${UI.curUser==='fran'?'Fran':'Lua'}</div>
  <div class="card set-group">
    ${setRow('⚖️','Registro de peso','Mostrar peso y gráfica de tendencia',tg('weight',s.weight,1))}
    ${setRow('💧','Agua','Vasos de agua del día',tg('water',s.water,1))}
    ${setRow('👟','Pasos','Contador de pasos diario',tg('steps',s.steps,1))}
    ${setRow('🛒','Lista de la compra','Generar lista desde el plan',tg('shopping',s.shopping,1))}
  </div>`;

  h+=`<div class="section-title">Objetivos diarios</div>
  <div class="card set-group"><div class="obj-grid">
    <div class="obj-field"><label>Kcal</label><input type="number" data-obj="objKcal" value="${s.objKcal}"></div>
    <div class="obj-field"><label>Proteína (g)</label><input type="number" data-obj="objProt" value="${s.objProt}"></div>
    <div class="obj-field"><label>Carbos (g)</label><input type="number" data-obj="objCarb" value="${s.objCarb}"></div>
    <div class="obj-field"><label>Grasa (g)</label><input type="number" data-obj="objFat" value="${s.objFat}"></div>
  </div></div>`;

  h+=`<div class="section-title">Apariencia</div>
  <div class="card set-group" style="padding:14px 16px"><div class="seg" id="themeSeg">
    <button data-th="light" class="${s.theme==='light'?'active':''}">☀️ Claro</button>
    <button data-th="dark" class="${s.theme==='dark'?'active':''}">🌙 Oscuro</button>
    <button data-th="auto" class="${s.theme==='auto'?'active':''}">🌗 Auto</button>
  </div></div>`;

  h+=`<div class="section-title">Conectar pasos (iPhone)</div>
  <div class="card set-group"><div class="shortcut-box">
    Crea un <b>Atajo</b> en iPhone que lea "Pasos" de Salud y abra esta URL con tu usuario:
    <br><code id="urlFran">${location.origin+location.pathname}?user=${UI.curUser}&steps=PASOS</code>
    <br><button class="copy-url" id="copyUrl">📋 Copiar mi URL</button>
    <div style="margin-top:10px;font-size:12px;color:var(--muted)">Al abrir la app desde el Atajo, los pasos del día se guardan solos. Las instrucciones completas te las paso aparte.</div>
  </div></div>`;

  h+=`<div class="section-title">Sincronización</div>
  <div class="card set-group"><div class="set-row"><div class="ic">${syncOn()?'☁️':'📴'}</div><div class="tx"><div class="t">${syncOn()?'Sincronización activa':'Sin sincronizar'}</div><div class="d">${syncOn()?'Tus datos se comparten entre dispositivos en tiempo real':'Pega tu URL y clave de Supabase en index.html'}</div></div></div></div>`;

  h+=`<div class="section-title">Plan e importación</div>
  <div class="card set-group">
    <div class="dropzone" id="dz"><span class="ico">📄</span><div style="font-weight:700">Importar plan</div>
      <div style="font-size:12px;color:var(--muted);margin-top:4px">Arrastra tu <b>nutri_data.json</b> o un <b>.docx</b> del dietista</div>
      <span class="pick" id="dzPick">Elegir archivo</span><input type="file" id="dzInput" accept=".json,.docx" hidden></div>
    <div style="padding:0 16px 16px;display:flex;flex-direction:column;gap:8px">
      <button class="btn-line" id="newPlanBtn" style="color:var(--accent);border-color:var(--accent);background:rgba(79,143,247,0.1)">✨ Crear nuevo plan (Próximo lunes)</button>
      <button class="btn-line" id="exportBtn">⬇️ Exportar mis datos (JSON)</button>
      <button class="btn-line danger" id="resetBtn">🗑️ Reiniciar al plan original</button>
    </div></div>`;

  $('#sec-ajustes').innerHTML=h;
  bindAjustes();
}
function setRow(ic,t,d,toggle){return `<div class="set-row"><div class="ic">${ic}</div><div class="tx"><div class="t">${t}</div><div class="d">${d}</div></div>${toggle}</div>`}
function bindAjustes(){
  document.querySelectorAll('[data-set]').forEach(t=>t.onclick=()=>{const k=t.dataset.set;settings()[k]=!settings()[k];save();renderAjustes()});
  document.querySelectorAll('[data-obj]').forEach(i=>i.onchange=()=>{settings()[i.dataset.obj]=+i.value||0;save()});
  document.querySelectorAll('#themeSeg button').forEach(b=>b.onclick=()=>{settings().theme=b.dataset.th;save();applyTheme();renderAjustes()});
  $('#copyUrl').onclick=()=>{navigator.clipboard.writeText(`${location.origin+location.pathname}?user=${UI.curUser}&steps=PASOS`);toast('URL copiada')};
  $('#dzPick').onclick=()=>$('#dzInput').click();
  const dz=$('#dz'),dzi=$('#dzInput');
  ['dragover','dragenter'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.add('drag')}));
  ['dragleave','drop'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.remove('drag')}));
  dz.addEventListener('drop',e=>handleFile(e.dataTransfer.files[0]));
  dzi.onchange=()=>handleFile(dzi.files[0]);
  $('#exportBtn').onclick=exportData;
  $('#newPlanBtn').onclick=createNextWeekPlan;
  $('#resetBtn').onclick=()=>{if(confirm('¿Reiniciar el plan al original? Se mantienen tus ajustes, peso y registros.')){DB.plans=JSON.parse(JSON.stringify(SEED.plans));save();render();toast('Plan reiniciado')}};
}
function createNextWeekPlan(){
  const t=new Date();t.setDate(t.getDate()-todayIdx()+7);const nextMon=t.toISOString().slice(0,10);
  const hist=DB.plansHistory[UI.curUser];
  if(hist.find(x=>x.startDate===nextMon)){toast('El plan de la próxima semana ya existe');return}
  hist.push({startDate:nextMon,plan:JSON.parse(JSON.stringify(activePlan()))});
  hist.sort((a,b)=>a.startDate<b.startDate?-1:1);save();toast('Nuevo plan creado. ¡Ve a Semana!');
}
function exportData(){const blob=new Blob([JSON.stringify(DB,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='nutriplan_backup.json';a.click()}
function handleFile(f){if(!f)return;
  if(f.name.endsWith('.json')){const r=new FileReader();r.onload=()=>{try{const p=JSON.parse(r.result);if(p.plans){DB.plans=p.plans;if(p.user)DB.user=p.user;save();render();toast('Datos importados ✅')}else if(p.fran||p.lua){DB.plans=p;save();render();toast('Plan importado ✅')}else toast('JSON no reconocido')}catch(e){toast('Error leyendo JSON')}};r.readAsText(f);return}
  if(f.name.endsWith('.docx')){const r=new FileReader();r.onload=()=>{mammoth.extractRawText({arrayBuffer:r.result}).then(res=>{showDocxImport(res.value)}).catch(()=>toast('No se pudo leer el .docx'))};r.readAsArrayBuffer(f);return}
  toast('Formato no soportado')}
function showDocxImportFallback(text){$('#modal').innerHTML=`<h3>Texto del .docx</h3>
  <p style="font-size:13px;color:var(--muted);margin-bottom:10px">Revisé el contenido del documento. Como cada dietista usa un formato distinto, edita las comidas a mano desde Semana, o pégalo aquí para tenerlo a mano.</p>
  <div class="fld"><textarea style="min-height:220px">${esc(text)}</textarea></div>
  <div class="m-acts"><button class="btn-ok" id="docOk">Entendido</button></div>`;openModal();$('#docOk').onclick=closeModal}

function showDocxImport(text) {
  const parsed = parseDocxText(text);
  if (!parsed || !parsed.dias || parsed.dias.length === 0) {
    return showDocxImportFallback(text);
  }
  const t=new Date();t.setDate(t.getDate()-todayIdx()+7);const nextMon=t.toISOString().slice(0,10);
  let h = '<h3>Vista previa del plan</h3><p class="sub">Se han extraído las comidas. Selecciona la fecha de inicio:</p><input type="date" id="docx-date" value="'+nextMon+'" style="width:100%;margin-bottom:12px;padding:8px;border-radius:8px;border:1px solid var(--border)"><div style="max-height:300px;overflow-y:auto;background:var(--bg-2);padding:10px;border-radius:8px;font-size:12px;margin-bottom:12px">';
  parsed.dias.forEach(d => {
    h += '<b>'+d.dia+'</b><br>☀️ '+(d.comida.nombre||'—')+'<br>🌙 '+(d.cena.nombre||'—')+'<br><br>';
  });
  h += '</div><div class="m-acts"><button class="btn-cancel" id="dCnc">Cancelar</button><button class="btn-ok" id="dOk">Guardar Plan</button></div>';
  $('#modal').innerHTML = h;
  openModal();
  $('#dCnc').onclick = closeModal;
  $('#dOk').onclick = () => {
    const dt = $('#docx-date').value;
    const hist = DB.plansHistory[UI.curUser];
    if (hist.find(x => x.startDate === dt)) {
      toast('Ya hay un plan para esa fecha, se sobrescribirá');
    }
    const plan = JSON.parse(JSON.stringify(SEED.plans[UI.curUser]));
    plan.semana = DAYS.map(dName => {
      const f = parsed.dias.find(x => x.dia.toLowerCase() === dName.toLowerCase());
      if (f) return { dia: dName, comida: f.comida, cena: f.cena, meriendaEspecial: '' };
      return { dia: dName, comida: emptyMeal(), cena: emptyMeal(), meriendaEspecial: '' };
    });
    plan.desayunoFijo = parsed.desayuno || plan.desayunoFijo;
    plan.meriendasFijas = parsed.merienda || plan.meriendasFijas;
    const exIdx = hist.findIndex(x => x.startDate === dt);
    if (exIdx >= 0) hist[exIdx].plan = plan;
    else hist.push({ startDate: dt, plan: plan });
    hist.sort((a,b)=>a.startDate<b.startDate?-1:1);
    save();
    render();
    closeModal();
    toast('Plan importado para el ' + dt);
  };
}

/* ============ NAV / RENDER ============ */
export function render(){applyTheme();
  if(UI.curSec==='hoy')renderHoy();
  else if(UI.curSec==='historial')renderHistorial();
  else if(UI.curSec==='compra')renderCompra();
  else if(UI.curSec==='ajustes')renderAjustes();
  $('#brandSub').textContent={hoy:'Resumen de hoy',historial:'Historial y Estadísticas',compra:'Lista de la compra',ajustes:'Ajustes de '+(UI.curUser==='fran'?'Fran':'Lua')}[UI.curSec];
}
