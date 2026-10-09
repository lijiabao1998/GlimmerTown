'use strict';
// Explicit, scenario-bound user acceptance. No global pixel tolerance.
const same=(a,b)=>Array.isArray(a)&&a.length===b.length&&a.every((v,i)=>v===b[i]);
function classify({zoom,index,width,height,pixelDelta:p,layerEvidence:l,controlsExact}) {
  if(!controlsExact)return 'control-failure';
  if(!p.pixels&&l.available&&!l.pixels)return 'exact';
  const known=zoom===1&&index===55&&width===1400&&height===900&&p.pixels===3&&p.maxChannelDelta===1&&!p.truncated&&p.points?.length===3&&p.points.every((q,i)=>q.x===833+i&&q.y===254&&same(q.original,[92,168,94,255])&&same(q.candidate,[92,168,93,255]));
  const associated=l.available&&l.mappingExact===true&&l.pixels===3&&l.maxChannelDelta<=2&&!l.truncated&&l.points?.length===3&&l.points.every((q,i)=>q.x===833+i&&q.y===254);
  if(known&&associated)return 'approved-known-visible-defect';
  if(l.available&&!p.truncated&&!l.truncated&&p.pixels<=3&&p.maxChannelDelta<=1&&l.pixels<=3&&l.maxChannelDelta<=2)return 'tiny-unapproved';
  return 'material-or-unsupported';
}
module.exports={classify};
