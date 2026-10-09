(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.TownOrder608=api;})(typeof globalThis==='object'?globalThis:this,function(){'use strict';
const allocation='const n=items.length,next=Array.from({length:n},()=>[]),degree=new Uint32Array(n),used=new Uint8Array(n),ready=[],out=[];';
function create(original,{maxNodes=2048,maxRetainedEdges=262144}={}){
 if(typeof original!=='function'||!Number.isInteger(maxNodes)||maxNodes<0||!Number.isInteger(maxRetainedEdges)||maxRetainedEdges<0)throw Error('Invalid order pool options');
 const source=Function.prototype.toString.call(original);if(source.split(allocation).length!==2)throw Error('Original topology source allocation boundary drift');
 const body=source.slice(source.indexOf('{')+1,source.lastIndexOf('}')).replace(allocation,'const n=items.length,next=lease.next,degree=lease.degree,used=lease.used,ready=lease.ready,out=[];');
 const execute=new Function('lease','items','sparse',body);let lease=null,busy=false,disposed=false;
 const stats={calls:0,pooled:0,fallbacks:0,growths:0,discards:0,capacity:0,retainedEdges:0};
 function order(items,sparse=false){stats.calls++;const n=items.length;if(disposed||busy||!Number.isInteger(n)||n<0||n>maxNodes){stats.fallbacks++;return original(items,sparse);}busy=true;
  try{if(!lease||lease.degree.length<n){const size=Math.min(maxNodes,Math.max(n,lease?lease.degree.length*2:16));lease={next:Array.from({length:size},()=>[]),degree:new Uint32Array(size),used:new Uint8Array(size),ready:[]};stats.growths++;stats.capacity=size;}
   for(const row of lease.next)row.length=0;lease.degree.fill(0);lease.used.fill(0);lease.ready.length=0;stats.pooled++;return execute(lease,items,sparse);
  }finally{if(lease){let edges=0;for(const row of lease.next)edges+=row.length;stats.retainedEdges=edges;if(edges>maxRetainedEdges){lease=null;stats.discards++;stats.capacity=0;stats.retainedEdges=0;}}busy=false;}
 }
 return {order,stats:()=>({...stats}),dispose:()=>{disposed=true;lease=null;stats.capacity=0;stats.retainedEdges=0;}};
}
return {create};
});
