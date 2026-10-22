'use client';
import { useState } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import Button from '@/components/ui/Button';
import { whatsappLink } from '@/data/site';

type Status = 'idle' | 'sending' | 'ok' | 'erro';

const ORCAMENTOS = ['Ainda não sei', 'Até R$ 2 mil', 'De R$ 2 mil a R$ 5 mil', 'De R$ 5 mil a R$ 10 mil', 'Acima de R$ 10 mil'];

const campo =
  'w-full rounded-2xl border border-line bg-surface/60 px-5 py-4 text-fg placeholder:text-muted/70 outline-none transition-colors duration-300 focus:border-brand';

/** Formulário curto de contato. Envia para /api/contato (e-mail via Resend) e oferece o WhatsApp como alternativa. */
export default function ContactForm() {
  const [status, setStatus] = useState<Status>('idle');
  const [msgErro, setMsgErro] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const dados = Object.fromEntries(new FormData(form).entries());
    setStatus('sending');
    setMsgErro('');
    try {
      const res = await fetch('/api/contato', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.erro || 'Não foi possível enviar agora.');
      setStatus('ok');
      form.reset();
    } catch (err) {
      setMsgErro(err instanceof Error ? err.message : 'Não foi possível enviar agora.');
      setStatus('erro');
    }
  }

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {status === 'ok' ? (
          <m.div
            key="ok"
            role="status"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-brand/40 bg-surface/70 p-10 text-center"
          >
            <svg width="84" height="84" viewBox="0 0 84 84" fill="none" aria-hidden>
              <m.circle cx="42" cy="42" r="38" stroke="rgb(var(--brand))" strokeWidth="3" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8 }} />
              <m.path d="M26 43l11 11 21-23" stroke="rgb(var(--brand))" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, delay: 0.7 }} />
            </svg>
            <h3 className="display mt-8 text-4xl">Mensagem enviada.</h3>
            <p className="mt-3 max-w-sm text-muted">Recebemos o seu pedido e respondemos em breve. Se for urgente, chame no WhatsApp.</p>
            <div className="mt-8">
              <Button href={whatsappLink()} external variant="outline">Falar no WhatsApp</Button>
            </div>
          </m.div>
        ) : (
          <m.form
            key="form"
            onSubmit={onSubmit}
            exit={{ opacity: 0, y: -20 }}
            className="grid gap-4 rounded-3xl border border-line bg-surface/60 p-6 backdrop-blur-md md:p-9"
            noValidate={false}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm text-muted">
                Seu nome
                <input name="nome" required minLength={2} maxLength={80} autoComplete="name" placeholder="Como podemos te chamar?" className={campo} />
              </label>
              <label className="grid gap-2 text-sm text-muted">
                E-mail ou WhatsApp
                <input name="contato" required minLength={5} maxLength={120} autoComplete="email" placeholder="Onde respondemos você?" className={campo} />
              </label>
            </div>
            <label className="grid gap-2 text-sm text-muted">
              O que você precisa?
              <textarea name="mensagem" required minLength={10} maxLength={1500} rows={4} placeholder="Conte em poucas palavras o que quer criar ou resolver." className={`${campo} resize-none`} />
            </label>
            <label className="grid gap-2 text-sm text-muted">
              Orçamento aproximado
              <select name="orcamento" defaultValue={ORCAMENTOS[0]} className={`${campo} appearance-none`}>
                {ORCAMENTOS.map((o) => (
                  <option key={o} value={o} className="bg-[#0A0C0B] text-white">{o}</option>
                ))}
              </select>
            </label>
            {/* campo isca: pessoas não veem; robôs preenchem */}
            <input type="text" name="site" tabIndex={-1} autoComplete="off" aria-hidden className="absolute left-[-9999px] h-0 w-0 opacity-0" />

            <div className="mt-2 flex flex-wrap items-center gap-4">
              <Button type="submit" size="lg" disabled={status === 'sending'}>
                {status === 'sending' ? 'Enviando...' : 'Enviar mensagem'}
              </Button>
              {status === 'erro' && (
                <p role="alert" className="text-sm text-red-400">
                  {msgErro}{' '}
                  <a className="underline" href={whatsappLink()} target="_blank" rel="noopener noreferrer">Fale pelo WhatsApp</a>
                </p>
              )}
            </div>
          </m.form>
        )}
      </AnimatePresence>
    </div>
  );
}
