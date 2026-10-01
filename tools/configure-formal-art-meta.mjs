import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'art-sources/20260913/asset-manifest.json'),'utf8').replace(/^\uFEFF/,''));
for(const e of manifest) {
 const file=path.join(root,'assets/resources/art/production',e.path)+'.meta';
 const m=JSON.parse(fs.readFileSync(file,'utf8'));
 const frame=Object.values(m.subMetas).find(s=>s.importer==='sprite-frame');
 const texture=Object.values(m.subMetas).find(s=>s.importer==='texture');
 if(!frame||!texture) throw new Error(file);
 Object.assign(frame.userData,{trimType:'none',trimX:0,trimY:0,offsetX:0,offsetY:0,width:e.width,height:e.height,rawWidth:e.width,rawHeight:e.height,pivotX:0.5,pivotY:0.5,rotated:false,packable:!e.path.includes('_ring'),atlasUuid:''});
 Object.assign(texture.userData,{wrapModeS:'clamp-to-edge',wrapModeT:'clamp-to-edge',minfilter:'linear',magfilter:'linear',mipfilter:'none'});
 m.userData.fixAlphaTransparencyArtifacts=true;
 fs.writeFileSync(file,JSON.stringify(m,null,2)+'\n');
}
console.log('Configured '+manifest.length+' existing Creator image metas. Reimport in Creator.');
