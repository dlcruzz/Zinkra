import { describe, it, expect } from 'vitest'
import { tierOf, buildNodes, locaisDosNos, filhosDe, subName, splitHood, SATURADO } from './geo'
import { termQuery, matchTerm, analisarImportacao, parseResult, NO_RESULT, fold } from './captacao'

describe('porte da cidade', () => {
  it('pequena, média e grande', () => {
    expect(tierOf(4529)).toMatchObject({ key: 'pequena', dividir: false })
    expect(tierOf(35701)).toMatchObject({ key: 'media', dividir: false })
    expect(tierOf(2_900_000)).toMatchObject({ key: 'grande', dividir: true })
    expect(tierOf(0).key).toBe('desconhecido')
  })
})

describe('bairros em níveis (Wikidata)', () => {
  // Aricanduva (distrito) → Vila Esperança (bairro) → um sub-bairro inventado
  const rows = [
    { l: 'Aricanduva', pl: 'São Paulo', cls: 'distrito da cidade de São Paulo' },
    { l: 'Vila Esperança (bairro de São Paulo)', pl: 'Aricanduva', cls: 'bairro de São Paulo' },
    { l: 'Vila Formosa', pl: 'Aricanduva', cls: 'bairro' },
    { l: 'Jardim Exemplo', pl: 'Vila Esperança', cls: 'bairro' },
    { l: 'Interlagos', pl: '', cls: 'bairro' },
    { l: 'Casarão Tombado', pl: 'Aricanduva', cls: 'património histórico' },
    { l: 'São Paulo', pl: '', cls: 'bairro' },
    { l: 'Parque da Hípica (São Paulo)', pl: '', cls: 'bairro' },
  ]
  const nodes = buildNodes(rows, 'São Paulo')
  it('limpa o nome, tira o que não é bairro e acha o nível de cada um', () => {
    const by = Object.fromEntries(nodes.map((n) => [n.name, n.level]))
    expect(by).toEqual({ Aricanduva: 1, 'Vila Esperança': 2, 'Vila Formosa': 2, 'Jardim Exemplo': 3, Interlagos: 1, 'Parque da Hípica': 1 })
  })
  it('distrito com filhos vira grupo; sub-bairro só aparece depois de aberto', () => {
    const fechado = locaisDosNos(nodes)
    expect(fechado.find((l) => l.neighborhood === 'Aricanduva').region).toBe('Aricanduva')
    expect(fechado.find((l) => l.neighborhood === 'Vila Esperança').region).toBe('Aricanduva')
    expect(fechado.find((l) => l.neighborhood === 'Interlagos').region).toBe('Bairros')
    expect(fechado.some((l) => /Jardim Exemplo/.test(l.neighborhood))).toBe(false)
    const aberto = locaisDosNos(nodes, new Set([fold('Vila Esperança')]))
    expect(aberto.find((l) => /Jardim Exemplo/.test(l.neighborhood))).toMatchObject({ neighborhood: 'Jardim Exemplo (Vila Esperança)', region: 'Dentro de Vila Esperança' })
  })
  it('filhosDe devolve as partes menores de um local', () => {
    expect(filhosDe(nodes, 'Vila Esperança').map((n) => n.name)).toEqual(['Jardim Exemplo'])
    expect(filhosDe(nodes, 'Aricanduva').map((n) => n.name).sort()).toEqual(['Vila Esperança', 'Vila Formosa'])
  })
  it('não entra em ciclo quando o pai aponta de volta', () => {
    const n = buildNodes([{ l: 'A', pl: 'B' }, { l: 'B', pl: 'A' }], 'X')
    expect(n).toHaveLength(2)
  })
})

