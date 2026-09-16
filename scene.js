import * as THREE from './vendor/three.module.js';
import {createChromeLogo} from './logo.js?v=2';

const host=document.querySelector('#landscape');
const status=document.querySelector('#status');
const params=new URLSearchParams(location.search);
const debug=params.has('debug');
const still=params.has('t')?Math.max(0,Number(params.get('t'))||0):null;
const introSample=params.has('intro')?Math.max(0,Number(params.get('intro'))||0):null;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const pointer=new THREE.Vector2();
const state={animate:!reduced.matches,clouds:true,grass:true,offset:0};
const time={value:0};
const night={value:0};
let nightTarget=0;
const colorOutput=`
#include <tonemapping_fragment>
#include <colorspace_fragment>
`;

async function main(){
  const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.autoClear=false;
  renderer.localClippingEnabled=true;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1;
  renderer.domElement.setAttribute('role','img');
  renderer.domElement.setAttribute('aria-label',host.getAttribute('aria-label'));
  host.append(renderer.domElement);
  const scene=new THREE.Scene();
  const foregroundScene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(48,1376/768,.1,1600);
  camera.position.set(0,4,10);
  camera.lookAt(0,24,-90);
  camera.updateMatrixWorld();



  const hud=document.querySelector('.factory-hud');
  const investorLabel=document.querySelector('.factory-brand .hud-label');
  const brandTitle=document.querySelector('.factory-brand h1');
  const investors=['BLACKSTONE','KHOSLA','SEQUOIA','INSIGHT','EVANTIC','SOUND','NEA','MANTIS','CLEARLAKE'];
  const textMeasure=document.createElement('canvas').getContext('2d');
  function alignInvestor(){
    if(!textMeasure)return;
    const leftEdge=element=>{
      const style=getComputedStyle(element);
      textMeasure.font=style.fontWeight+' '+style.fontSize+' '+style.fontFamily;
      return -textMeasure.measureText(element.textContent).actualBoundingBoxLeft;
    };
    investorLabel.style.transform='translateX('+(leftEdge(brandTitle)-leftEdge(investorLabel))+'px)';
  }
  document.fonts.ready.then(alignInvestor);
  window.addEventListener('resize',alignInvestor);
  alignInvestor();
  const reference=camera.clone();
  reference.updateMatrixWorld();
  const projector=new THREE.Matrix4().multiplyMatrices(reference.projectionMatrix,reference.matrixWorldInverse);
  const loader=new THREE.TextureLoader();
  const names=['clouds-v3','terrain-v3','far-field-v3','meadow-a-v3','meadow-b-v3'];
  const textures=await Promise.all(names.map(async name=>{
    const t=await loader.loadAsync('./assets/'+name+'.png');
    t.colorSpace=THREE.SRGBColorSpace;
    t.wrapS=THREE.MirroredRepeatWrapping;
    t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    return t;
  }));
  const [cloudMap,terrainMap,fieldMap,grassA,grassB]=textures;
  const nightTextures=await Promise.all(['clouds','terrain','far-field','meadow-a','meadow-b'].map(async name=>{
    const t=await loader.loadAsync('./assets/'+name+'-night.png');
    t.colorSpace=THREE.SRGBColorSpace;t.wrapS=THREE.MirroredRepeatWrapping;
    t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t;
  }));
  const [nightClouds,nightTerrain,nightField,nightGrassA,nightGrassB]=nightTextures;
  const modeButton=document.querySelector('#theme-toggle');
  modeButton.disabled=false;
  modeButton.addEventListener('click',()=>{
    nightTarget=1-nightTarget;
    modeButton.setAttribute('aria-pressed',String(Boolean(nightTarget)));
    modeButton.setAttribute('aria-label',nightTarget?'Switch to day':'Switch to night');
    modeButton.title=nightTarget?'Switch to day':'Switch to night';
  });

  const sky=new THREE.Mesh(new THREE.SphereGeometry(1200,48,24),
    new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{night},
      vertexShader:`varying vec3 direction; void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader:`varying vec3 direction;uniform float night;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      void main(){
        vec3 d=normalize(direction);float light=1.-smoothstep(-.7,.7,d.x);
        vec3 low=mix(vec3(.06,.10,.17),vec3(.20,.23,.29),light);
        vec3 high=mix(vec3(.03,.12,.23),vec3(.12,.46,.32),light);
        vec3 day=mix(low,high,smoothstep(0.,.28,d.y));
        vec3 nightSky=mix(vec3(.022,.012,.065),vec3(.002,.004,.019),smoothstep(0.,.6,d.y));
        nightSky+=vec3(.002,.016,.024)*pow(max(0.,1.-abs(d.x+.4)),8.);
        vec2 starUv=vec2(atan(d.x,-d.z),asin(d.y))*180.;
        vec2 cell=floor(starUv),point=fract(starUv)-vec2(hash(cell),hash(cell+71.));
        float stars=step(.985,hash(cell+19.))*(1.-smoothstep(.015,.10,length(point)))*smoothstep(.08,.2,d.y);
        nightSky+=vec3(stars*.85);
        gl_FragColor=vec4(mix(day,nightSky,night),1.);
        ${colorOutput}}`
    }));
  sky.renderOrder=-10;scene.add(sky);

  // Project the registered full-canvas cloud layer onto the cylindrical shell.
  // At the neutral camera position this reproduces the reference proportions.
  // Fold successive quadrants to make a continuous mirrored 360-degree wrap.
  const cloudGeometry=new THREE.CylinderGeometry(600,600,1400,256,32,true);
  cloudGeometry.translate(0,500,0);
  const clouds=new THREE.Mesh(cloudGeometry,new THREE.ShaderMaterial({
    uniforms:{map:{value:cloudMap},nightMap:{value:nightClouds},night,referenceProjection:{value:projector}},
    side:THREE.BackSide,transparent:true,depthWrite:false,
    vertexShader:`uniform mat4 referenceProjection; varying vec4 projected;
      void main(){
        float angle=atan(position.x,-position.z);
        float folded=asin(sin(angle*2.))*.5;
        vec3 samplePoint=vec3(600.*sin(folded),position.y,-600.*cos(folded));
        projected=referenceProjection*vec4(samplePoint,1.);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
      }`,
    fragmentShader:`uniform sampler2D map,nightMap;uniform float night; varying vec4 projected;
      void main(){vec2 p=projected.xy/projected.w*.5+.5;
        p.y=1.-(1.-p.y)/.91;
        vec4 c=texture2D(map,clamp(p,vec2(0.),vec2(1.)));
        vec4 n=texture2D(nightMap,clamp(p,vec2(0.),vec2(1.)));
        float alpha=mix(c.a,n.a,night);c=vec4(mix(c.rgb*c.a,n.rgb*n.a,night)/max(alpha,.001),alpha);
        if(c.a<.01)discard;gl_FragColor=c;${colorOutput}}`
  }));
  clouds.renderOrder=-5;scene.add(clouds);

  // A real horizontal ground plane closes small gaps between the image layers.
  // It has no original-image texture and no static green-grass artwork.
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(2200,2200),
    new THREE.MeshBasicMaterial({color:'#687d43'}));
  ground.rotation.x=-Math.PI/2;ground.position.y=-.4;scene.add(ground);

  function onDepth(u,v,z){
    const ray=new THREE.Vector3(u*2-1,v*2-1,.5).unproject(reference).sub(reference.position);
    return reference.position.clone().addScaledVector(ray,(z-reference.position.z)/ray.z);
  }
  function layerGeometry(z,scaleY=1,offsetY=0){
    const geometry=new THREE.PlaneGeometry(1,1,512,64);
    const p=geometry.attributes.position,uv=geometry.attributes.uv;
    for(let i=0;i<p.count;i++){
      // Mirrored side extensions fill the opening camera pan.
      const u=uv.getX(i)*5.-2.,v=uv.getY(i)*1.08-.04;
      uv.setXY(i,u,v);const world=onDepth(u,v*scaleY+offsetY,z);p.setXYZ(i,world.x,world.y,world.z);
    }
    geometry.computeBoundingSphere();return geometry;
  }
  function stillLayer(map,nightMap,z,order,name,scaleY=1,offsetY=0){
    const mesh=new THREE.Mesh(layerGeometry(z,scaleY,offsetY),new THREE.ShaderMaterial({
      uniforms:{map:{value:map},nightMap:{value:nightMap},night},
      vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader:`varying vec2 vUv;uniform sampler2D map,nightMap;uniform float night;
        void main(){vec4 a=texture2D(map,vUv),b=texture2D(nightMap,vUv);
          float alpha=mix(a.a,b.a,night);if(alpha<.01)discard;
          gl_FragColor=vec4(mix(a.rgb*a.a,b.rgb*b.a,night)/max(alpha,.001),alpha);${colorOutput}}`,
      transparent:true,depthWrite:false,depthTest:false,side:THREE.DoubleSide
    }));
    mesh.name=name;mesh.renderOrder=order;scene.add(mesh);return mesh;
  }
  // Generated layers retain their original full-canvas registration.
  stillLayer(terrainMap,nightTerrain,-120,1,'Regenerated distant hills');
  stillLayer(fieldMap,nightField,-68,2,'Tan field — parallax only, no wind',.68,.045);

  const grass=new THREE.Group();
  const frontGrass=new THREE.Group();
  const layers=[
    {z:-36,top:.25,phase:0,wind:.0012},
    {z:-18,top:.18,phase:.7,wind:.0019},
    {z:-7,top:.085,phase:1.4,wind:.0027}
  ];
  layers.forEach((layer,i)=>{
    const a=onDepth(0,0,layer.z),b=onDepth(1,0,layer.z);
    const mesh=new THREE.Mesh(layerGeometry(layer.z),new THREE.ShaderMaterial({
      uniforms:{frameA:{value:grassA},frameB:{value:grassB},uTime:time,
        nightA:{value:nightGrassA},nightB:{value:nightGrassB},night,
        top:{value:layer.top},phase:{value:layer.phase},wind:{value:layer.wind},
        worldWidth:{value:b.x-a.x}},
      transparent:true,depthWrite:false,depthTest:false,side:THREE.DoubleSide,
      vertexShader:`varying vec2 vUv;uniform float uTime,phase,wind,worldWidth;
        void main(){vUv=uv;vec3 p=position;
          float wave=sin(uTime*.9+uv.x*48.+uv.y*67.+phase);
          p.x+=wave*worldWidth*wind*.45;
          gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
        }`,
      fragmentShader:`varying vec2 vUv;uniform sampler2D frameA,frameB,nightA,nightB;uniform float night;
        uniform float uTime,top,phase,wind;
        void main(){
          vec2 p=vec2(1.-abs(mod(vUv.x,2.)-1.),clamp(vUv.y,.001,.999));
          p.x+=wind*sin(uTime*1.1+p.x*71.+p.y*95.+phase);
          float blend=.5-.5*cos(uTime*.75+phase+p.x*.7);
          vec4 a=texture2D(frameA,p),b=texture2D(frameB,p);
          vec4 na=texture2D(nightA,p),nb=texture2D(nightB,p);
          float aa=mix(a.a,na.a,night),ba=mix(b.a,nb.a,night);
          a=vec4(mix(a.rgb*a.a,na.rgb*na.a,night)/max(aa,.001),aa);
          b=vec4(mix(b.rgb*b.a,nb.rgb*nb.a,night)/max(ba,.001),ba);
          float alpha=mix(a.a,b.a,blend);
          vec3 rgb=mix(a.rgb*a.a,b.rgb*b.a,blend)/max(alpha,.001);
          float boundary=top-(top>.23?.045*smoothstep(0.,1.,p.x):0.)+.002*sin(p.x*31.)+.0018*sin(p.x*241.);
          alpha*=1.-smoothstep(boundary-.004,boundary+.002,vUv.y);
          if(alpha<.01)discard;gl_FragColor=vec4(rgb,alpha);${colorOutput}
        }`
    }));
    mesh.renderOrder=3+i;mesh.name='Registered wind layer '+(i+1);
    (i===0?grass:frontGrass).add(mesh);
  });
  scene.add(grass);
  foregroundScene.add(frontGrass);
  // Small rooted clumps overlap the metal at its ground contact points.
  // They use world coordinates, so they follow the sculpture's parallax.
  const tuftPositions=[],tuftColors=[],tuftUvs=[];
  let seed=59;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const palette=['#344832','#52623a','#7b8545','#a1a35a'];
  for(const [x,z,size] of [[-4.5,-28.1,.8],[-3.2,-27.8,1],[-1.5,-28.2,.75],[.2,-27.7,.9],[2,-27.9,1],[3.6,-28.1,.8]]){
    for(let blade=0;blade<19;blade++){
      const rootX=x+(random()-.5)*.8,rootZ=z+(random()-.5)*.35;
      const height=(.65+random()*.9)*size,width=.045+random()*.07;
      const lean=(random()-.5)*.9,phase=random()*6.28;
      const color=new THREE.Color(palette[Math.floor(random()*palette.length)]);
      const vertex=(t,side)=>{
        tuftPositions.push(rootX+lean*t*t+side*width*(1-t),.4+height*t,rootZ);
        const shade=.65+.35*t;
        tuftColors.push(color.r*shade,color.g*shade,color.b*shade);
        tuftUvs.push(phase,t);
      };
      for(let segment=0;segment<4;segment++){
        const a=segment/4,b=(segment+1)/4;
        vertex(a,-1);vertex(a,1);vertex(b,-1);
        vertex(a,1);vertex(b,1);vertex(b,-1);
      }
    }
  }
  const tuftGeometry=new THREE.BufferGeometry();
  tuftGeometry.setAttribute('position',new THREE.Float32BufferAttribute(tuftPositions,3));
  tuftGeometry.setAttribute('color',new THREE.Float32BufferAttribute(tuftColors,3));
  tuftGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(tuftUvs,2));
  const tufts=new THREE.Mesh(tuftGeometry,new THREE.ShaderMaterial({
    uniforms:{uTime:time,night},vertexColors:true,side:THREE.DoubleSide,
    transparent:true,depthTest:false,depthWrite:false,
    vertexShader:`varying vec3 bladeColor;uniform float uTime;
      void main(){bladeColor=color;vec3 p=position;
        p.x+=.075*sin(uTime*1.1+uv.x)*uv.y*uv.y;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader:`varying vec3 bladeColor;uniform float night;
      void main(){float l=dot(bladeColor,vec3(.2126,.7152,.0722));
        gl_FragColor=vec4(mix(bladeColor,vec3(.18,.25,.65)*l,night),1.);${colorOutput}}`
  }));
  tufts.name='Grass tufts at logo base';tufts.renderOrder=6;
  foregroundScene.add(tufts);
  // Keep painted colors unchanged. Only the metal uses physical lighting.
  for(const world of [scene,foregroundScene])world.traverse(object=>{
    if(object.material)object.material.toneMapped=false;
  });
  const sculpture=await createChromeLogo(renderer,{cloudMap,grassMap:grassA,nightClouds,nightGrass:nightGrassA,night});
  const groundDay=new THREE.Color('#687d43'),groundNight=new THREE.Color('#15162f');

  function resize(){
    camera.aspect=host.clientWidth/host.clientHeight;
    camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(24))*Math.min(1,(1376/768)/camera.aspect)));
    camera.updateProjectionMatrix();renderer.setSize(host.clientWidth,host.clientHeight);
  }
  window.addEventListener('resize',resize);resize();
  const deadZone=x=>Math.sign(x)*Math.max(0,(Math.abs(x)-.16)/.84);
  host.addEventListener('pointermove',event=>{
    if(event.pointerType==='touch')return;
    const r=host.getBoundingClientRect();
    pointer.set(THREE.MathUtils.clamp(deadZone((event.clientX-r.left)/r.width*2-1),-1,1),
      THREE.MathUtils.clamp(deadZone(1-(event.clientY-r.top)/r.height*2),-1,1));
  });
  host.addEventListener('pointerleave',()=>pointer.set(0,0));
  window.addEventListener('blur',()=>pointer.set(0,0));
  document.querySelector('#debug').hidden=!debug;
  document.querySelector('#motion').checked=state.animate;
  for(const id of ['motion','clouds','grass'])document.querySelector('#'+id).addEventListener('change',event=>{
    state[id==='motion'?'animate':id]=event.target.checked;
  });
  document.querySelector('#offset').addEventListener('input',event=>state.offset=Number(event.target.value));
  reduced.addEventListener('change',event=>{state.animate=!event.matches;document.querySelector('#motion').checked=state.animate;});
  let previous=null,elapsed=0,lastStats=0,introElapsed=0,investorElapsed=0;
  const ease=t=>t*t*t*(t*(t*6.-15.)+10.);
  function render(now){
    const dt=previous===null?0:Math.min((now-previous)/1000,.05);previous=now;
    night.value=reduced.matches?nightTarget:THREE.MathUtils.lerp(night.value,nightTarget,1-Math.exp(-2.4*dt));
    ground.material.color.copy(groundDay).lerp(groundNight,night.value);
    sculpture.setNight(night.value);
    introElapsed=introSample??(introElapsed+dt);
    const skipIntro=reduced.matches||((debug||still!==null)&&introSample===null);
    const pan=skipIntro?1:THREE.MathUtils.clamp((introElapsed-.65)/3.4,0,1);
    // Pan an off-axis camera frustum across the painted landscape.
    camera.projectionMatrix.elements[8]=-2.35*(1-ease(pan));
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    hud.style.opacity=skipIntro?'1':String(ease(THREE.MathUtils.clamp((introElapsed-4.05)/1.1,0,1)));
    if(!reduced.matches&&state.animate&&still===null&&(skipIntro||introElapsed>=5.15))investorElapsed+=dt;
    const labelTime=reduced.matches?0:investorElapsed;
    const labelPhase=labelTime%4.2;
    const labelIndex=(Math.floor(labelTime/4.2)+(labelPhase>=3.6?1:0))%investors.length;
    const labelOpacity=labelPhase<3?1:labelPhase<3.6?1-ease((labelPhase-3)/.6):ease((labelPhase-3.6)/.6);
    if(investorLabel.textContent!==investors[labelIndex]){
      investorLabel.textContent=investors[labelIndex];alignInvestor();
    }
    investorLabel.style.opacity=String(labelOpacity);
    if(state.animate)elapsed+=dt;time.value=still??elapsed;
    clouds.rotation.y=time.value*.001;
    clouds.visible=state.clouds;grass.visible=frontGrass.visible=state.grass;
    tufts.visible=state.grass;
    const follow=1.-Math.exp(-5.*dt);
    camera.position.x=THREE.MathUtils.lerp(camera.position.x,debug?state.offset:(reduced.matches||pan<1?0:pointer.x*.32),follow);
    camera.position.y=THREE.MathUtils.lerp(camera.position.y,4+(debug||reduced.matches||pan<1?0:pointer.y*.14),follow);
    renderer.clear();
    renderer.render(scene,camera);
    // The logo stands after the distant field but before the near grass.
    renderer.clearDepth();
    renderer.render(sculpture.scene,camera);
    renderer.clearDepth();
    renderer.render(foregroundScene,camera);
    if(debug&&now-lastStats>300){
      document.querySelector('#stats').textContent='Time '+time.value.toFixed(1)+'s · '+renderer.info.render.calls+' draws · tan field: no wind';
      lastStats=now;
    }
  }
  document.addEventListener('visibilitychange',()=>{previous=null;renderer.setAnimationLoop(document.hidden?null:render);});
  renderer.domElement.addEventListener('webglcontextlost',event=>{
    event.preventDefault();renderer.setAnimationLoop(null);
    status.textContent='Graphics stopped. Reload the page.';status.hidden=false;
  });
  status.hidden=true;renderer.setAnimationLoop(render);
}
main().catch(error=>{
  console.error('Landscape initialization failed:',error);
  host.querySelector('canvas')?.remove();
  status.textContent='The scene did not load. Reload the page with WebGL enabled.';status.hidden=false;
  document.querySelector('.factory-hud').style.opacity='1';
});






