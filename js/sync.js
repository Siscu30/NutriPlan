import { DB, freshUser, DEFAULT_SETTINGS } from './state.js';
import { $, toast } from './dom.js';

/* ============ SYNC (Supabase) — pega tus 2 datos aquí ============ */
const SUPABASE_URL='https://swcxredmjvrwaragmghm.supabase.co';   /* <-- aquí tu Project URL (https://xxxx.supabase.co) */
const SUPABASE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Y3hyZWRtanZyd2FyYWdtZ2htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNDM0MTgsImV4cCI6MjA5NTYxOTQxOH0.Dml8UUtOARaBpb1z0_bjSAYvtKhKmJxDi6nyCC-9dyg';   /* <-- aquí tu anon public key */
let sb=null,_pushT=null,_applying=false;
let _renderFn=null;

export function syncOn(){return SUPABASE_URL&&SUPABASE_KEY&&window.supabase}

/** renderFn: called after a remote update is applied, so sync.js never
    needs to import render.js directly (avoids a render.js<->sync.js cycle,
    since render.js already imports syncOn() from here). */
export function initSync(renderFn){
  _renderFn=renderFn;
  if(!syncOn())return;
  sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
  pullState(true);
  sb.channel('np').on('postgres_changes',{event:'*',schema:'public',table:'nutriplan_state'},p=>{
    const rd=p.new&&p.new.data;if(rd&&(rd.updatedAt||0)>(DB.updatedAt||0))applyRemote(rd)}).subscribe();
}

export async function pullState(initial){if(!sb)return;
  try{const {data}=await sb.from('nutriplan_state').select('data').eq('id',1).single();
    if(data&&data.data&&(data.data.updatedAt||0)>(DB.updatedAt||0))applyRemote(data.data);
    else if(initial)pushState();}catch(e){}}

function applyRemote(rd){_applying=true;DB.plans=rd.plans||DB.plans;DB.user=rd.user||DB.user;DB.updatedAt=rd.updatedAt||Date.now();
  ['fran','lua'].forEach(k=>{DB.user[k]=Object.assign(freshUser(),DB.user[k]);DB.user[k].settings=Object.assign({},DEFAULT_SETTINGS,DB.user[k].settings)});
  try{localStorage.setItem('nutriplan_db',JSON.stringify(DB))}catch(e){}
  if($('#app').classList.contains('show'))_renderFn&&_renderFn();_applying=false;toast('🔄 Sincronizado')}

export function pushState(){if(!sb||_applying)return;clearTimeout(_pushT);_pushT=setTimeout(async()=>{
  try{await sb.from('nutriplan_state').upsert({id:1,data:DB,updated_at:new Date().toISOString()})}catch(e){}},700);}
