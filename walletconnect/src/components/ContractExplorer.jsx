import { useState, useEffect } from 'react'
import { MODULES, MODULE_ADDR } from '../config/chain.js'

async function view(functionId, args=[]) {
  const body = { function: functionId, functionArguments: args }
  const r = await fetch('/api/aptos/view', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) })
  if (!r.ok) throw new Error('view failed')
  return r.json()
}

export default function ContractExplorer({ wallet }) {
  const [mark, setMark] = useState(null)
  const [params, setParams] = useState(null)
  const [position, setPosition] = useState(null)
  const [userAddr, setUserAddr] = useState('')
  const [err, setErr] = useState(null)

  const refresh = async () => {
    setErr(null)
    try {
      const m = await view(`${MODULES.perp_core}::get_mark_px`, [MODULE_ADDR, 1])
      setMark(m[0])
      if (userAddr) {
        const p = await view(`${MODULES.perp_core}::get_position`, [MODULE_ADDR, 1, userAddr])
        setPosition(p[0] || null)
      } else setPosition(null)
      const g = await view(`${MODULES.governance}::get_params`, [MODULE_ADDR])
      setParams(g)
    } catch(e){ setErr(e.message) }
  }

  useEffect(()=>{ refresh() }, [])

  return (
    <div className="side-card" style={{marginTop:24}}>
      <h3>Contract Explorer</h3>
      <p style={{fontSize:'11px'}}>Module Addr: {MODULE_ADDR}</p>
      {err && <p style={{color:'#ff6b6b', fontSize:'12px'}}>{err}</p>}
      <div style={{display:'flex', flexDirection:'column', gap:4}}>
        <label style={{fontSize:'11px'}}>User address <input value={userAddr} onChange={e=>setUserAddr(e.target.value)} placeholder='0x...' style={{width:'100%'}} /></label>
        <button className='suggestion-pill' style={{fontSize:'11px'}} onClick={refresh}>Refresh</button>
      </div>
      <div style={{marginTop:8}}>
        <p style={{fontSize:'12px'}}>Mark Px: {mark ?? '—'}</p>
        <p style={{fontSize:'12px'}}>Governance Params: {params ? JSON.stringify(params) : '—'}</p>
        <p style={{fontSize:'12px'}}>Position: {position ? JSON.stringify(position) : 'None'}</p>
      </div>
    </div>
  )
}
