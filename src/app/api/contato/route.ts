import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { SITE } from '@/data/site';

export const runtime = 'nodejs';

// Limite simples por IP (memória da função): 5 envios a cada 10 minutos.
const janela = 10 * 60 * 1000;
const tentativas = new Map<string, number[]>();

function limitado(ip: string) {
  const agora = Date.now();
  const lista = (tentativas.get(ip) ?? []).filter((t) => agora - t < janela);
  lista.push(agora);
  tentativas.set(ip, lista);
  return lista.length > 5;
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'desconhecido';
  if (limitado(ip)) return NextResponse.json({ erro: 'Muitos envios seguidos. Tente de novo em alguns minutos.' }, { status: 429 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ erro: 'Pedido inválido.' }, { status: 400 });
  }

  // Campo isca preenchido = robô. Responde "ok" sem enviar nada.
  if (typeof body.site === 'string' && body.site.trim() !== '') return NextResponse.json({ ok: true });

  const nome = String(body.nome ?? '').trim().slice(0, 80);
  const contato = String(body.contato ?? '').trim().slice(0, 120);
  const mensagem = String(body.mensagem ?? '').trim().slice(0, 1500);
  const orcamento = String(body.orcamento ?? '').trim().slice(0, 60);

  if (nome.length < 2 || contato.length < 5 || mensagem.length < 10) {
    return NextResponse.json({ erro: 'Preencha nome, contato e uma breve descrição.' }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ erro: 'O envio por e-mail ainda não está configurado.' }, { status: 503 });
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: process.env.CONTACT_FROM_EMAIL ?? 'Zinkra <onboarding@resend.dev>',
      to: [process.env.CONTACT_TO_EMAIL ?? SITE.email],
      subject: `Novo pedido pelo site: ${nome}`,
      replyTo: contato.includes('@') ? contato : undefined,
      html: `<h2>Novo pedido de orçamento</h2>
<p><strong>Nome:</strong> ${esc(nome)}</p>
<p><strong>Contato:</strong> ${esc(contato)}</p>
<p><strong>Orçamento aproximado:</strong> ${esc(orcamento || 'não informado')}</p>
<p><strong>O que precisa:</strong></p>
<p>${esc(mensagem).replace(/\n/g, '<br>')}</p>`,
    });
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ erro: 'Não conseguimos enviar agora.' }, { status: 502 });
  }
}
