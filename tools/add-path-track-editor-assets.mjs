import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const ref=i=>({__id__:i}),uid=()=>crypto.randomUUID().replace(/-/g,'').slice(0,22);
function frame(asset){const m=read('assets/resources/art/production/gameplay/'+asset+'.png.meta');return {__uuid__:Object.values(m.subMetas).find(x=>x.importer==='sprite-frame').uuid,__expectedType__:'cc.SpriteFrame'};}
const variants=[['TrackS','lock_s',0],['TrackDiamond','lock_diamond',1]];
const made=[];
for(const [name,asset,kind] of variants){
 const p=structuredClone(read('assets/prefabs/TrackFullCircle.prefab'));p[0]._name=name;p[1]._name=name;
 for(const n of p)if(n?._name==='__LockArt')for(const r of n._components||[]){const c=p[r.__id__];if(c.__type__==='cc.Sprite')c._spriteFrame=frame(asset);}
 for(const n of p)if(n?._name==='Zone_Rotation'||n?._name==='Pointer_Rotation')n._active=false;
 fs.writeFileSync(path.join(root,'assets/prefabs/'+name+'.prefab'),JSON.stringify(p,null,2)+'\n');made.push(p);
}
const s=read('assets/scene.scene'),templates=s.findIndex(n=>n?._name==='LevelTemplates');
if(templates<0)throw Error('LevelTemplates missing');
function cloneInto(src,index,parent){
 const map=new Map();function collect(i){if(map.has(i))return;map.set(i,s.length);s.push(structuredClone(src[i]));for(const r of src[i]._children||[])collect(r.__id__);for(const r of src[i]._components||[])collect(r.__id__);if(src[i].__prefab)collect(src[i].__prefab.__id__);if(src[i]._prefab)collect(src[i]._prefab.__id__);}collect(index);
 function remap(o){if(!o||typeof o!=='object')return;if('__id__'in o){if(map.has(o.__id__))o.__id__=map.get(o.__id__);return;}if(Array.isArray(o)){o.forEach(remap);return;}for(const [k,v]of Object.entries(o)){if(k==='_prefab'||k==='__prefab')o[k]=null;else remap(v);}}
 for(const i of map.values()){remap(s[i]);if('_id'in s[i])s[i]._id=uid();}const out=map.get(index);s[out]._parent=ref(parent);s[out]._active=false;s[parent]._children.push(ref(out));return out;
}
for(const name of variants.map(v=>v[0])){const old=s.findIndex(n=>n?._name===name&&n?._parent?.__id__===templates);if(old>=0)throw Error(name+' already exists');}
const added=made.map(p=>cloneInto(p,1,templates));
const control=s.find(n=>n&&Array.isArray(n.tracks)&&n.previewPage!==undefined);if(!control)throw Error('ScenePreview component missing');
control.tracks=[...control.tracks.slice(0,2),...added,control.tracks[2]];
fs.writeFileSync(path.join(root,'assets/scene.scene'),JSON.stringify(s,null,2)+'\n');
console.log('Added TrackS and TrackDiamond prefabs plus editor scene templates.');
