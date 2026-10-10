import fs from 'fs'; import path from 'path';
import occtimportjs from 'occt-import-js';
import { Document, NodeIO } from '@gltf-transform/core';
import { KHRMeshQuantization } from '@gltf-transform/extensions';
import { dedup, weld, quantize, prune } from '@gltf-transform/functions';
const occt = await occtimportjs();
const src = process.argv[2], out = process.argv[3]; fs.mkdirSync(out,{recursive:true});
const io = new NodeIO().registerExtensions([KHRMeshQuantization]);
const manifest = [];
for (const f of fs.readdirSync(src).filter(f=>f.endsWith('.step'))) {
  const r = occt.ReadStepFile(new Uint8Array(fs.readFileSync(path.join(src,f))), { linearUnit:'millimeter', linearDeflectionType:'bounding_box_ratio', linearDeflection:0.002, angularDeflection:0.4 });
  if (!r.success) { console.log('FAIL', f); continue; }
  const doc = new Document(); const buf = doc.createBuffer(); const scene = doc.createScene(); const root = doc.createNode(f.replace('.step','')); scene.addChild(root);
  const mats = {};
  let tris = 0;
  r.meshes.forEach((m,i)=>{
    const c = m.color || [0.6,0.6,0.6]; const key=c.map(v=>v.toFixed(3)).join(',');
    if(!mats[key]){ const lum=0.3*c[0]+0.59*c[1]+0.11*c[2]; const metal = (c[0]>0.7&&c[1]>0.6&&c[2]<0.5)||(Math.abs(c[0]-c[1])<0.05&&Math.abs(c[1]-c[2])<0.05&&lum>0.6);
      mats[key]=doc.createMaterial('m'+Object.keys(mats).length).setBaseColorFactor([...c,1]).setMetallicFactor(metal?0.85:0.05).setRoughnessFactor(metal?0.3:0.6); }
    const pos = doc.createAccessor().setType('VEC3').setArray(new Float32Array(m.attributes.position.array)).setBuffer(buf);
    const prim = doc.createPrimitive().setAttribute('POSITION',pos).setMaterial(mats[key]);
    if (m.attributes.normal) prim.setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(m.attributes.normal.array)).setBuffer(buf));
    const idx = m.index.array; tris += idx.length/3;
    prim.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(idx)).setBuffer(buf));
    root.addChild(doc.createNode(m.name||('part'+i)).setMesh(doc.createMesh().addPrimitive(prim)));
  });
  await doc.transform(dedup(), weld(), quantize(), prune());
  const name = f.replace('.step','').replace(/[^A-Za-z0-9_.-]/g,'_') + '.glb';
  await io.write(path.join(out,name), doc);
  manifest.push({ source:f, glb:name, triangles:tris, kb: Math.round(fs.statSync(path.join(out,name)).size/1024) });
}
fs.writeFileSync(path.join(out,'manifest.json'), JSON.stringify(manifest,null,2));
console.table(manifest);
