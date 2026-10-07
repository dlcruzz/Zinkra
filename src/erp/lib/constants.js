export const FRONTS = {
  sites: 'Sites', sistemas: 'Sistemas', social: 'Social media', trafego: 'Tráfego', comercial: 'Comercial', interno: 'Interno',
}
export const FRONT_COLORS = {
  sistemas: '#15C45A', sites: '#4C8DF6', comercial: '#E5A23A', social: '#B07CF0', trafego: '#E5484D', interno: '#5A625E',
}

export const PRIORITIES = { urgente: 'Urgente', alta: 'Alta', normal: 'Normal', baixa: 'Baixa' }
export const PRIORITY_CLASS = { urgente: 'b r', alta: 'b y', normal: 'b', baixa: 'b' }
export const PRIORITY_ORDER = { urgente: 0, alta: 1, normal: 2, baixa: 3 }

export const TASK_STATUS = { todo: 'A fazer', doing: 'Fazendo', review: 'Revisão', done: 'Feito' }
export const RECURRENCE = { none: 'Não repete', daily: 'Todo dia', weekdays: 'Dias úteis', weekly: 'Toda semana', monthly: 'Todo mês' }

export const PROJECT_STAGES = {
  briefing: 'Briefing', design: 'Design', desenvolvimento: 'Desenvolvimento', revisao: 'Revisão do cliente',
  ajustes: 'Ajustes', entregue: 'Entregue', manutencao: 'Manutenção',
}
export const PROJECT_STAGE_CLASS = {
  briefing: 'b', design: 'b bl', desenvolvimento: 'b bl', revisao: 'b y', ajustes: 'b y', entregue: 'b g', manutencao: 'b g',
}

export const MEETING_TYPES = { prospeccao: 'Prospecção', briefing: 'Briefing', alinhamento: 'Alinhamento', entrega: 'Entrega', interna: 'Interna' }

export const ACTIVITY_TYPES = { whatsapp: 'WhatsApp', ligacao: 'Ligação', email: 'E-mail', visita: 'Visita', nota: 'Nota', reuniao: 'Reunião', sistema: 'Sistema' }
export const RESULTS = { enviado: 'Enviado', respondeu: 'Respondeu', sem_resposta: 'Sem resposta', invalido: 'Número inválido' }

export const PROPOSAL_STATUS = { rascunho: 'Rascunho', enviada: 'Enviada', vista: 'Vista', aceita: 'Aceita', recusada: 'Recusada', expirada: 'Expirada' }
export const PROPOSAL_CLASS = { rascunho: 'b', enviada: 'b y', vista: 'b bl', aceita: 'b g', recusada: 'b r', expirada: 'b' }

export const CLIENT_STATUS = { ativo: 'Ativo', pausado: 'Pausado', encerrado: 'Encerrado' }

export const IDEA_TYPES = { produto: 'Produto / serviço', conteudo: 'Conteúdo', melhoria: 'Melhoria interna', nicho: 'Nicho novo', ferramenta: 'Ferramenta' }
export const IDEA_STATUS = { nova: 'Nova', avaliando: 'Avaliando', aprovada: 'Aprovada', virou: 'Virou projeto', descartada: 'Descartada' }

export const METHODS = ['Pix', 'Boleto', 'Cartão', 'Transferência', 'Dinheiro']

export const METRICS = {
  contatos: 'Contatos feitos', respostas: 'Respostas', reunioes: 'Reuniões agendadas', handoffs: 'Passados ao Diretor',
  propostas: 'Propostas enviadas', fechamentos: 'Fechamentos', valor_fechado: 'Valor fechado', faturamento: 'Faturamento',
}
export const MONEY_METRICS = new Set(['valor_fechado', 'faturamento'])
export const PERIODS = { day: 'Diária', week: 'Semanal', month: 'Mensal' }

export const COMMISSION_STATUS = { prevista: 'Prevista', a_pagar: 'A pagar', paga: 'Paga', cancelada: 'Cancelada' }
export const COMMISSION_CLASS = { prevista: 'b', a_pagar: 'b y', paga: 'b g', cancelada: 'b' }

export const LEVELS = { total: 'Total', own: 'Próprio', read: 'Leitura', none: 'Nenhum' }
