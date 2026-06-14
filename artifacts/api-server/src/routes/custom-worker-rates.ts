import { Router } from 'express'
  import { dispatchPushIndividual } from '../lib/push-dispatch'

  /*
    RUN ONCE in Supabase SQL Editor before using this feature:
    ─────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS custom_worker_rates (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id text NOT NULL,
      app_name text NOT NULL,
      nombre_en_app text,
      efectivo_rate numeric(10,2) NOT NULL DEFAULT 0,
      transferencia_rate numeric(10,2) NOT NULL DEFAULT 0,
      updated_at timestamptz DEFAULT now(),
      UNIQUE(user_id, app_name)
    );
    ─────────────────────────────────────────────────────────
  */

  const SB  = process.env.SUPABASE_URL ?? ''
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  function h(extra: Record<string,string> = {}) {
    return { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', ...extra }
  }
  async function sbGet(path: string): Promise<any[]> {
    const r = await fetch(`${SB}/rest/v1/${path}`, { headers: h() })
    if (!r.ok) {
      const t = await r.text()
      if (t.includes('42P01')) throw Object.assign(new Error(t), { code: '42P01' })
      throw new Error(`SB GET ${r.status}: ${t}`)
    }
    return r.json()
  }
  async function sbPost(path: string, body: object, prefer = 'return=minimal') {
    const r = await fetch(`${SB}/rest/v1/${path}`, { method: 'POST', headers: h({ Prefer: prefer }), body: JSON.stringify(body) })
    if (!r.ok) {
      const t = await r.text()
      if (t.includes('42P01')) throw Object.assign(new Error(t), { code: '42P01' })
      throw new Error(`SB POST ${r.status}: ${t}`)
    }
    return prefer.includes('representation') ? r.json() : { ok: true }
  }
  async function sbPatch(path: string, body: object) {
    const r = await fetch(`${SB}/rest/v1/${path}`, { method: 'PATCH', headers: h({ Prefer: 'return=minimal' }), body: JSON.stringify(body) })
    if (!r.ok) throw new Error(`SB PATCH ${r.status}: ${await r.text()}`)
    return { ok: true }
  }

  const router = Router()

  // GET /admin/custom-worker-rates
  router.get('/admin/custom-worker-rates', async (req, res) => {
    const { app_name } = req.query as { app_name?: string }
    try {
      const filter = app_name ? `app_name=eq.${encodeURIComponent(app_name)}&` : ''
      const rates = await sbGet(`custom_worker_rates?${filter}select=*&order=app_name.asc,nombre_en_app.asc`)
      res.json({ rates })
    } catch (e: any) {
      if (e.code === '42P01') { res.json({ rates: [], setup_needed: true }); return }
      res.status(500).json({ error: String(e) })
    }
  })

  // POST /admin/custom-worker-rates
  router.post('/admin/custom-worker-rates', async (req, res) => {
    const { user_id, app_name, nombre_en_app, efectivo_rate, transferencia_rate } = req.body as {
      user_id: string; app_name: string; nombre_en_app?: string
      efectivo_rate: number; transferencia_rate: number
    }
    if (!user_id || !app_name) { res.status(400).json({ error: 'user_id y app_name requeridos' }); return }
    try {
      const ef = Number(efectivo_rate) || 0
      const tr = Number(transferencia_rate) || 0
      await sbPost('custom_worker_rates?on_conflict=user_id,app_name', {
        user_id, app_name, nombre_en_app: nombre_en_app ?? null,
        efectivo_rate: ef, transferencia_rate: tr, updated_at: new Date().toISOString(),
      }, 'resolution=merge-duplicates,return=minimal')
      // Update published_salaries.extras only for the CURRENT active semana (not all historical records)
        const activeNomina = await sbGet(`nomina_history?app_name=eq.${encodeURIComponent(app_name)}&published=eq.true&select=semana&order=created_at.desc&limit=1`).catch(() => [])
        const activeSemana = (activeNomina[0] as any)?.semana as string | undefined
        const salarFilter = activeSemana
          ? `published_salaries?user_id=eq.${encodeURIComponent(user_id)}&app_name=eq.${encodeURIComponent(app_name)}&semana=eq.${encodeURIComponent(activeSemana)}&select=id,extras`
          : `published_salaries?user_id=eq.${encodeURIComponent(user_id)}&app_name=eq.${encodeURIComponent(app_name)}&order=created_at.desc&limit=10&select=id,extras`
        const salaries = await sbGet(salarFilter)
        await Promise.all(salaries.map((s: any) =>
          sbPatch(`published_salaries?id=eq.${s.id}`, { extras: { ...(s.extras ?? {}), cup_efectivo_rate: ef, cup_transferencia_rate: tr } })
        ))
        // Notify the worker (fire-and-forget)
      if (ef > 0 || tr > 0) {
        setImmediate(() => {
          dispatchPushIndividual([{ userId: user_id, title: '💱 Cambio personalizado actualizado', body: 'Tu tipo de cambio exclusivo ha sido actualizado. Entra a ver tu salario.', url: '/salarios' }]).catch(() => {})
        })
      }
      res.json({ ok: true, updated_salaries: salaries.length })
    } catch (e: any) {
      if (e.code === '42P01') { res.status(503).json({ error: 'Tabla no creada. Ejecuta el SQL de setup primero.', setup_needed: true }); return }
      res.status(500).json({ error: String(e) })
    }
  })

  // DELETE /admin/custom-worker-rates?user_id=...&app_name=...
  router.delete('/admin/custom-worker-rates', async (req, res) => {
    const { user_id, app_name } = req.query as { user_id?: string; app_name?: string }
    if (!user_id || !app_name) { res.status(400).json({ error: 'user_id y app_name requeridos' }); return }
    try {
      await fetch(`${SB}/rest/v1/custom_worker_rates?user_id=eq.${encodeURIComponent(user_id)}&app_name=eq.${encodeURIComponent(app_name)}`, {
        method: 'DELETE', headers: h()
      })
      // Clear cup rates from published_salaries.extras
      const salaries = await sbGet(`published_salaries?user_id=eq.${encodeURIComponent(user_id)}&app_name=eq.${encodeURIComponent(app_name)}&select=id,extras`)
      await Promise.all(salaries.map((s: any) => {
        const { cup_efectivo_rate: _a, cup_transferencia_rate: _b, ...rest } = s.extras ?? {}
        return sbPatch(`published_salaries?id=eq.${s.id}`, { extras: Object.keys(rest).length ? rest : null })
      }))
      // Notify the worker their custom rate was removed (fire-and-forget)
        setImmediate(() => {
          dispatchPushIndividual([{
            userId: user_id as string,
            title: '💱 Tasa personalizada eliminada',
            body: 'Tu tipo de cambio exclusivo fue eliminado. Ahora aplica el cambio general.',
            url: '/salarios'
          }]).catch(() => {})
        })
        res.json({ ok: true })
      } catch (e: any) {
        if (e.code === '42P01') { res.json({ ok: true }); return }
      res.status(500).json({ error: String(e) })
    }
  })

  export default router
  