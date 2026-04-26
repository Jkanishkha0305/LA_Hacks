import * as lumaCore from '@luma.gl/core';
import * as lumaWebGL from '@luma.gl/webgl';

console.log('Luma Core Exports:', Object.keys(lumaCore));
console.log('Luma WebGL Exports:', Object.keys(lumaWebGL));

if ((lumaCore as any).luma) {
  console.log('luma object found in core');
  const luma = (lumaCore as any).luma;
  console.log('luma methods:', Object.keys(luma));
}
