import type { Metadata } from 'next';
import Legal from '@/components/sections/Legal';
import { SITE } from '@/data/site';

export const metadata: Metadata = {
  title: 'Termos de uso',
  description: 'Condições de uso do site da Zinkra.',
  alternates: { canonical: '/termos' },
};

export default function Termos() {
  return (
    <Legal etiqueta="Legal" titulo="Termos de uso" atualizado="22 de outubro de 2026">
      <section>
        <h2>Sobre este site</h2>
        <p>Este site apresenta os serviços da Zinkra Soluções Digitais, CNPJ {SITE.cnpj}. Ao navegar por ele, você concorda com as condições abaixo.</p>
      </section>
      <section>
        <h2>Informações</h2>
        <p>Trabalhamos para manter os textos corretos e atualizados, mas o conteúdo é informativo e não constitui proposta comercial. Prazos, escopo e valores de cada projeto são combinados por escrito, em proposta e contrato próprios.</p>
      </section>
      <section>
        <h2>Propriedade intelectual</h2>
        <p>Marca, textos, layout, imagens e códigos deste site pertencem à Zinkra, salvo quando indicado. Não é permitido copiar ou reutilizar sem autorização. Marcas de terceiros citadas pertencem aos seus donos.</p>
      </section>
      <section>
        <h2>Projetos e clientes</h2>
        <p>Os projetos exibidos são apresentados com autorização ou como projetos conceito, indicados como “em breve”. Projetos conceito não representam casos de clientes.</p>
      </section>
      <section>
        <h2>Uso adequado</h2>
        <p>Você se compromete a não usar o site para fins ilegais, nem tentar interferir no funcionamento dele ou enviar mensagens automáticas em massa pelo formulário.</p>
      </section>
      <section>
        <h2>Links externos</h2>
        <p>O site pode apontar para páginas de terceiros, como WhatsApp e Instagram. Não controlamos esses sites e não somos responsáveis pelo conteúdo deles.</p>
      </section>
      <section>
        <h2>Contato</h2>
        <p>Dúvidas sobre estes termos: <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.</p>
      </section>
    </Legal>
  );
}
