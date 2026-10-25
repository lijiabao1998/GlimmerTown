/* Pure projected-face visibility, used only by the P04 transfer overlay.
 * Screen vertices retain native world height: [screenX, screenY, worldZ].
 * At one isometric viewing ray, larger worldZ is nearer the camera.
 */
(function(root,factory){const api=factory();root.PortTransferOcclusion=api;if(typeof module==='object'&&module.exports)module.exports=api;})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const EPS=1e-7;
 function area(poly){let n=0;for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];n+=a[0]*b[1]-b[0]*a[1];}return n/2;}
 function plane(poly){for(let i=1;i<poly.length-1;i++){const[a,b,c]=[poly[0],poly[i],poly[i+1]],d=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);if(Math.abs(d)<EPS)continue;const x=((b[2]-a[2])*(c[1]-a[1])-(c[2]-a[2])*(b[1]-a[1]))/d,y=((b[0]-a[0])*(c[2]-a[2])-(c[0]-a[0])*(b[2]-a[2]))/d;return[x,y,a[2]-x*a[0]-y*a[1]];}return null;}
 function prepare(points,project){if(points&&points.polygon&&'plane'in points)return points;const polygon=project?points.map(p=>project(...p)):points.map(p=>[p[0],p[1],p[2]]),p=plane(polygon);return{polygon,plane:p,bounds:{x0:Math.min(...polygon.map(p=>p[0])),x1:Math.max(...polygon.map(p=>p[0])),y0:Math.min(...polygon.map(p=>p[1])),y1:Math.max(...polygon.map(p=>p[1]))},area:Math.abs(area(polygon))};}
 function zAt(face,x,y){const p=face.plane;return p[0]*x+p[1]*y+p[2];}
 function clipHalfPlane(poly,a,b,c,epsilon=EPS){const out=[];if(!poly.length)return out;let prev=poly.at(-1),pv=a*prev[0]+b*prev[1]+c,pi=pv>=-epsilon;for(const cur of poly){const cv=a*cur[0]+b*cur[1]+c,ci=cv>=-epsilon;if(ci!==pi){const t=pv/(pv-cv);out.push([prev[0]+t*(cur[0]-prev[0]),prev[1]+t*(cur[1]-prev[1])]);}if(ci)out.push([cur[0],cur[1]]);prev=cur;pv=cv;pi=ci;}return out;}
 function edgePlanes(poly){const sign=area(poly)>=0?1:-1;return poly.map((p,i)=>{const q=poly[(i+1)%poly.length],a=-(q[1]-p[1])*sign,b=(q[0]-p[0])*sign;return[a,b,-a*p[0]-b*p[1]];});}
 function intersection(subject,clip){let out=subject.map(p=>[p[0],p[1]]);for(const p of edgePlanes(clip)){out=clipHalfPlane(out,...p);if(out.length<3)return[];}return Math.abs(area(out))>EPS?out:[];}
 function boundsOverlap(a,b){return a.x0<b.x1-EPS&&a.x1>b.x0+EPS&&a.y0<b.y1-EPS&&a.y1>b.y0+EPS;}
 function occlusionMasks(cargoFaceScreen3d,otherFacesScreen3d){const cargo=prepare(cargoFaceScreen3d),out=[];if(!cargo.plane||cargo.area<EPS)return out;for(const other of otherFacesScreen3d){const o=prepare(other);if(!o.plane||o.area<EPS||!boundsOverlap(cargo.bounds,o.bounds))continue;let poly=intersection(cargo.polygon,o.polygon);if(!poly.length)continue;const a=o.plane[0]-cargo.plane[0],b=o.plane[1]-cargo.plane[1],c=o.plane[2]-cargo.plane[2]-EPS;poly=clipHalfPlane(poly,a,b,c,0);if(poly.length>=3&&Math.abs(area(poly))>EPS)out.push(poly);}return out;}
 // Exact difference of convex polygons as disjoint convex pieces. Successive
 // differences subtract the UNION of masks, never their even-odd XOR.
 function difference(subject,clip){let inside=subject.map(p=>[p[0],p[1]]);const outside=[];for(const[a,b,c]of edgePlanes(clip)){const piece=clipHalfPlane(inside,-a,-b,-c,0);if(piece.length>=3&&Math.abs(area(piece))>EPS)outside.push(piece);inside=clipHalfPlane(inside,a,b,c,0);if(inside.length<3||Math.abs(area(inside))<=EPS)break;}return outside;}
 function subtractMasks(cargo,masks){if(!cargo.plane||cargo.area<EPS)return[];let pieces=[cargo.polygon.map(p=>[p[0],p[1]])];for(const mask of masks){pieces=pieces.flatMap(piece=>difference(piece,mask));if(!pieces.length)break;}return pieces.map(poly=>poly.map(([x,y])=>[x,y,zAt(cargo,x,y)]));}
 function visible(cargoFaceScreen3d,otherFacesScreen3d){const cargo=prepare(cargoFaceScreen3d);return subtractMasks(cargo,occlusionMasks(cargo,otherFacesScreen3d));}
 // Create once per rendered frame. Equivalent opaque/rgba paths reuse results.
 function createCache(occluders){const others=occluders.map(p=>prepare(p)),cache=new Map();function get(points){const f=prepare(points),key=f.polygon.map(p=>p.join(',')).join(';');if(!cache.has(key))cache.set(key,{face:f,masks:occlusionMasks(f,others)});return cache.get(key);}return{occluders:others,masks(points){return get(points).masks;},visible(points){const r=get(points);if(!r.visible)r.visible=subtractMasks(r.face,r.masks);return r.visible;},get size(){return cache.size;}};}
 function batch(cargoFaces,occluders){const others=occluders.map(p=>prepare(p));return cargoFaces.map(p=>{const face=prepare(p);return{face,polygons:visible(face,others)};});}
 return{EPS,area,plane,prepare,zAt,clipHalfPlane,intersection,difference,occlusionMasks,visible,batch,createCache};
});
