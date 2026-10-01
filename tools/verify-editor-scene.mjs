import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'..');
const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8').replace(/^\uFEFF/,''));
const uuids=new Set();
function metas(folder){
 for(const e of fs.readdirSync(folder,{withFileTypes:true})){
  const file=path.join(folder,e.name);
  if(e.isDirectory())metas(file);
  else if(e.name.endsWith('.meta')){
   const m=JSON.parse(fs.readFileSync(file,'utf8'));
   if(m.uuid)uuids.add(m.uuid);
   for(const s of Object.values(m.subMetas||{}))if(s.uuid)uuids.add(s.uuid);
  }
 }
}
metas(path.join(root,'assets'));
const engineAssets=process.env.COCOS_EDITOR_ASSETS || 'C:/ProgramData/cocos/editors/Creator/3.8.8/resources/resources/3d/engine/editor/assets';
if(fs.existsSync(engineAssets))metas(engineAssets);
const compress=u=>{const b='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',h=u.replace(/-/g,'');let o=h.slice(0,5);for(let i=5;i<32;i+=3){let n=parseInt(h.slice(i,i+3),16);o+=b[n>>6]+b[n&63];}return o;};
const script=n=>compress(read('assets/scripts/'+n+'.ts.meta').uuid);
const scriptTypes=new Set([...uuids].filter(u=>!u.includes('@')).map(compress));
function verify(file){
 const a=read(file),isPrefab=a[0].__type__==='cc.Prefab',nodeTypes=['cc.Node','cc.Scene'],ids=new Set();
 function refs(o){
  if(!o||typeof o!=='object')return;
  if('__id__'in o)assert(a[o.__id__],file+' invalid reference '+o.__id__);
  if('__uuid__'in o)assert(uuids.has(o.__uuid__)||o.__uuid__==='20835ba4-6145-4fbc-a58a-051ce700aa3e@f9941',file+' unknown asset '+o.__uuid__);
  for(const v of Object.values(o))if(typeof v==='object')refs(v);
 }
 for(let i=0;i<a.length;i++){
  const x=a[i];refs(x);
  assert(x.__type__.startsWith('cc.')||scriptTypes.has(x.__type__),file+' unknown component '+x.__type__);
  if(!nodeTypes.includes(x.__type__))continue;
  if(!isPrefab&&x._id){assert(!ids.has(x._id),'duplicate node ID');ids.add(x._id);}
  for(const r of x._children||[])assert.equal(a[r.__id__]._parent?.__id__,i,file+' wrong parent');
  for(const r of x._components||[])assert.equal(a[r.__id__].node?.__id__,i,file+' wrong component owner');
 }
 return a;
}
const s=verify('assets/scene.scene');
for(const n of ['TrackVertical','TrackHalfCircle','TrackS','TrackDiamond','TrackFullCircle'])verify('assets/prefabs/'+n+'.prefab');
const get=n=>s.find(x=>x.__type__==='cc.Node'&&x._name===n);
assert(get('EditorPreview_Control'));
assert(get('LevelTemplates'));
assert.equal(s.find(x=>x.__type__===script('core/LockManager')).trackTemplates.length,3);
assert.equal(s.find(x=>x.__type__===script('ui/ScenePreview')).debugStartLevel,0,'do not ship debug autostart');
assert.equal(s.find(x=>x.__type__===script('ui/VisualTheme')).editorAuthored,true);
assert.equal(s.filter(x=>x.__type__==='cc.Node'&&x._name==='__LockArt').length,5);
assert.equal(s.filter(x=>x.__type__==='cc.Node'&&x._name==='__Needle').length,5);
for(const x of s.filter(x=>x.__type__==='cc.Button')){
 assert.equal(x._transition,3);
 assert(x.clickEvents.every(r=>s[r.__id__].target&&s[r.__id__].handler));
}
console.log('PASS: '+s.filter(x=>x.__type__==='cc.Node').length+' authored scene nodes; five track assets; all graph/asset/script references; production layout protection; normal-home startup.');
