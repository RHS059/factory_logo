import * as THREE from './vendor/three.module.js';

// The outer contour and eight holes come from the supplied 400px logo.
export function createLogoGeometry(contours) {
  function smoothLoop(points, ShapeType) {
    const spline=new THREE.CatmullRomCurve3(points.map(([x,y])=>new THREE.Vector3(x,y,0)),true,'centripetal');
    const samples=spline.getPoints(points.length*3);
    const path=new ShapeType();
    path.moveTo(samples[0].x,samples[0].y);
    for(const p of samples.slice(1))path.lineTo(p.x,p.y);
    path.closePath();return path;
  }
  const shape=smoothLoop(contours.outer,THREE.Shape);
  shape.holes=contours.holes.map(loop=>smoothLoop(loop,THREE.Path));
  const geometry=new THREE.ExtrudeGeometry(shape,{
    depth:1.5,steps:1,bevelEnabled:true,bevelThickness:.16,
    bevelSize:.15,bevelSegments:5,curveSegments:12
  });
  geometry.translate(0,0,-.75);
  // A shallow crown gives the front a changing reflection, rather than a
  // uniform grey face. Transform the normals with the surface derivative.
  const p=geometry.attributes.position,n=geometry.attributes.normal;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),nz=n.getZ(i);
    p.setZ(i,p.getZ(i)-.016*(x*x+y*y));
    const normal=new THREE.Vector3(n.getX(i)+.032*x*nz,n.getY(i)+.032*y*nz,nz).normalize();
    n.setXYZ(i,normal.x,normal.y,normal.z);
  }
  geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}

