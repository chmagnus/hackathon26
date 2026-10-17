/**
 * Procedural planet shader, ported from the prototype (algoverse2.html). No image textures:
 * simplex noise + fbm build the surface, a fresnel shell adds the atmosphere.
 * uType: 0 = ocean world, 1 = gas giant, 2 = ice giant, 3 = rocky desert.
 */
import * as THREE from 'three'

const color = (css: string) => new THREE.Color(css)

export const NOISE_GLSL = `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
 const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
 vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
 vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
 vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
 i=mod289(i);
 vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
 float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
 vec4 j=p-49.0*floor(p*ns.z*ns.z);
 vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
 vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
 vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
 vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
 vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
 vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
 vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
 p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
 vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
 return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float fbm(vec3 p){float f=0.0,a=0.5;for(int i=0;i<5;i++){f+=a*snoise(p);p*=2.03;a*=0.5;}return f;}
`

export const PVERT = `varying vec3 vObj;varying vec3 vN;varying vec3 vW;
void main(){vObj=position;vec4 w=modelMatrix*vec4(position,1.0);vW=w.xyz;vN=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*w;}`

export const PFRAG = `uniform float uType;uniform float uT;uniform float uSeed;uniform vec3 uLight;uniform vec3 uA;uniform vec3 uB;uniform vec3 uC;uniform vec3 uD;uniform vec3 uCity;uniform vec3 uAtm;
varying vec3 vObj;varying vec3 vN;varying vec3 vW;
${NOISE_GLSL}
void main(){
 vec3 p=normalize(vObj); vec3 N=normalize(vN); vec3 L=normalize(uLight-vW); vec3 V=normalize(cameraPosition-vW);
 float ndl=dot(N,L);
 vec3 col; float spec=0.0; vec3 night=vec3(0.0); float cloud=0.0;
 if(uType<0.5){
   float h=fbm(p*1.8+uSeed);
   float land=smoothstep(0.02,0.08,h);
   vec3 ocean=mix(uA,uB,smoothstep(-0.45,0.05,h));
   vec3 ground=mix(uC,uD,smoothstep(0.08,0.55,h+0.15*snoise(p*8.0)));
   col=mix(ocean,ground,land);
   float ice=smoothstep(0.78,0.86,abs(p.y)+0.06*snoise(p*6.0)); col=mix(col,vec3(0.92,0.96,1.0),ice);
   vec3 R=reflect(-L,N); spec=pow(max(dot(R,V),0.0),36.0)*(1.0-land)*0.75;
   float city=smoothstep(0.72,0.92,snoise(p*18.0+uSeed)*0.5+0.5)*smoothstep(0.1,0.3,h)*(1.0-ice);
   night=uCity*city*(1.0-smoothstep(-0.15,0.1,ndl))*0.9;
   cloud=smoothstep(0.08,0.6,fbm(p*2.6+vec3(uT*0.012,0.0,uT*0.008)+uSeed*2.0));
 } else if(uType<1.5){
   float warp=fbm(p*vec3(2.0,6.0,2.0)+vec3(uT*0.01,0.0,0.0)+uSeed);
   float b=sin(p.y*14.0+warp*3.0)*0.5+0.5; float b2=sin(p.y*31.0+warp*5.0)*0.5+0.5;
   col=mix(uA,uB,b); col=mix(col,uC,b2*0.45);
   vec3 sc=normalize(vec3(0.6,-0.25,0.75)); float d=distance(p,sc);
   float spot=1.0-smoothstep(0.08,0.2,d+0.04*snoise(p*12.0+uT*0.05));
   col=mix(col,uD,spot*0.85);
 } else if(uType<2.5){
   float warp=fbm(p*vec3(1.5,5.0,1.5)+uSeed+vec3(uT*0.008,0.0,0.0));
   float b=sin(p.y*9.0+warp*2.0)*0.5+0.5;
   col=mix(uA,uB,b*0.6+0.2); col=mix(col,uC,smoothstep(0.55,0.9,warp*0.5+0.5)*0.5);
   vec3 sc=normalize(vec3(-0.5,0.3,0.8)); float spot=1.0-smoothstep(0.06,0.14,distance(p,sc)); col=mix(col,uD,spot*0.7);
 } else {
   float h=fbm(p*2.4+uSeed); float r=fbm(p*9.0-uSeed)*0.5;
   col=mix(uA,uB,smoothstep(-0.5,0.5,h+r)); col=mix(col,uC,smoothstep(0.35,0.7,h)*0.6);
   float c=smoothstep(0.62,0.7,snoise(p*7.0+3.0)*0.5+0.5); col=mix(col,uD,c*0.6);
   float ice=smoothstep(0.88,0.93,abs(p.y)); col=mix(col,vec3(0.95,0.93,0.9),ice);
 }
 float wrap=clamp((ndl+0.12)/1.12,0.0,1.0);
 vec3 lit=col*(0.05+1.1*wrap);
 lit=mix(lit,vec3(1.0)*(0.07+1.0*wrap),cloud*0.8);
 lit+=spec*vec3(1.0,0.95,0.85);
 lit+=night*(1.0-cloud*0.8);
 float fres=pow(1.0-max(dot(N,V),0.0),3.0);
 lit+=uAtm*fres*(0.1+0.9*smoothstep(-0.2,0.5,ndl));
 gl_FragColor=vec4(lit,1.0);
}`

export const AFRAG = `uniform vec3 uLight;uniform vec3 uAtm;varying vec3 vObj;varying vec3 vN;varying vec3 vW;
void main(){vec3 N=normalize(vN);vec3 V=normalize(cameraPosition-vW);vec3 L=normalize(uLight-vW);
 float f=pow(1.0-max(dot(N,V),0.0),2.4);float day=smoothstep(-0.35,0.6,dot(N,L));
 gl_FragColor=vec4(uAtm*f*(0.15+day)*1.2,1.0);}`

export interface PlanetShade {
  type: number
  seed: number
  A: string
  B: string
  C: string
  D: string
  city: string
  atm: string
}

/** PSHADE[0] in the prototype: the blockchain ocean world. */
export const BLOCKCHAIN_SHADE: PlanetShade = { type: 0, seed: 1.7, A: '#05223a', B: '#0f6f7a', C: '#2f8f6a', D: '#c9e4b0', city: '#6ff2c5', atm: '#7fe6ff' }

/** Surface material, lit from `lightPos` (a world position). */
export function planetMaterial(shade: PlanetShade, lightPos: THREE.Vector3) {
  return new THREE.ShaderMaterial({
    vertexShader: PVERT,
    fragmentShader: PFRAG,
    uniforms: {
      uType: { value: shade.type }, uT: { value: 0 }, uSeed: { value: shade.seed }, uLight: { value: lightPos.clone() },
      uA: { value: color(shade.A) }, uB: { value: color(shade.B) }, uC: { value: color(shade.C) }, uD: { value: color(shade.D) },
      uCity: { value: color(shade.city) }, uAtm: { value: color(shade.atm) },
    },
  })
}

/** Glowing atmosphere shell, drawn on a sphere slightly bigger than the planet. */
export function atmosphereMaterial(shade: PlanetShade, lightPos: THREE.Vector3) {
  return new THREE.ShaderMaterial({
    vertexShader: PVERT,
    fragmentShader: AFRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uLight: { value: lightPos.clone() }, uAtm: { value: color(shade.atm) } },
  })
}
