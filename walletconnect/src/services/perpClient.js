// Perp backend integration service
// Uses REST endpoints exposed by ai agent server (see server/index.ts)

export async function getMark(pair=1){
  const r= await fetch(`/api/perp/mark?pair=${pair}`);
  if(!r.ok) throw new Error('mark failed');
  return r.json();
}
export async function getPosition(user, pair=1){
  const r= await fetch(`/api/perp/position?user=${encodeURIComponent(user)}&pair=${pair}`);
  if(!r.ok) throw new Error('position failed');
  return r.json();
}
export async function openPosition({user,pairId=1,size,side,lev_bps,margin}){
  const r= await fetch('/api/perp/open',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user,pairId,size,side,lev_bps,margin})});
  if(!r.ok) { let m='open failed'; try{ const j=await r.json(); m=j.error||m;}catch(_){} throw new Error(m); }
  return r.json();
}
export async function closePosition({user,pairId=1,size}){
  const r= await fetch('/api/perp/close',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user,pairId,size})});
  if(!r.ok){ let m='close failed'; try{ const j=await r.json(); m=j.error||m;}catch(_){} throw new Error(m);} 
  return r.json();
}
