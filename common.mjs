import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

export const FAPI='https://fapi.binance.com';
export const SPOT=['https://api.binance.com','https://data-api.binance.vision'];
export const n=x=>Number(x)||0;
export const qs=o=>new URLSearchParams(o).toString();
export async function j(url){const r=await fetch(url,{headers:{'user-agent':'FundingProfitScanner/2.0'},cache:'no-store',signal:AbortSignal.timeout(12000)});if(!r.ok)throw new Error(`${r.status} ${url}`);return r.json()}
export async function fget(p){return j(FAPI+p)}
export async function sget(p){let e;for(const h of SPOT){try{return await j(h+p)}catch(x){e=x}}throw e}
export function walkBuy(asks,quote){let q=0,b=0;for(const [ps,ss] of asks||[]){const p=n(ps),s=n(ss),room=quote-q,t=Math.min(s,room/p);if(t<=0)break;q+=t*p;b+=t;if(q>=quote-1e-8)break}return {ok:q>=quote*.999999,base:b,quote:q,vwap:b?q/b:0}}
export function walkBase(levels,base){let b=0,q=0;for(const [ps,ss] of levels||[]){const p=n(ps),s=n(ss),t=Math.min(s,base-b);if(t<=0)break;b+=t;q+=t*p;if(b>=base-1e-12)break}return {ok:b>=base*.999999,base:b,quote:q,vwap:b?q/b:0}}
export function flowMetrics(trades,now){let buy=0,sell=0,buy1=0,sell1=0;for(const t of trades||[]){const q=n(t.p)*n(t.q),maker=!!t.m,ts=n(t.T);if(maker)sell+=q;else buy+=q;if(now-ts<=60000){if(maker)sell1+=q;else buy1+=q}}const total=buy+sell,total1=buy1+sell1;return {buy,sell,total,delta:buy-sell,imb:total?(buy-sell)/total*100:0,buy1,sell1,total1,delta1:buy1-sell1,imb1:total1?(buy1-sell1)/total1*100:0}}
export function klineMetrics(kl){if(!Array.isArray(kl)||kl.length<2)return {ch5:0,ch15:0,range15:0};const c=kl.map(x=>n(x[4])),h=kl.map(x=>n(x[2])),l=kl.map(x=>n(x[3]));const last=c.at(-1),c5=c[Math.max(0,c.length-6)],first=c[0];return {ch5:c5?((last/c5)-1)*100:0,ch15:first?((last/first)-1)*100:0,range15:Math.min(...l)>0?((Math.max(...h)/Math.min(...l))-1)*100:0}}
export function oiMetrics(a){if(!Array.isArray(a)||!a.length)return {oiNow:0,oi5:0,oiSpan:0};const vals=a.map(x=>n(x.sumOpenInterestValue||x.sumOpenInterest));const last=vals.at(-1),first=vals[0],prev=vals[Math.max(0,vals.length-2)];return {oiNow:last,oi5:prev?((last/prev)-1)*100:0,oiSpan:first?((last/first)-1)*100:0}}
export function bookMid(b){return b?.bids?.[0]&&b?.asks?.[0]?(n(b.bids[0][0])+n(b.asks[0][0]))/2:0}
export function spreadPct(b){const bid=n(b?.bids?.[0]?.[0]),ask=n(b?.asks?.[0]?.[0]);return bid&&ask?((ask/bid)-1)*100:0}

export class Store{
  constructor(name='fps'){this.name=name;this.pool=null;this.base=process.env.STORE_DIR||path.resolve('data')}
  async init(){if(process.env.DATABASE_URL){const {Pool}=await import('pg');this.pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.PGSSL==='disable'?false:{rejectUnauthorized:false}});await this.pool.query(`CREATE TABLE IF NOT EXISTS shadow_events(id text primary key,symbol text not null,funding_time bigint not null,status text not null,payload jsonb not null,updated_at timestamptz default now())`);await this.pool.query(`CREATE TABLE IF NOT EXISTS fps_state(key text primary key,payload jsonb not null,updated_at timestamptz default now())`)}else await mkdir(this.base,{recursive:true})}
  async upsertEvent(e){if(this.pool){await this.pool.query(`INSERT INTO shadow_events(id,symbol,funding_time,status,payload,updated_at) VALUES($1,$2,$3,$4,$5,now()) ON CONFLICT(id) DO UPDATE SET status=excluded.status,payload=excluded.payload,updated_at=now()`,[e.id,e.symbol,e.nextFundingTime,e.status,e]);return}const all=await this.events(1000);const next=[e,...all.filter(x=>x.id!==e.id)].slice(0,1000);await writeFile(path.join(this.base,'shadow-events.json'),JSON.stringify(next,null,2))}
  async events(limit=200){if(this.pool){const q=await this.pool.query(`SELECT payload FROM shadow_events ORDER BY funding_time DESC LIMIT $1`,[limit]);return q.rows.map(r=>r.payload)}const f=path.join(this.base,'shadow-events.json');if(!existsSync(f))return[];try{return (JSON.parse(await readFile(f,'utf8'))||[]).slice(0,limit)}catch{return[]}}
  async setState(key,payload){if(this.pool){await this.pool.query(`INSERT INTO fps_state(key,payload,updated_at) VALUES($1,$2,now()) ON CONFLICT(key) DO UPDATE SET payload=excluded.payload,updated_at=now()`,[key,payload]);return}await writeFile(path.join(this.base,`state-${key}.json`),JSON.stringify(payload,null,2))}
  async getState(key){if(this.pool){const q=await this.pool.query(`SELECT payload FROM fps_state WHERE key=$1`,[key]);return q.rows[0]?.payload||null}const f=path.join(this.base,`state-${key}.json`);if(!existsSync(f))return null;try{return JSON.parse(await readFile(f,'utf8'))}catch{return null}}
  async close(){if(this.pool)await this.pool.end()}
}
