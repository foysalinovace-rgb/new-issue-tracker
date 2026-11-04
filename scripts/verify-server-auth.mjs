import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { createWorkspaceAuth } from '../server/auth.ts';
const directory=fs.mkdtempSync(path.join(path.resolve('artifacts'),'fixed-auth-'));
const store=path.join(directory,'sessions.json');
let clock=Date.now();
async function start(options={}){
 const app=express();app.use(express.json());const auth=createWorkspaceAuth({sessionFile:store,now:()=>clock,...options});app.use('/api/auth',auth.router);app.post('/protected',auth.requireSession,auth.sameOrigin,(_req,res)=>res.json({ok:true}));app.use('/api',(_req,res)=>res.sendStatus(404));
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));return{server,url:`http://127.0.0.1:${server.address().port}`};
}
let running=await start();
const stop=()=>new Promise(resolve=>running.server.close(resolve));
async function call(path,body,cookie,origin){return fetch(running.url+path,{method:body===undefined?'GET':'POST',headers:{...(body!==undefined?{'Content-Type':'application/json',Origin:origin||running.url}:{}),...(cookie?{Cookie:cookie}:{})},body:body===undefined?undefined:JSON.stringify(body)});}
assert.ok(process.env.TEST_ADMIN_PASSWORD,'Set TEST_ADMIN_PASSWORD to run the fixed-account check.');
const credentials={email:'support@inovacetech.com',password:process.env.TEST_ADMIN_PASSWORD};
const cookie=res=>res.headers.get('set-cookie').split(';')[0];
try{
 assert.equal((await(await call('/api/auth/session')).json()).user,null);
 assert.equal((await call('/api/auth/login',credentials,undefined,'https://untrusted.example')).status,403);
 assert.equal((await call('/api/auth/login',{...credentials,password:'wrong'})).status,401);
 assert.equal((await call('/api/auth/login',{...credentials,email:'fapolok7@gmail.com'})).status,401);
 const loginA=await call('/api/auth/login',credentials);assert.equal(loginA.status,200);const deviceA=cookie(loginA);const flags=loginA.headers.get('set-cookie');assert.ok(flags.includes('HttpOnly')&&flags.includes('SameSite=Strict')&&flags.includes('Max-Age=34560000'));assert.ok(!flags.includes('; Secure'));
 const result=await loginA.json();assert.equal(result.user.email,credentials.email);assert.equal(result.user.role,'super_admin');assert.equal(result.token,undefined);
 const loginB=await call('/api/auth/login',credentials);assert.equal(loginB.status,200);const deviceB=cookie(loginB);assert.notEqual(deviceA,deviceB);
 const stored=fs.readFileSync(store,'utf8');assert.ok(!stored.includes(credentials.password));assert.ok(!stored.includes(deviceA.split('=')[1]));assert.equal(JSON.parse(stored).sessions.length,2);
 assert.equal((await call('/protected',{},deviceA)).status,200);
 assert.equal((await call('/protected',{})).status,401);
 assert.equal((await call('/protected',{},deviceA,'https://untrusted.example')).status,403);
 assert.equal((await call('/protected',{},'workspace_admin_session='+('f'.repeat(64)))).status,401);
 for(const endpoint of ['/api/auth/signup','/api/auth/users','/api/admin/users','/api/users'])assert.equal((await call(endpoint,{},deviceA)).status,404);
 await stop();running=await start();assert.equal((await(await call('/api/auth/session',undefined,deviceB)).json()).user.email,credentials.email,'Session persists across server restart');
 const renewed=await call('/api/auth/session',undefined,deviceB);assert.ok(renewed.headers.get('set-cookie').includes('Max-Age=34560000'));
 assert.equal((await call('/api/auth/logout',{},deviceA)).status,200);assert.equal((await(await call('/api/auth/session',undefined,deviceA)).json()).user,null);assert.equal((await call('/protected',{},deviceA)).status,401);assert.ok((await(await call('/api/auth/session',undefined,deviceB)).json()).user,'Other device stays signed in');
 const rotated=await call('/api/auth/login',credentials,deviceB);assert.equal(rotated.status,200);const deviceC=cookie(rotated);assert.notEqual(deviceC,deviceB);assert.equal((await(await call('/api/auth/session',undefined,deviceB)).json()).user,null);assert.ok((await(await call('/api/auth/session',undefined,deviceC)).json()).user);
 await stop();running=await start({maxFailures:3});
 const attempts=await Promise.all(Array.from({length:6},()=>call('/api/auth/login',{...credentials,password:'wrong'})));assert.equal(attempts.filter(r=>r.status===401).length,3);assert.equal(attempts.filter(r=>r.status===429).length,3,'Parallel attempts cannot bypass the limiter');assert.equal((await call('/api/auth/login',credentials)).status,429);
 clock+=16*60*1000;assert.equal((await call('/api/auth/login',credentials)).status,200);
 await stop();running=await start({secureCookies:true});const secure=await call('/api/auth/login',credentials);assert.equal(secure.status,200);assert.ok(secure.headers.get('set-cookie').includes('; Secure'));
 fs.writeFileSync(store,'invalid-json');const unavailable=await call('/api/auth/session',undefined,cookie(secure));assert.equal(unavailable.status,503,'Corrupt store must fail closed');
 console.log(JSON.stringify({login:'fixed account verified without Supabase',sessions:'persistent cookie, server restart, per-device logout and token rotation verified',protection:'HttpOnly/SameSite/Secure, origin checks, forged-cookie rejection and parallel rate limits verified',storage:'only token digests stored; corrupt store fails closed',userCreation:'no endpoints',databaseWrites:0}));
}finally{await stop();}
