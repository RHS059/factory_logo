import * as THREE from './vendor/three.module.js';

const host = document.querySelector('#landscape');
const status = document.querySelector('#status');
const params = new URLSearchParams(location.search);
const debug = params.has('debug');
const stillTime = params.has('t') ? Math.max(0, Number(params.get('t')) || 0) : null;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const pointer = new THREE.Vector2();
const settings = { animate: !reducedMotion.matches, clouds: true, grass: true, offset: 0 };
const CLOUD_SPEED = 0.0016; // Positive Y rotation moves points on -Z toward -X (screen left).
const time = { value: 0 };

function material(uniforms, vertexShader, fragmentShader, extra = {}) {
  return new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, ...extra });
}
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
  // Reference camera places the isolated distant terrain silhouette.
  const reference = camera.clone();
  reference.updateMatrixWorld();
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
  cloudTexture.repeat.set(-4.8, 1);
  cloudTexture.offset.x = 2.9;
  const clouds = new THREE.Group();
  const cloudShell = new THREE.Mesh(new THREE.CylinderGeometry(600, 600, 410, 128, 1, true),
    new THREE.MeshBasicMaterial({ map: cloudTexture, side: THREE.BackSide, transparent: true, depthWrite: false }));
  cloudShell.position.y = 185;
  cloudShell.renderOrder = -5;
  clouds.add(cloudShell);
  // A second, more distant cloud band has its own slower angular speed.
  const farClouds = new THREE.Mesh(new THREE.CylinderGeometry(780,780,220,128,1,true),
    new THREE.MeshBasicMaterial({map: cloudTexture, side: THREE.BackSide, transparent: true, opacity: .12, depthWrite: false, color: '#9db5b9'}));
  farClouds.position.y = 76;
  farClouds.rotation.y = .35;
  farClouds.renderOrder = -6;
  scene.add(clouds, farClouds);

  // The ground uses ONLY the generated grass frames. The source painting
  // contributes terrain pixels, never a static grass underlay.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(2200,2200), material(
    { frameA:{value:grassA}, frameB:{value:grassB}, uTime:time },
    `varying vec3 vWorld;
     void main() { vec4 world=modelMatrix*vec4(position,1.); vWorld=world.xyz;
       gl_Position=projectionMatrix*viewMatrix*world; }`,
    `uniform sampler2D frameA; uniform sampler2D frameB; uniform float uTime; varying vec3 vWorld;
     void main() {
       float distanceFade=smoothstep(-95.,5.,vWorld.z);
       vec2 p=vec2(vWorld.x*.09, .25+.06*sin(vWorld.z*.035+vWorld.x*.04));
       p.x += .012*sin(uTime*1.05+vWorld.x*.7+vWorld.z*.35);
       float blend=.5-.5*cos(uTime*.9+vWorld.z*.2);
       vec3 color=mix(texture2D(frameA,p).rgb,texture2D(frameB,p).rgb,blend);
       vec3 shade=mix(vec3(1.2,1.12,.7),vec3(.48,.67,.64),distanceFade);
       gl_FragColor=vec4(color*shade,1.); ${outputColor} }`));
  ground.rotation.x=-Math.PI/2;
  ground.name='Flat ground / animated generated grass';
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
    for (const v of [1-550/768,1-edge[i]/768]) {
      const p=onDepth(u,v,-110); if(v===1-550/768) p.y=-.3; points.push(p.x,p.y,p.z); uvs.push(u,v);
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
  const rows=Array.from({length:22},(_,i)=>{
    const fraction=i/21;
    const distance=120*Math.pow(11/120,fraction);
    return {z:10-distance,h:.65+4.15*Math.pow(fraction,2.5),
      w:distance*1.9,count:Math.max(4,Math.ceil(distance*1.9/((.65+4.15*Math.pow(fraction,2.5))*2.5)))};
  });
  rows.forEach((row,i) => {
    const mat = material({ frameA:{value:grassA},frameB:{value:grassB},uTime:time,
      strength:{value:1}, rootFade:{value:.15}, tiles:{value:1}, phase:{value:i*1.93}, tint:{value:new THREE.Color().lerpColors(new THREE.Color('#f2e7a6'),new THREE.Color('#688781'),i/(rows.length-1))} },
    `varying vec2 vUv; uniform float uTime; uniform float phase;
     void main() { vUv=uv; vec3 p=position;
       float bend=uv.y*uv.y;
       float localPhase=phase+modelMatrix[3].x*.63;
       p.x += bend*(sin(uTime*1.05+position.x*.55+localPhase)*.3+sin(uTime*.47+localPhase)*.12);
       p.z += bend*sin(uTime*.8+position.x*.4+localPhase)*.1;
       gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.); }`,
    `varying vec2 vUv; uniform sampler2D frameA; uniform sampler2D frameB;
     uniform float uTime; uniform float phase; uniform float tiles; uniform float strength; uniform float rootFade; uniform vec3 tint;
     void main() { float blend=.5-.5*cos(uTime*.9+phase+vUv.x*.6);
       vec2 sampleUv=vec2(vUv.x*tiles+phase*.2,vUv.y);
       vec4 a=texture2D(frameA,sampleUv), b=texture2D(frameB,sampleUv);
       float alpha=mix(a.a,b.a,blend);
       vec3 rgb=mix(a.rgb*a.a,b.rgb*b.a,blend)/max(alpha,.001);
       alpha*=strength*smoothstep(0.,rootFade,vUv.y)*smoothstep(0.,.1,vUv.x)*(1.-smoothstep(.9,1.,vUv.x));
       if(alpha<.035) discard;
       gl_FragColor=vec4(rgb*tint,alpha); ${outputColor} }`,
    {transparent:true,side:THREE.DoubleSide,depthWrite:false});
    const geometry=new THREE.PlaneGeometry(row.h*3.8,row.h,24,8);
    for(let patch=0;patch<row.count;patch++) {
      const mesh = new THREE.Mesh(geometry,mat);
      const jitter=Math.sin(patch*17.13+i*6.71);
      mesh.position.set((patch/(row.count-1)-.5)*row.w,row.h/2-.02,row.z+jitter*(10-row.z)*.13);
      mesh.scale.set(1+jitter*.18,1+jitter*.38,1);
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
  const deadZone = value => Math.sign(value)*Math.max(0,(Math.abs(value)-.16)/.84);
  host.addEventListener('pointermove',event=>{
    if(event.pointerType==='touch') return;
    const rect=host.getBoundingClientRect();
    pointer.set(
      THREE.MathUtils.clamp(deadZone((event.clientX-rect.left)/rect.width*2-1),-1,1),
      THREE.MathUtils.clamp(deadZone(1-(event.clientY-rect.top)/rect.height*2),-1,1)
    );
  });
  host.addEventListener('pointerleave',()=>pointer.set(0,0));
  window.addEventListener('blur',()=>pointer.set(0,0));
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
    // Bounded translation creates perspective parallax without turning the camera.
    const targetX=debug?settings.offset:(reducedMotion.matches?0:pointer.x*.45);
    const targetY=4+(debug||reducedMotion.matches?0:pointer.y*.2);
    const follow=1.-Math.exp(-5.*dt);
    camera.position.x=THREE.MathUtils.lerp(camera.position.x,targetX,follow);
    camera.position.y=THREE.MathUtils.lerp(camera.position.y,targetY,follow);
    renderer.render(scene,camera);
    frames++;
    if(debug && now-lastStats>500) {
      document.querySelector('#stats').textContent=`${(frames*1000/Math.max(1,now-lastStats)).toFixed(0)} fps · ${renderer.info.render.calls} draws · t ${time.value.toFixed(1)}s\nClouds: right → left · camera: bounded parallax`;
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
