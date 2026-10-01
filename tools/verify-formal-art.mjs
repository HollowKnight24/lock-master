import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const dir=path.join(root,'assets/resources/art/production');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'art-sources/20260913/asset-manifest.json'),'utf8').replace(/^\uFEFF/,''));
let count=0;
for(const entry of manifest) {
 const file=path.join(dir,entry.path), bytes=fs.readFileSync(file);
 if(bytes.subarray(1,4).toString()!=='PNG') throw new Error('Invalid PNG '+entry.path);
 if(bytes.readUInt32BE(16)!==entry.width||bytes.readUInt32BE(20)!==entry.height) throw new Error('Size '+entry.path);
 if(crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase()!==entry.sha256) throw new Error('Hash '+entry.path);
 if(!entry.path.startsWith('background/')&&!entry.path.startsWith('sharing/')&&!entry.transparent) throw new Error('Source missing alpha '+entry.path);
 if(process.argv.includes('--cocos')) {
  const meta=JSON.parse(fs.readFileSync(file+'.meta','utf8'));
  const frame=Object.values(meta.subMetas||{}).find(s=>s.importer==='sprite-frame');
  if(!frame) throw new Error('SpriteFrame missing '+entry.path);
  if(entry.path.includes('_ring')&&frame.userData.trimType!=='none') throw new Error('Radial frame must not trim '+entry.path);
 }
 count++;
}
if(count!==40) throw new Error('Expected 40');
if(fs.existsSync(path.join(root,'assets/art/production'))) throw new Error('Deprecated assets still imported');
console.log('PASS: '+count+' production PNGs, size/hash/source-alpha/archive verified.');
