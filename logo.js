import * as THREE from './vendor/three.module.js';
import {createLogoGeometry} from './logo-geometry.js';

export async function createChromeLogo(renderer,{cloudMap,grassMap}) {
  const response=await fetch('./assets/logo-contours.json');
  if(!response.ok)throw new Error('Logo outline did not load');
  const contours=await response.json();
  const scene=new THREE.Scene();
  const geometry=createLogoGeometry(contours);

  // This environment exists only for the metal material. It does not replace
  // the painted sky or change any landscape material.
  const reflectionScene=new THREE.Scene();
  const environmentShell=new THREE.Mesh(new THREE.SphereGeometry(100,64,32),new THREE.ShaderMaterial({
    side:THREE.BackSide,
    uniforms:{clouds:{value:cloudMap},meadow:{value:grassMap}},
    vertexShader:`varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec3 direction;uniform sampler2D clouds,meadow;
      void main(){
        vec3 d=normalize(direction);
        float west=1.-smoothstep(-.85,.55,d.x);
        vec3 horizon=mix(vec3(.06,.12,.28),vec3(2.4,.95,.34),west);
        vec3 zenith=mix(vec3(.09,.19,.43),vec3(.55,.72,.68),west);
        vec3 sky=mix(horizon,zenith,smoothstep(.02,.8,d.y));
        float cloudBands=.75+.25*sin(d.y*35.+sin(d.x*8.)*2.);
        sky*=cloudBands;
        vec3 earth=mix(vec3(.035,.065,.042),vec3(.28,.29,.09),west);
        float u=fract(atan(d.x,d.z)/6.2831853+.43);
        vec4 cloudPaint=texture2D(clouds,vec2(u,.34+.66*max(d.y,0.)));
        vec4 grassPaint=texture2D(meadow,vec2(u,.24+.23*min(d.y,0.)));
        sky=mix(sky,cloudPaint.rgb*1.9,cloudPaint.a*.8);
        earth=mix(earth,grassPaint.rgb*.65,grassPaint.a);
        vec3 radiance=mix(earth,sky,smoothstep(-.035,.02,d.y));
        vec3 sunDirection=normalize(vec3(-.75,.25,.6));
        float sun=pow(max(0.,dot(d,sunDirection)),180.);
        radiance+=vec3(18.,10.,4.)*sun;
        radiance+=vec3(.25,.45,.95)*pow(max(0.,dot(d,normalize(vec3(.8,.3,.4)))),24.);
        gl_FragColor=vec4(radiance,1.);
      }`
  }));
  reflectionScene.add(environmentShell);
  const pmrem=new THREE.PMREMGenerator(renderer);
  const environment=pmrem.fromScene(reflectionScene,.025,.1,200);
  pmrem.dispose();environmentShell.geometry.dispose();environmentShell.material.dispose();

  const chrome=new THREE.MeshPhysicalMaterial({
    color:'#edf0f4',metalness:1,roughness:.09,
    envMap:environment.texture,envMapIntensity:1.15,
    clearcoat:.35,clearcoatRoughness:.1,
    clippingPlanes:[new THREE.Plane(new THREE.Vector3(0,1,0),.4)]
  });
  const logo=new THREE.Mesh(geometry,chrome);
  logo.name='Chrome company logo — eight openings';
  logo.position.set(0,5.35,-30);
  logo.rotation.set(.015,-.23,-.025);
  scene.add(logo);

  const sun=new THREE.DirectionalLight('#ffd2a0',3.6);
  sun.position.set(-28,24,12);sun.target.position.copy(logo.position);
  const blueFill=new THREE.DirectionalLight('#88afff',1.9);
  blueFill.position.set(25,12,4);blueFill.target.position.copy(logo.position);
  const rim=new THREE.DirectionalLight('#ff9567',4.5);
  rim.position.set(-18,14,-50);rim.target.position.copy(logo.position);
  scene.add(sun,sun.target,blueFill,blueFill.target,rim,rim.target);

  return {scene,logo,environment};
}


