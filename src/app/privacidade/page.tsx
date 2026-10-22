import type { Metadata } from 'next';
import Legal from '@/components/sections/Legal';
import { SITE } from '@/data/site';

export const metadata: Metadata = {
  title: 'Política de privacidade',
  description: 'Como a Zinkra trata os dados pessoais de quem usa este site, em linha com a Lei Geral de Proteção de Dados (LGPD).',
  alternates: { canonical: '/privacidade' },
};

export default function Privacidade() {
  return (
    <Legal etiqueta="Legal" titulo="Política de privacidade" atualizado="22 de outubro de 2026">
      <section>
        <h2>Quem somos</h2>
        <p>Este site é mantido pela Zinkra Soluções Digitais, CNPJ {SITE.cnpj}, de {SITE.cidade}. Para assuntos sobre dados pessoais, escreva para <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.</p>
      </section>
      <section>
        <h2>Quais dados coletamos</h2>
        <p>Coletamos apenas o que você nos envia de forma voluntária no formulário de contato ou pelo WhatsApp:</p>
        <ul>
          <li>nome;</li>
          <li>e-mail ou número de WhatsApp;</li>
          <li>a descrição do que você precisa e a faixa de orçamento que informar.</li>
        </ul>
        <p className="mt-4">O site também pode registrar dados técnicos de navegação (como tipo de aparelho e páginas acessadas) para medir desempenho e corrigir problemas.</p>
      </section>
      <section>
        <h2>Para que usamos</h2>
        <p>Usamos os dados para responder ao seu contato, preparar propostas e, se você se tornar cliente, executar o serviço contratado. Não vendemos nem compartilhamos os seus dados para fins de publicidade de terceiros.</p>
      </section>
      <section>
        <h2>Com quem compartilhamos</h2>
        <p>Usamos serviços de terceiros para operar o site, como hospedagem (Vercel) e envio de e-mail (Resend). Eles tratam os dados apenas para prestar esse serviço. Ao falar pelo WhatsApp, valem também as regras de privacidade do próprio WhatsApp.</p>
      </section>
      <section>
        <h2>Por quanto tempo guardamos</h2>
        <p>Guardamos as mensagens enquanto forem necessárias para atender você e cumprir obrigações legais. Depois, apagamos ou anonimizamos.</p>
      </section>
      <section>
        <h2>Os seus direitos</h2>
        <p>Pela LGPD, você pode pedir confirmação de que tratamos os seus dados, acesso, correção, anonimização, exclusão, portabilidade e informações sobre compartilhamento, além de revogar o consentimento. Basta escrever para <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.</p>
      </section>
      <section>
        <h2>Cookies</h2>
        <p>Este site guarda no seu navegador apenas preferências simples, como o tema claro ou escuro e o fato de você já ter visitado o site. Não usamos cookies de publicidade.</p>
      </section>
      <section>
        <h2>Mudanças nesta política</h2>
        <p>Podemos atualizar este texto. A data da última atualização aparece no topo da página.</p>
      </section>
    </Legal>
  );
}
