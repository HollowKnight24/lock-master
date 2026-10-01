import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const ts=require('C:/ProgramData/cocos/editors/Creator/3.8.8/resources/app.asar.unpacked/node_modules/typescript');
const root=path.resolve(import.meta.dirname,'..');
const src=fs.readFileSync(path.join(root,'assets/scripts/ui/ScenePreview.ts'),'utf8');
function component(editor){
 const exports={},events=[],delays=[],stats=[];
 const decorate=(...args)=>args.length===2?undefined:()=>undefined;
 const sandbox={exports,require:id=>{
  if(id==='cc')return {_decorator:{ccclass:()=>()=>undefined,executeInEditMode:()=>undefined,property:decorate},Component:class{scheduleOnce(fn){delays.push(fn);}},Enum:x=>x,profiler:{hideStats:()=>stats.push('hide'),showStats:()=>stats.push('show')}};
  if(id==='cc/env')return {EDITOR:editor};
  if(id.endsWith('GameConfig'))return {GameMode:{NORMAL:0}};
  if(id.endsWith('EventManager'))return {EventManager:{emit:(...a)=>events.push(a)},GameEvents:{GAME_START:'GAME_START'}};
  throw Error(id);
 }};
 vm.runInNewContext(ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017,experimentalDecorators:true,useDefineForClassFields:false}}).outputText,sandbox);
 const c=new exports.ScenePreview();c.panels=Array.from({length:5},()=>({active:false}));
 c.templatesRoot={active:false};c.tracks=Array.from({length:5},()=>({active:false}));c.levelLabel={string:''};
 return {c,events,delays,stats};
}
const {c}=component(true);
const selected=[0,1,3,3,3,3,3,4,2];
for(let p=0;p<9;p++){
 c.previewPage=p;c.update();
 assert.deepEqual(c.panels.map(n=>n.active),[0,1,2,3,4].map(i=>i===selected[p]));
 assert.equal(c.templatesRoot.active,p>=2&&p<=6);
 assert.deepEqual(c.tracks.map(n=>n.active),[0,1,2,3,4].map(i=>i===p-2));
}
c.start();
for(let level=0;level<=5;level++){
 const {c,events,delays,stats}=component(false);c.previewPage=4;c.debugStartLevel=level;c.onLoad();
 assert.equal(c.panels[0].active,true);assert.equal(c.templatesRoot.active,false);
 c.start();delays.forEach(fn=>fn());
 assert.deepEqual(stats,['hide']);
 assert.equal(events.length,level===0?0:1);
 if(level>0){assert.equal(events[0][2],level-1);assert.equal(c.panels[3].active,true);}
}
const performancePreview=component(false);
performancePreview.c.showPerformanceStats=true;
performancePreview.c.start();
assert.deepEqual(performancePreview.stats,['show']);
console.log('PASS: nine editor pages; five editor lock templates; normal-home runtime reset; debug-start levels 1-5 map to correct game events.');
