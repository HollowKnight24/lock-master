import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root = path.resolve(import.meta.dirname, '..');
const read = p => JSON.parse(fs.readFileSync(path.join(root,p),'utf8').replace(/^\uFEFF/,''));
const clone = x => structuredClone(x);
const ref = i => ({__id__:i});
const compress = u => {
 const h=u.replace(/-/g,''); const b='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
 let out=h.slice(0,5); for(let i=5;i<32;i+=3){let n=parseInt(h.slice(i,i+3),16);out+=b[n>>6]+b[n&63];} return out;
};
const uid = () => compress(crypto.randomUUID());
const scene = read('assets/scene.scene');
if(scene.some(x=>x.__type__==='cc.Node'&&x._name==='EditorPreview_Control')) {
 throw Error('Scene is already authored; refusing to overwrite editor adjustments.');
}
const spriteTemplate=clone(scene.find(x=>x.__type__==='cc.Sprite'));
const labelTemplate=clone(scene.find(x=>x.__type__==='cc.Label'));
const buttonTemplate=clone(scene.find(x=>x.__type__==='cc.Button'));
const nodeTemplate=clone(scene[2]);
const uiTemplate=clone(scene.find(x=>x.__type__==='cc.UITransform'));
const scripts = name => compress(read('assets/scripts/'+name+'.ts.meta').uuid);
const color=(r,g,b,a=255)=>({__type__:'cc.Color',r,g,b,a});
const white=color(255,255,255);
function graph(a,prefab=false) {
 const add=o=>{a.push(o);return a.length-1;};
 const comp=(i,type)=>a[i]._components.map(r=>a[r.__id__]).find(c=>c.__type__===type);
 const named=(name)=>a.findIndex(x=>x.__type__==='cc.Node'&&x._name===name);
 const attach=(i,o)=>{
  o.node=ref(i);o._id=prefab?'':uid();o.__prefab=null;
  if(prefab) o.__prefab=ref(add({__type__:'cc.CompPrefabInfo',fileId:uid()}));
  let j=add(o);a[i]._components.push(ref(j));return o;
 };
 const custom=(i,name,props={})=>attach(i,{__type__:scripts(name),_name:'',_objFlags:0,__editorExtras__:{},_enabled:true,...props});
 const size=(i,w,h)=>{
  let t=comp(i,'cc.UITransform')||attach(i,clone(uiTemplate));
  Object.assign(t._contentSize,{width:w,height:h});Object.assign(t._anchorPoint,{x:.5,y:.5});
  let widget=comp(i,'cc.Widget');if(widget)widget._enabled=false;
 };
 const position=(i,x=0,y=0,z=0,angle=0)=>{
  Object.assign(a[i]._lpos,{x,y,z});a[i]._euler.z=angle;
  Object.assign(a[i]._lrot,{x:0,y:0,z:Math.sin(angle*Math.PI/360),w:Math.cos(angle*Math.PI/360)});
 };
 const node=(p,name,w,h,x=0,y=0,angle=0)=>{
  let n=clone(nodeTemplate);n._name=name;n._parent=ref(p);n._children=[];n._components=[];n._prefab=null;n._id=prefab?'':uid();
  n._layer=a[p]._layer;n._active=true;
  const i=add(n);a[p]._children.push(ref(i));
  if(prefab)n._prefab=ref(add({__type__:'cc.PrefabInfo',root:ref(1),asset:ref(0),fileId:uid(),instance:null,targetOverrides:null,nestedPrefabInstanceRoots:null}));
  size(i,w,h);position(i,x,y,0,angle);return i;
 };
 const hide=i=>{for(const t of ['cc.Sprite','cc.Graphics']){let c=comp(i,t);if(c)c._enabled=false;}};
 const frame=asset=>{
  const m=read('assets/resources/art/production/'+asset+'.png.meta');
  const f=Object.values(m.subMetas).find(s=>s.importer==='sprite-frame');
  if(!f)throw Error('Missing SpriteFrame '+asset);
  return {__uuid__:f.uuid,__expectedType__:'cc.SpriteFrame'};
 };
 const sprite=(i,asset)=>{
  let s=comp(i,'cc.Sprite')||attach(i,clone(spriteTemplate));
  Object.assign(s,{_enabled:true,_color:clone(white),_type:0,_sizeMode:0,_spriteFrame:frame(asset),_fillCenter:{__type__:'cc.Vec2',x:.5,y:.5},_fillStart:0,_fillRange:1});
  return s;
 };
 const picture=(p,name,asset,w,h,x=0,y=0,angle=0)=>{
  const i=node(p,name,w,h,x,y,angle);sprite(i,asset);return i;
 };
 const format=(i,fs=34)=>{
  let l=comp(i,'cc.Label');if(!l)return;
  Object.assign(l,{_fontSize:fs,_actualFontSize:fs,_lineHeight:fs*1.25,_color:color(255,238,192),_horizontalAlign:1,_overflow:2,_enableOutline:true,_outlineColor:color(61,28,17),_outlineWidth:3});
 };
 const text=(p,name,value,x,y,w=700,h=65,fs=36)=>{
  const i=node(p,name,w,h,x,y);const l=attach(i,clone(labelTemplate));l._string=value;format(i,fs);return i;
 };
 const first=(p,i)=>{a[p]._children=a[p]._children.filter(r=>r.__id__!==i);a[p]._children.unshift(ref(i));};
 const label=(name,w,h,x,y,fs)=>{const i=named(name);size(i,w,h);position(i,x,y);format(i,fs);return i;};
 return {a,add,comp,named,attach,custom,size,position,node,hide,frame,sprite,picture,format,text,first,label};
}
const g=graph(scene),canvas=g.named('Canvas');
const panels=['MainMenuUI','ModeSelectUI','RankListUI','GamePlayUI','GameOverUI'].map(g.named);
const [home,mode,rank,game,over]=panels;
const backup=path.join(root,'scene-backups','20260913-before-hierarchy');
fs.mkdirSync(backup,{recursive:true});
const saveBackup=p=>{const dest=path.join(backup,path.basename(p));if(!fs.existsSync(dest))fs.copyFileSync(path.join(root,p),dest);};
saveBackup('assets/scene.scene');
for(const n of ['TrackVertical','TrackHalfCircle','TrackFullCircle'])saveBackup('assets/prefabs/'+n+'.prefab');
g.first(canvas,g.picture(canvas,'__ProductionBackground','background/bg_cartoon_dungeon',1080,1920));
g.hide(g.named('Background'));g.hide(g.named('Graphics'));g.hide(g.named('OverlayMask'));
g.picture(home,'__Logo','branding/logo_lockmaster',930,465,0,600);
g.picture(home,'__Mascot','characters/mascot_idle',570,620,0,115);
g.text(home,'__Hint','找准锁芯，一击开启！',0,-660,800,60,30);
function modal(p,asset='ui/panel_wood',w=900,h=1310,y=0){
 const shade=g.node(p,'__ModalShade',1080,1920);
 // Use serialized Graphics rather than an extra raster, matching the existing runtime shade.
 const graphics=clone(scene.find(x=>x.__type__==='cc.Graphics'));
 Object.assign(graphics,{_enabled:true,_fillColor:color(12,8,20,205)});
 // Graphics paths are not serialized by Cocos; use a colored built-in white SpriteFrame.
 const shadeSprite=g.attach(shade,clone(spriteTemplate));
 Object.assign(shadeSprite,{_enabled:true,_type:0,_sizeMode:0,_color:color(12,8,20,205)});
 g.first(p,shade);
 const plate=g.picture(p,'__Panel',asset,w,h,0,y);
 scene[p]._children=scene[p]._children.filter(r=>r.__id__!==plate);
 scene[p]._children.splice(1,0,ref(plate));
}
modal(mode);g.text(mode,'__Title','选择模式',0,240,600,90,54);
g.text(mode,'__Note','普通五关通关后永久解锁 · 视频仅提供一局体验',0,-340,750,60,25);
const mask=g.named('LockMask');
for(const r of scene[mask]._children)g.hide(r.__id__);
g.size(mask,62,62);g.position(mask,230,0);
g.picture(mask,'__Locked','ui/icon_locked',62,62);
modal(rank,'ui/panel_rank',1040,1120,90);
g.text(rank,'__Title','CHALLENGE RECORD',0,295,570,80,44);
for(const [name,w,h,x,y] of [['ScrollView',460,480,0,-60],['view',440,440,0,0],['content',420,440,0,220],['item',420,400,0,-10]]) {
 const i=g.named(name);g.size(i,w,h);g.position(i,x,y);
 if(name==='content'||name==='item')g.comp(i,'cc.UITransform')._anchorPoint.y=1;
 if(name==='ScrollView')g.hide(i);
}
const item=g.named('item');g.format(item,30);const itemLabel=g.comp(item,'cc.Label');
itemLabel._color=color(73,36,20);itemLabel._outlineColor=color(255,244,216);itemLabel._outlineWidth=1;
g.label('TimeLabel',400,85,-270,775,36);g.label('ScoreLabel',400,85,270,775,36);
g.label('LevelLabel',400,70,0,850,30);
g.comp(g.named('TimeLabel'),'cc.Label')._string='⏳ --.-s';
g.comp(g.named('ScoreLabel'),'cc.Label')._string='0 / —';
g.comp(g.named('LevelLabel'),'cc.Label')._string='直线锁芯';
g.picture(game,'__time','ui/icon_time',80,80,-270,865);
g.picture(game,'__score','ui/icon_score',80,80,270,865);
g.picture(game,'__GuideMascot','characters/mascot_idle',210,228,-370,-535);
g.text(game,'__Hint','LEFT CLICK TO PICK\nHOLD RIGHT CLICK TO BOOST',140,-520,720,145,40);
const feedback=g.node(game,'__QTEFeedback',600,110,0,-430);
g.picture(feedback,'__Effect','effects/fx_success',100,100,-200);
g.text(feedback,'__Text','精准命中',30,0,400,80,38);
g.attach(feedback,{__type__:'cc.UIOpacity',_name:'',_objFlags:0,__editorExtras__:{},_enabled:true,_opacity:0});
modal(over);g.picture(over,'__ResultMascot','characters/mascot_lose',220,220,0,85);
g.label('ResultTitle',740,110,0,260,42);
const iconMap={PlayBtn:'play',OpenRankBtn:'rank',ShareBtn:'share',NormalModeBtn:'normal',ChallengeModeBtn:'challenge',ChallengeTrialBtn:'revive',CloseBtn:'close',CloseRankBtnn:'close',UnlockBtn:'unlock',SpeedUpBtn:'speed',RestartBtn:'restart',NextLevelBtn:'next',ReviveBtn:'revive',HomeBtn:'home'};
function newButton(p,name,value,componentName,handler){
 const i=g.node(p,name,560,112);const b=g.attach(i,clone(buttonTemplate));b._target=ref(i);
 b.clickEvents=[ref(g.add({__type__:'cc.ClickEvent',target:ref(p),component:'',_componentId:scripts('ui/'+componentName),handler,customEventData:''}))];
 const l=g.node(i,'Label',400,96);g.attach(l,clone(labelTemplate))._string=value;
 return i;
}
newButton(home,'ShareBtn','分享游戏','MainMenuUI','onShareClick');
newButton(over,'ShareBtn','分享成绩','GameOverUI','onShareClick');
const trialButton=newButton(mode,'ChallengeTrialBtn','▶ WATCH AD FOR 1 CHALLENGE RUN','ModeSelectUI','onChallengeTrialClick');
scene[mode]._components.map(r=>scene[r.__id__]).find(x=>'normalBtn' in x).challengeTrialBtn=ref(trialButton);
const allButtons=scene.map((x,i)=>({x,i})).filter(({x})=>x.__type__==='cc.Node'&&g.comp(scene.indexOf(x),'cc.Button'));
for(const {x,i} of allButtons){
 const parent=scene[x._parent.__id__]._name,name=x._name;
 let w=560,h=112,px=0,py=x._lpos.y;
 if(parent==='MainMenuUI')py={PlayBtn:-280,OpenRankBtn:-430,ShareBtn:-580}[name];
 if(parent==='ModeSelectUI')py={NormalModeBtn:80,ChallengeModeBtn:-75,ChallengeTrialBtn:-230,CloseBtn:-440}[name];
 if(parent==='GamePlayUI'){w=450;h=140;py=-790;px=name==='UnlockBtn'?245:-245;}
 if(parent==='GameOverUI'){h=100;py={RestartBtn:-65,NextLevelBtn:-190,ReviveBtn:-315,ShareBtn:-440,HomeBtn:-565}[name];}
 if(parent==='RankListUI')py=-580;
 g.size(i,w,h);g.position(i,px,py);g.hide(i);
 const b=g.comp(i,'cc.Button');b._transition=3;b._zoomScale=.95;
 if(name==='ChallengeModeBtn')b._interactable=false;
 for(const key of ['_normalSprite','_hoverSprite','_pressedSprite','_disabledSprite'])b[key]=null;
 const tone=name==='SpeedUpBtn'?'red':['ChallengeModeBtn','ChallengeTrialBtn','NextLevelBtn','ReviveBtn','ShareBtn'].includes(name)?'cyan':'gold';
 g.first(i,g.picture(i,'__ButtonArt','ui/button_'+tone,w,h));
 g.picture(i,'__ButtonIcon','ui/icon_'+(iconMap[name]||'play'),76,76,-w/2+75);
 const l=x._children.map(r=>r.__id__).find(j=>scene[j]._name==='Label');
 if(l!==undefined){g.size(l,w-175,h-16);g.position(l,36,0);g.format(l,parent==='GamePlayUI'?31:35);
 const c=g.comp(l,'cc.Label');if(c._string==='button')c._string='PICK LOCK';if(c._string==='speed')c._string='HOLD TO BOOST';if(name==='ReviveBtn')c._string='▶ WATCH AD · RETRY';}
 g.custom(i,'ui/ProductionButton',{editorAuthored:true,autoReflowResult:true});
}
g.custom(canvas,'ui/VisualTheme',{editorAuthored:true});
const templates=g.node(canvas,'LevelTemplates',1080,1920);scene[templates]._active=false;
// Draw the editor templates beneath UIRoot, just like runtime TrackContainer.
scene[canvas]._children=scene[canvas]._children.filter(r=>r.__id__!==templates);
const uiIndex=scene[canvas]._children.findIndex(r=>r.__id__===g.named('UIRoot'));
scene[canvas]._children.splice(uiIndex,0,ref(templates));
function cloneTreeIntoScene(src,index,parent){
 const map=new Map();
 function collect(i){
  if(map.has(i))return;map.set(i,g.add(clone(src[i])));
  const n=src[i];for(const r of n._children||[])collect(r.__id__);
  for(const r of n._components||[])map.set(r.__id__,g.add(clone(src[r.__id__])));
 }
 collect(index);
 function remap(o){
  if(!o||typeof o!=='object')return;
  if('__id__'in o){if(!map.has(o.__id__))throw Error('Unexpected external graph reference '+o.__id__);o.__id__=map.get(o.__id__);return;}
  if(Array.isArray(o)){o.forEach(remap);return;}
  for(const [k,v]of Object.entries(o)){if(k==='_prefab'||k==='__prefab')o[k]=null;else remap(v);}
 }
 for(const [old,i]of map){const o=scene[i];if(old===index)o._parent=null;remap(o);o._id=uid();}
 const result=map.get(index);scene[result]._parent=ref(parent);scene[parent]._children.push(ref(result));scene[result]._active=false;
 return result;
}
const tracks=[];
for(const [level,name]of ['TrackVertical','TrackHalfCircle','TrackFullCircle'].entries()){
 const p=read('assets/prefabs/'+name+'.prefab'),f=graph(p,true),vertical=level===0,half=level===1;
 const body=f.named('LockBackground_Art');f.hide(body);
 f.first(body,f.picture(body,'__LockArt','gameplay/lock_'+(vertical?'vertical':half?'half':'full'),vertical?930:900,vertical?1240:1200,vertical?-26:half?0:28,vertical?137:133));
 const zone=f.named(vertical?'Zone_Linear':'Zone_Rotation');f.size(zone,vertical?172:540,vertical?150:540);
 const zs=f.sprite(zone,'gameplay/zone_yellow_'+(vertical?'linear':'ring'));
 if(!vertical){Object.assign(zs,{_type:3,_fillType:2,_fillRange:.15});f.position(zone,0,0,0,half?60:120);}
 f.custom(zone,'ui/ProductionZone',{radial:!vertical});
 const pointer=f.named(vertical?'Pointer_Linear':'Pointer_Rotation');f.hide(pointer);
 if(vertical)f.position(pointer,0,-235);
 const old=f.named('Pointer_Art');if(old>=0)f.hide(old);
 f.picture(pointer,'__Needle','gameplay/pointer_'+(vertical?'linear':'radial'),80,280,vertical?0:130,0,-90);
 fs.writeFileSync(path.join(root,'assets/prefabs/'+name+'.prefab'),JSON.stringify(p,null,2)+'\n');
 tracks.push(cloneTreeIntoScene(p,1,templates));
}
g.comp(g.named('LockManager_Node'),scripts('core/LockManager')).trackTemplates=tracks.map(ref);
const control=g.node(canvas,'EditorPreview_Control',0,0);
g.custom(control,'ui/ScenePreview',{previewPage:0,debugStartLevel:0,panels:panels.map(ref),templatesRoot:ref(templates),tracks:tracks.map(ref),levelLabel:ref(scene[g.named('LevelLabel')]._components.find(r=>scene[r.__id__].__type__==='cc.Label').__id__)});
fs.writeFileSync(path.join(root,'assets/scene.scene'),JSON.stringify(scene,null,2)+'\n');
console.log('Authored scene: '+scene.filter(x=>x.__type__==='cc.Node').length+' nodes; five track assets and scene templates saved. Backup: '+backup);
