// Botão "Captar Zinkra" para a barra de favoritos do Chrome.
// Roda na página de resultados do Google Maps aberta agora: rola a lista para carregar tudo,
// clica em cada card para ler o telefone, o site e o bairro do painel do estabelecimento
// (a view de lista não mostra telefone, só o painel mostra), volta e passa para o próximo.
// No fim entrega no formato da importação do ERP. Não guarda nada entre buscas.
function captar() {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const NOT_SITE = /(instagram\.com|facebook\.com|fb\.com|linktr\.ee|wa\.me|whatsapp|bio\.link|beacons\.ai|taplink|doctoralia|ifood|tiktok|youtube|linkedin|google\.|gstatic|goo\.gl)/i
  const clean = (s) => String(s || '').replace(/[\t\r\n]+/g, ' ').trim() || '-'
  const box = (html) => {
    let d = document.getElementById('zk-cap')
    if (!d) { d = document.createElement('div'); d.id = 'zk-cap'; document.body.appendChild(d) }
    d.style.cssText = 'position:fixed;z-index:2147483647;right:16px;top:16px;width:360px;max-width:calc(100vw - 32px);background:#0A0C0B;color:#E8ECE9;border:1px solid #15C45A;border-radius:14px;padding:16px;font:14px/1.45 system-ui,sans-serif;box-shadow:0 20px 50px rgba(0,0,0,.45)'
    d.innerHTML = html
    return d
  }
  // extrai telefone do aria-label do botão ("Telefone: (11) 98765-4321 ") ou do data-item-id ("phone:tel:011987654321")
  const phoneFromPanel = () => {
    const b = document.querySelector('button[data-item-id^="phone:"]')
    if (!b) return ''
    const aria = b.getAttribute('aria-label') || ''
    const m = aria.match(/(\+?55\s?)?\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4}/)
    if (m) return m[0].trim()
    const di = b.getAttribute('data-item-id') || ''
    const raw = (di.split(':').pop() || '').replace(/\D/g, '').replace(/^0+/, '')
    if (raw.length >= 10) {
      const ddd = raw.slice(0, 2)
      const rest = raw.slice(2)
      return `(${ddd}) ${rest.slice(0, -4)}-${rest.slice(-4)}`
    }
    return ''
  }
  const siteFromPanel = () => {
    const a = document.querySelector('a[data-item-id="authority"]') || document.querySelector('[data-item-id="authority"] a')
    const href = a?.getAttribute('href') || ''
    if (!href || NOT_SITE.test(href)) return ''
    return href
  }
  const hoodFromPanel = () => {
    const el = document.querySelector('button[data-item-id="address"]') || document.querySelector('[data-item-id="address"]')
    const addr = el?.getAttribute('aria-label') || ''
    // "Endereço: R. Canário, 1186 - Moema, São Paulo - SP, 04521-005"
    const m = addr.match(/\s-\s([^,-]+?),\s*[^,]+?\s*-\s*[A-Z]{2}/)
    return m ? m[1].trim() : ''
  }
  const voltarParaLista = async () => {
    const back = document.querySelector('button[jsaction*="pane.back"]')
      || document.querySelector('button[aria-label^="Voltar"]')
      || document.querySelector('button[aria-label^="Back"]')
    if (back) { back.click(); return }
    history.back()
  }

  const run = async () => {
    const feed = document.querySelector('div[role="feed"]')
    if (!feed) {
      box('<b>Captar Zinkra</b><p style="margin:8px 0 0">Abra uma busca no Google Maps (a lista de resultados do lado esquerdo) e clique de novo no botão.</p><button id="zk-x" style="margin-top:10px;background:#15C45A;color:#04130A;border:0;border-radius:8px;padding:8px 12px;font-weight:600;cursor:pointer">Fechar</button>')
      document.getElementById('zk-x').onclick = () => document.getElementById('zk-cap').remove()
      return
    }
    box('<b>Captar Zinkra</b><p style="margin:8px 0 0">Rolando a lista para carregar todos os resultados…</p>')
    let last = 0
    for (let i = 0; i < 25; i++) {
      feed.scrollTop = feed.scrollHeight
      await sleep(1300)
      const n = feed.querySelectorAll('div[role="article"]').length
      if (/final da lista|end of the list/i.test(feed.innerText) || (n === last && i > 2)) break
      last = n
    }
    feed.scrollTop = 0
    await sleep(500)
    const fromUrl = decodeURIComponent((location.pathname.split('/search/')[1] || '').split('/')[0].replace(/\+/g, ' '))
    const where = fromUrl || (document.querySelector('#searchboxinput') || {}).value || ''
    const total = document.querySelectorAll('div[role="feed"] div[role="article"]').length
    const stored = []
    const seen = new Set()
    let added = 0
    for (let i = 0; i < total; i++) {
      box(`<b>Captar Zinkra</b>
        <p style="margin:8px 0 2px">Lendo <b style="color:#15C45A">${i + 1}</b> de ${total}…</p>
        <p style="margin:0;color:#8A938E;font-size:12.5px">O botão abre cada card para ler o telefone. Deixe esta aba na frente.</p>`)
      const atuais = [...document.querySelectorAll('div[role="feed"] div[role="article"]')]
      const a = atuais[i]
      if (!a) continue
      const link = a.querySelector('a[href*="/maps/place/"]')
      const rawName = (link && link.getAttribute('aria-label')) || a.getAttribute('aria-label') || ''
      // tira sufixos tipo "·Link acessado" que o Chrome marca em links já clicados
      const company = rawName.replace(/\s*[·•]\s*Link acessado\s*$/i, '').replace(/\s*[·•]\s*Visited link\s*$/i, '').trim()
      if (!company || /fechado permanentemente|permanently closed|fechado temporariamente/i.test(a.innerText || '')) continue
      let site = [...a.querySelectorAll('a[href^="http"]')].map((x) => x.href).find((h) => !NOT_SITE.test(h)) || ''
      let hood = ''
      let phone = ''
      if (link) {
        // nome esperado para a gente saber que o painel JÁ é desta empresa (primeiras letras)
        const esperado = company.toLowerCase().slice(0, 6)
        link.click()
        // espera o h1 do painel aparecer e bater com o nome que a gente clicou (até 7 s)
        let paineOk = false
        for (let t = 0; t < 35; t++) {
          await sleep(200)
          const h1 = document.querySelector('h1.DUwDvf')
          const nomePainel = (h1?.innerText || '').toLowerCase()
          if (h1 && document.querySelector('[data-item-id="address"]') && (!esperado || nomePainel.startsWith(esperado))) { paineOk = true; break }
        }
        if (paineOk) {
          await sleep(200)
          phone = phoneFromPanel()
          site = siteFromPanel() || site
          hood = hoodFromPanel()
        }
        await voltarParaLista()
        // espera a lista reaparecer E o scroll voltar para o card atual (até 5 s)
        for (let t = 0; t < 25; t++) {
          await sleep(200)
          if (document.querySelectorAll('div[role="feed"] div[role="article"]').length) break
        }
        await sleep(200)
      }
      const ig = site && (site.match(/instagram\.com\/([A-Za-z0-9._]+)/i) || [])[1]
      const key = (company + '|' + phone).toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      stored.push({ company, phone, instagram: ig ? '@' + ig : '', site: site && !NOT_SITE.test(site) ? 'Sim' : 'Não', hood, where })
      added++
    }
    if (!added) stored.push({ company: 'SEM RESULTADOS', phone: '', instagram: '', site: '', hood: '', where })
    const comTel = stored.filter((r) => r.phone).length
    const tsv = ['Empresa\tTelefone/WhatsApp\tInstagram\tSite atual?\tBairro\tOnde achei']
      .concat(stored.map((r) => [r.company, r.phone, r.instagram, r.site, r.hood, r.where].map(clean).join('\t'))).join('\n')
    const d = box(`<b>Captar Zinkra</b>
      <p style="margin:8px 0 2px"><b style="color:#15C45A">${added}</b> resultado(s) · ${comTel} com telefone</p>
      <p style="margin:0 0 10px;color:#8A938E;font-size:12.5px">${where.replace(/</g, '&lt;')}</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button id="zk-c" style="background:#15C45A;color:#04130A;border:0;border-radius:8px;padding:8px 12px;font-weight:600;cursor:pointer">Copiar</button>
        <button id="zk-x" style="background:transparent;color:#8A938E;border:0;padding:8px;cursor:pointer">Fechar</button>
      </div>
      <p style="margin:10px 0 0;color:#8A938E;font-size:12.5px">Cole em Captação → Importar. Pode colar uma busca de cada vez: ele vai somando.</p>
      <textarea id="zk-t" readonly style="margin-top:10px;width:100%;height:90px;background:#111;color:#cfd;border:1px solid #222;border-radius:8px;font:11px monospace"></textarea>`)
    d.querySelector('#zk-t').value = tsv
    d.querySelector('#zk-c').onclick = async () => {
      const t = d.querySelector('#zk-t')
      try { await navigator.clipboard.writeText(tsv) } catch { t.select(); document.execCommand('copy') }
      d.querySelector('#zk-c').textContent = 'Copiado!'
    }
    d.querySelector('#zk-x').onclick = () => d.remove()
  }
  run()
}

export const BOOKMARKLET = "javascript:" + encodeURIComponent("(" + captar.toString() + ")()")
