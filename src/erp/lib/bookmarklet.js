// Botão "Captar Zinkra" para a barra de favoritos do Chrome.
// Roda na página de resultados do Google Maps aberta por você: rola a lista, lê o que está na tela
// e junta tudo (de várias buscas) no formato da importação. Nada vai para servidor nenhum.
function captar() {
  const KEY = 'zkCaptacao'
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const NOT_SITE = /(instagram\.com|facebook\.com|fb\.com|linktr\.ee|wa\.me|whatsapp|bio\.link|beacons\.ai|taplink|doctoralia|ifood|tiktok|youtube|linkedin)/i
  const clean = (s) => String(s || '').replace(/[\t\r\n]+/g, ' ').trim() || '-'
  const box = (html) => {
    let d = document.getElementById('zk-cap')
    if (!d) { d = document.createElement('div'); d.id = 'zk-cap'; document.body.appendChild(d) }
    d.style.cssText = 'position:fixed;z-index:2147483647;right:16px;top:16px;width:360px;max-width:calc(100vw - 32px);background:#0A0C0B;color:#E8ECE9;border:1px solid #15C45A;border-radius:14px;padding:16px;font:14px/1.45 system-ui,sans-serif;box-shadow:0 20px 50px rgba(0,0,0,.45)'
    d.innerHTML = html
    return d
  }
  const run = async () => {
    const feed = document.querySelector('div[role="feed"]')
    if (!feed) { box('<b>Captar Zinkra</b><p style="margin:8px 0 0">Abra uma busca no Google Maps (a lista de resultados do lado esquerdo) e clique de novo no botão.</p><button id="zk-x" style="margin-top:10px">Fechar</button>'); document.getElementById('zk-x').onclick = () => document.getElementById('zk-cap').remove(); return }
    box('<b>Captar Zinkra</b><p style="margin:8px 0 0">Rolando a lista para carregar todos os resultados…</p>')
    let last = 0
    for (let i = 0; i < 25; i++) {
      feed.scrollTop = feed.scrollHeight
      await sleep(1300)
      const n = feed.querySelectorAll('div[role="article"]').length
      if (/final da lista|end of the list/i.test(feed.innerText) || (n === last && i > 2)) break
      last = n
    }
    const where = (document.querySelector('#searchboxinput') || {}).value || decodeURIComponent((location.pathname.split('/search/')[1] || '').split('/')[0]).replace(/\+/g, ' ')
    const stored = JSON.parse(localStorage.getItem(KEY) || '[]')
    const seen = new Set(stored.map((r) => (r.company + '|' + r.phone).toLowerCase()))
    let added = 0
    feed.querySelectorAll('div[role="article"]').forEach((a) => {
      const link = a.querySelector('a[href*="/maps/place/"]')
      const company = (link && link.getAttribute('aria-label')) || a.getAttribute('aria-label') || ''
      if (!company) return
      const txt = a.innerText || ''
      if (/fechado permanentemente|permanently closed|fechado temporariamente/i.test(txt)) return
      const m = txt.match(/(\+55\s?)?\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4}/)
      const phone = m ? m[0].trim() : ''
      const site = [...a.querySelectorAll('a[href^="http"]')].map((x) => x.href).find((h) => !/google\.|gstatic|goo\.gl/.test(h)) || ''
      const ig = (site.match(/instagram\.com\/([A-Za-z0-9._]+)/i) || [])[1]
      const key = (company + '|' + phone).toLowerCase()
      if (seen.has(key)) return
      seen.add(key)
      stored.push({ company, phone, instagram: ig ? '@' + ig : '', site: site && !NOT_SITE.test(site) ? 'Sim' : 'Não', where })
      added++
    })
    if (!added && !stored.some((r) => r.where === where)) stored.push({ company: 'SEM RESULTADOS', phone: '', instagram: '', site: '', where })
    localStorage.setItem(KEY, JSON.stringify(stored))
    const tsv = ['Empresa\tTelefone/WhatsApp\tInstagram\tSite atual?\tBairro\tOnde achei']
      .concat(stored.map((r) => [r.company, r.phone, r.instagram, r.site, '', r.where].map(clean).join('\t'))).join('\n')
    const searches = new Set(stored.map((r) => r.where)).size
    const d = box(`<b>Captar Zinkra</b>
      <p style="margin:8px 0 4px"><b style="color:#15C45A">+${added}</b> nesta busca · <b>${stored.filter((r) => r.company !== 'SEM RESULTADOS').length}</b> no total (${searches} busca${searches === 1 ? '' : 's'})</p>
      <p style="margin:0 0 10px;color:#8A938E;font-size:12.5px">Faça as outras buscas e clique de novo. No fim, copie tudo e cole em Captação → Importar.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button id="zk-c" style="background:#15C45A;color:#04130A;border:0;border-radius:8px;padding:8px 12px;font-weight:600;cursor:pointer">Copiar tudo</button>
        <button id="zk-l" style="background:transparent;color:#E8ECE9;border:1px solid #333;border-radius:8px;padding:8px 12px;cursor:pointer">Limpar lista</button>
        <button id="zk-x" style="background:transparent;color:#8A938E;border:0;padding:8px;cursor:pointer">Fechar</button>
      </div>
      <textarea id="zk-t" readonly style="margin-top:10px;width:100%;height:90px;background:#111;color:#cfd;border:1px solid #222;border-radius:8px;font:11px monospace"></textarea>`)
    d.querySelector('#zk-t').value = tsv
    d.querySelector('#zk-c').onclick = async () => {
      const t = d.querySelector('#zk-t')
      try { await navigator.clipboard.writeText(tsv) } catch { t.select(); document.execCommand('copy') }
      d.querySelector('#zk-c').textContent = 'Copiado!'
    }
    d.querySelector('#zk-l').onclick = () => { localStorage.removeItem(KEY); d.remove() }
    d.querySelector('#zk-x').onclick = () => d.remove()
  }
  run()
}

export const BOOKMARKLET = "javascript:" + encodeURIComponent("(" + captar.toString() + ")()")
