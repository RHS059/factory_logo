import * as THREE from './vendor/three.module.js';

const host = document.querySelector('#landscape');
const status = document.querySelector('#status');
const params = new URLSearchParams(location.search);
const debug = params.has('debug');
const stillTime = params.has('t') ? Math.max(0, Number(params.get('t')) || 0) : null;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const settings = { animate: !reducedMotion.matches, clouds: true, grass: true, offset: 0 };
const CLOUD_SPEED = 0.0016; // Positive Y rotation moves points on -Z toward -X (screen left).
const time = { value: 0 };

function material(uniforms, vertexShader, fragmentShader, extra = {}) {
  return new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, ...extra });
}
const simpleVertex = `varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
const outputColor = `
#include <tonemapping_fragment>
#include <colorspace_fragment>
`;

async function main() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.setAttribute('aria-label', host.getAttribute('aria-label'));
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, 1376 / 768, 0.1, 1500);
  camera.position.set(0, 4, 10);
  camera.lookAt(0, 24, -90);
  camera.updateMatrixWorld();
  // Locked reference projector preserves the source field's painted perspective
  // on a real horizontal ground plane, even during the debug depth check.
  const reference = camera.clone();
  reference.updateMatrixWorld();
  const projector = new THREE.Matrix4().multiplyMatrices(reference.projectionMatrix, reference.matrixWorldInverse);
  const loader = new THREE.TextureLoader();
  const [source, cloudTexture, grassA, grassB] = await Promise.all(
    ['source.png', 'cloud-bank.png', 'grass-a.png', 'grass-b.png'].map(async name => {
      const texture = await loader.loadAsync(`./assets/${name}`);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      return texture;
    })
  );

  // Independent, stationary sky enclosure. No clouds are baked into this layer.
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), material({},
    `varying vec3 vDirection; void main() { vDirection = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    `varying vec3 vDirection; void main() {
      vec3 d = normalize(vDirection);
      float light = 1.-smoothstep(-.8,.7,d.x);
      vec3 low = mix(vec3(.105,.21,.31),vec3(.64,.69,.33),light);
      vec3 high = mix(vec3(.035,.16,.28),vec3(.17,.46,.39),light);
      gl_FragColor = vec4(mix(low,high,smoothstep(0.,.8,d.y)),1.);
      ${outputColor}
    }`, { side: THREE.BackSide, depthWrite: false }));
  sky.renderOrder = -10;
  scene.add(sky);

  // Transparent cloud texture wraps all the way around an open cylinder.
  // Mirrored repeat makes the generated panorama's unequal ends continuous.
  cloudTexture.wrapS = THREE.MirroredRepeatWrapping;
  cloudTexture.repeat.set(-4, 1);
  cloudTexture.offset.x = 2.5;
  const clouds = new THREE.Group();
  const cloudShell = new THREE.Mesh(new THREE.CylinderGeometry(600, 600, 520, 128, 1, true),
    new THREE.MeshBasicMaterial({ map: cloudTexture, side: THREE.BackSide, transparent: true, depthWrite: false }));
  cloudShell.position.y = 240;
  cloudShell.renderOrder = -5;
  clouds.add(cloudShell);
  // A second, more distant cloud band has its own slower angular speed.
  const farClouds = new THREE.Mesh(new THREE.CylinderGeometry(780,780,220,128,1,true),
    new THREE.MeshBasicMaterial({map: cloudTexture, side: THREE.BackSide, transparent: true, opacity: .3, depthWrite: false, color: '#9db5b9'}));
  farClouds.position.y = 76;
  farClouds.rotation.y = .35;
  farClouds.renderOrder = -6;
  scene.add(clouds, farClouds);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(2200,2200), material(
    { source: {value:source}, projector: {value:projector} },
    `uniform mat4 projector; varying vec4 vProjected;
     void main() { vec4 world = modelMatrix * vec4(position,1.); vProjected = projector * world;
       gl_Position = projectionMatrix * viewMatrix * world; }`,
    `uniform sampler2D source; varying vec4 vProjected;
     void main() { vec2 p = vProjected.xy/vProjected.w*.5+.5;
       p = clamp(p,vec2(.001,.001),vec2(.999,.275));
       gl_FragColor = vec4(texture2D(source,p).rgb,1.); ${outputColor} }`));
  ground.rotation.x = -Math.PI / 2;
  ground.name = 'Flat ground / projected original field';
  scene.add(ground);

  // Trace the original hill silhouette into geometry. Texture UVs reference
  // only the terrain; the cloud pixels above its boundary are never drawn.
  const edge = [514,508,503,508,519,512,516,521,517,514,509,503,505,496,496,502,490,487,500,490,490];
  const points = [], uvs = [], indices = [];
  function onDepth(u,v,z) {
    const ray = new THREE.Vector3(u*2-1,v*2-1,.5).unproject(reference).sub(reference.position);
    return reference.position.clone().addScaledVector(ray,(z-reference.position.z)/ray.z);
  }
  for (let i=0;i<edge.length;i++) {
    const u=i/(edge.length-1);
    for (const v of [1-580/768,1-edge[i]/768]) {
      const p=onDepth(u,v,-110); points.push(p.x,p.y,p.z); uvs.push(u,v);
    }
    if(i<edge.length-1) {const n=i*2; indices.push(n,n+2,n+1,n+1,n+2,n+3);}
  }
  const terrainGeometry = new THREE.BufferGeometry();
  terrainGeometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
  terrainGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  terrainGeometry.setIndex(indices);
  const terrain = new THREE.Mesh(terrainGeometry,new THREE.MeshBasicMaterial({map:source,side:THREE.DoubleSide}));
  terrain.name = 'Distant terrain / source silhouette';
  scene.add(terrain);

  const grass = new THREE.Group();
  for (const texture of [grassA,grassB]) texture.wrapS=THREE.MirroredRepeatWrapping;
  // Individual strips occupy distinct world depths, with roots anchored at y=0.
  // Different phases and local tip bending keep the meadow from moving as a sheet.
  const rows = [ {z:-48,h:.4,w:90,count:24}, {z:-24,h:.5,w:52,count:20}, {z:-11,h:.7,w:30,count:16}, {z:1,h:3,w:24,count:6} ];
  rows.forEach((row,i) => {
    const mat = material({ frameA:{value:grassA},frameB:{value:grassB},uTime:time,
      strength:{value:i===3?1:.32}, tiles:{value:1}, phase:{value:i*1.93}, tint:{value:new THREE.Color(i===3?'#688781':i===2?'#b5c1a1':'#dddcb7')} },
    `varying vec2 vUv; uniform float uTime; uniform float phase;
     void main() { vUv=uv; vec3 p=position;
       float bend=uv.y*uv.y;
       float localPhase=phase+modelMatrix[3].x*.63;
       p.x += bend*(sin(uTime*.72+position.x*.55+localPhase)*.055+sin(uTime*.31+localPhase)*.035);
       p.z += bend*sin(uTime*.57+position.x*.4+phase)*.035;
       gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.); }`,
    `varying vec2 vUv; uniform sampler2D frameA; uniform sampler2D frameB;
     uniform float uTime; uniform float phase; uniform float tiles; uniform float strength; uniform vec3 tint;
     void main() { float blend=.5-.5*cos(uTime*.65+phase+vUv.x*.6);
       vec2 sampleUv=vec2(vUv.x*tiles+phase*.2,vUv.y);
       vec4 a=texture2D(frameA,sampleUv), b=texture2D(frameB,sampleUv);
       float alpha=mix(a.a,b.a,blend);
       vec3 rgb=mix(a.rgb*a.a,b.rgb*b.a,blend)/max(alpha,.001);
       alpha*=strength*smoothstep(0.,.6,vUv.y)*smoothstep(0.,.1,vUv.x)*(1.-smoothstep(.9,1.,vUv.x));
       if(alpha<.035) discard;
       gl_FragColor=vec4(rgb*tint,alpha); ${outputColor} }`,
    {transparent:true,side:THREE.DoubleSide,depthWrite:false});
    const geometry=new THREE.PlaneGeometry(row.h*3.8,row.h,24,8);
    for(let patch=0;patch<row.count;patch++) {
      const mesh = new THREE.Mesh(geometry,mat);
      const jitter=Math.sin(patch*17.13+i*6.71);
      mesh.position.set((patch/(row.count-1)-.5)*row.w,row.h/2-.02,row.z+jitter*(i===3?1.3:3));
      mesh.scale.set(1+jitter*.18,1+jitter*.2,1);
      // Ground the scaled patch exactly; no floating grass roots.
      mesh.position.y=row.h*mesh.scale.y/2-.03;
      mesh.renderOrder=10+i;
      mesh.name=`Grass depth ${i+1}, patch ${patch+1}`;
      grass.add(mesh);
    }
  });
  scene.add(grass);

  function resize() {
    const width=host.clientWidth, height=host.clientHeight;
    camera.aspect=width/height;
    // Preserve the original composition vertically in portrait; crop the sides.
    camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(24))*Math.min(1,(1376/768)/camera.aspect)));
    camera.updateProjectionMatrix();
    renderer.setSize(width,height);
  }
  window.addEventListener('resize',resize);
  resize();
  document.querySelector('#debug').hidden=!debug;
  document.querySelector('#motion').checked=settings.animate;
  for(const id of ['motion','clouds','grass']) document.querySelector(`#${id}`).addEventListener('change',event => {
    settings[id==='motion'?'animate':id]=event.target.checked;
  });
  document.querySelector('#offset').addEventListener('input',event=>settings.offset=Number(event.target.value));
  reducedMotion.addEventListener('change',event=>{
    settings.animate=!event.matches; document.querySelector('#motion').checked=settings.animate;
  });
  let elapsed=0, previous=null, frames=0, lastStats=0;
  function render(now) {
    const dt=previous===null?0:Math.min((now-previous)/1000,.05); previous=now;
    if(settings.animate) elapsed+=dt;
    time.value=stillTime??elapsed;
    clouds.rotation.y=time.value*CLOUD_SPEED;
    farClouds.rotation.y=.35+time.value*CLOUD_SPEED*.55;
    clouds.visible=farClouds.visible=settings.clouds;
    grass.visible=settings.grass;
    // Camera orientation never changes. Translation exists only in debug mode.
    camera.position.x=debug?settings.offset:0;
    renderer.render(scene,camera);
    frames++;
    if(debug && now-lastStats>500) {
      document.querySelector('#stats').textContent=`${(frames*1000/Math.max(1,now-lastStats)).toFixed(0)} fps · ${renderer.info.render.calls} draws · t ${time.value.toFixed(1)}s\nClouds: right → left · camera: fixed`;
      frames=0; lastStats=now;
    }
  }
  document.addEventListener('visibilitychange',()=>{
    previous=null; renderer.setAnimationLoop(document.hidden?null:render);
  });
  renderer.domElement.addEventListener('webglcontextlost',event=>{
    event.preventDefault(); renderer.setAnimationLoop(null);
    status.textContent='The graphics context was interrupted. Reload to reopen the meadow.'; status.hidden=false;
  });
  status.hidden=true;
  renderer.setAnimationLoop(render);
}

main().catch(error=>{
  console.error('Landscape initialization failed:',error);
  host.querySelector('canvas')?.remove();
  status.textContent='The animated meadow could not load. Showing the original painting. Please reload with WebGL enabled.';
  status.hidden=false;
});