describe('busca de sub-bairro', () => {
  it('guarda "Sub (Pai)" e busca "Sub, Pai, Cidade - UF"', () => {
    expect(splitHood(subName('Jardim Exemplo', 'Vila Esperança'))).toEqual({ name: 'Jardim Exemplo', parent: 'Vila Esperança' })
    expect(termQuery({ niche: 'Barbeiro', neighborhood: 'Jardim Exemplo (Vila Esperança)', city: 'São Paulo', uf: 'SP' })).toBe('Barbeiro em Jardim Exemplo, Vila Esperança, São Paulo - SP')
    expect(termQuery({ niche: 'Barbeiro', neighborhood: 'Moema', city: 'São Paulo', uf: 'SP' })).toBe('Barbeiro em Moema, São Paulo - SP')
    expect(termQuery({ niche: 'Barbeiro', neighborhood: '', city: 'Livramento', uf: 'BA' })).toBe('Barbeiro em Livramento - BA')
  })
  it('liga a linha ao termo do sub-bairro pelo "Onde achei"', () => {
    const terms = [{ id: 1, neighborhood: 'Vila Esperança', query: 'Barbeiro em Vila Esperança, São Paulo - SP' },
      { id: 2, neighborhood: 'Jardim Exemplo (Vila Esperança)', query: 'Barbeiro em Jardim Exemplo, Vila Esperança, São Paulo - SP' }]
    expect(matchTerm({ where: 'Barbeiro em Jardim Exemplo, Vila Esperança, São Paulo - SP' }, terms).id).toBe(2)
    expect(matchTerm({ where: 'barbeiro em vila esperanca, sao paulo - sp' }, terms).id).toBe(1)
  })
})

describe('importação: para onde foi cada linha', () => {
  const terms = [{ id: 't1', neighborhood: 'Vila Esperança', query: 'Barbeiro em Vila Esperança, São Paulo - SP' }]
  const w = terms[0].query
  const linhas = [
    { company: 'Barbearia A', phone: '(11) 91111-1111', instagram: '', site: 'Não', where: w },
    { company: 'Barbearia B', phone: '(11) 92222-2222', instagram: '@b', site: 'Sim', where: w },
    { company: 'Barbearia C', phone: '', instagram: '', site: 'Não', where: w, maps: 'https://maps/x' },
    { company: 'Barbearia D', phone: '', instagram: '', site: 'Não', where: w },
    { company: 'Barbearia D', phone: '', instagram: '', site: 'Não', where: w },
    { company: 'Barbearia E', phone: '(11) 91111-1111', instagram: '', site: 'Não', where: w }, // mesmo telefone da A
    { company: 'Barbearia F', phone: '', instagram: '@f', site: 'Não', where: w },
    { company: NO_RESULT, phone: '', instagram: '', site: '', where: w },
  ]
  const leads = [{ company: 'Barbearia Já Tinha', city: 'São Paulo', phone: '', instagram: '' }]
  it('a soma fecha: nada some sem aparecer no relatório', () => {
    const a = analisarImportacao({ rows: linhas, terms, leads, onlyNoSite: false, incluirSemContato: true, city: 'São Paulo' })
    expect(a.funil).toMatchObject({ lidas: 8, vazio: 1, site: 0, dup: 2, semcontato: 2, comTelefone: 3, novos: 5 })
    expect(a.funil.vazio + a.funil.site + a.funil.dup + a.funil.semcontato + a.funil.comTelefone).toBe(a.funil.lidas)
    expect(a.per[0]).toMatchObject({ rows: 7, fresh: 5, dup: 2, sem: 0 })
  })
  it('sem a caixinha, os sem contato ficam de fora, mas contados', () => {
    const a = analisarImportacao({ rows: linhas, terms, leads, onlyNoSite: false, incluirSemContato: false, city: 'São Paulo' })
    expect(a.funil).toMatchObject({ semcontato: 2, novos: 3 })
    expect(a.per[0].sem).toBe(2)
  })
  it('lote só sem site separa quem tem site', () => {
    const a = analisarImportacao({ rows: linhas, terms, leads, onlyNoSite: true, incluirSemContato: true, city: 'São Paulo' })
    expect(a.funil.site).toBe(1)
  })
  it('importar de novo a mesma cidade não duplica quem já está sem telefone', () => {
    const jaNoCrm = [...leads, { company: 'Barbearia C', city: 'São Paulo', phone: '', instagram: '' }]
    const a = analisarImportacao({ rows: linhas, terms, leads: jaNoCrm, onlyNoSite: false, incluirSemContato: true, city: 'São Paulo' })
    expect(a.out.find((x) => x.r.company === 'Barbearia C').kind).toBe('dup')
  })
  it('lê a coluna opcional do link do Maps', () => {
    const p = parseResult('Empresa\tTelefone/WhatsApp\tInstagram\tSite atual?\tBairro\tOnde achei\tLink no Maps\nX\t(11) 90000-0000\t-\tNão\tMoema\tBarbeiro em Moema, São Paulo - SP\thttps://maps/y')
    expect(p.rows[0].maps).toBe('https://maps/y')
    expect(SATURADO).toBeGreaterThan(10)
  })
})
