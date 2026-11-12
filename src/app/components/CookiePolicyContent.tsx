export default function CookiePolicyContent() {
  return (
    <article className="mx-auto max-w-4xl px-6 pt-28 pb-16 text-black">
      <header className="mb-12">
        <p className="mb-3 text-sm uppercase tracking-widest text-gray-600">
          Agape Streetwear
        </p>

        <h1 className="mb-4 text-4xl font-bold">
          Política de Cookies
        </h1>

        <p className="text-sm text-gray-600">
          Última atualização: 12 de novembro de 2026
        </p>
      </header>

      <div className="space-y-10 leading-7 text-gray-700">
        <section>
          <h2 className="mb-3 text-xl font-semibold text-black">
            1. O que são cookies?
          </h2>
          <p>
            Cookies são pequenos arquivos ou identificadores armazenados
            no navegador ou dispositivo do usuário. Eles ajudam sites a
            manter sessões, lembrar preferências, proteger contas e
            oferecer funcionalidades.
          </p>
          <p>
            Além de cookies, algumas tecnologias podem utilizar
            armazenamento de sessão ou identificadores semelhantes.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-black">
            2. Tecnologias utilizadas
          </h2>
          <p>
            A Agape Streetwear utiliza ou pode utilizar tecnologias
            relacionadas aos seguintes serviços:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Clerk:</strong> autenticação, gerenciamento de
              sessões e proteção das contas dos usuários.
            </li>
            <li>
              <strong>Cloudflare:</strong> mecanismos de segurança e
              proteção contra tráfego automatizado ou abusivo.
            </li>
            <li>
              <strong>Stripe:</strong> processamento de pagamentos,
              identificação de sessão e mecanismos de prevenção a fraudes.
            </li>
          </ul>
          <p>
            Os nomes e a duração dos identificadores podem variar conforme
            o serviço, navegador e funcionamento da plataforma.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-black">
            3. Armazenamento de sessão
          </h2>
          <p>
            Durante o checkout, o site também utiliza armazenamento de
            sessão do navegador para manter informações técnicas
            necessárias à continuidade e à segurança da tentativa de
            compra. Esse armazenamento não é, por si só, um cookie.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-black">
            4. Finalidades
          </h2>
          <p>Essas tecnologias podem ser utilizadas para:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Manter o usuário autenticado.</li>
            <li>Proteger contas e sessões.</li>
            <li>Identificar atividades suspeitas e prevenir fraudes.</li>
            <li>Permitir o funcionamento do checkout e dos pagamentos.</li>
            <li>Manter a segurança e estabilidade do site.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-black">
            5. Cookies necessários e opcionais
          </h2>
          <p>
            Tecnologias estritamente necessárias ao funcionamento,
            autenticação, segurança e processamento de compras podem ser
            utilizadas para fornecer o serviço solicitado.
          </p>
          <p>
            Cookies de análise, publicidade ou outras finalidades
            opcionais, caso sejam implementados, deverão respeitar as
            escolhas de consentimento do usuário e não serão ativados
            antes da autorização quando ela for necessária.
          </p>
          <p>
            Até o momento, a auditoria do código da loja não identificou
            ferramentas próprias de Google Analytics, Meta Pixel ou
            Microsoft Clarity. Essa informação poderá mudar caso novas
            integrações sejam adicionadas.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-black">
            6. Gerenciamento de preferências
          </h2>
          <p>
            O usuário pode gerenciar cookies por meio das configurações
            do próprio navegador, incluindo bloqueio e exclusão.
            Entretanto, a desativação de tecnologias necessárias pode
            impedir o login, o checkout ou outras funcionalidades.
          </p>
          <p>
            Quando o mecanismo de preferências de cookies da loja estiver
            disponível, o usuário também poderá revisar ou alterar suas
            escolhas por meio dele.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-black">
            7. Serviços de terceiros
          </h2>
          <p>
            Clerk, Cloudflare e Stripe possuem suas próprias políticas
            e práticas de privacidade. O tratamento realizado por esses
            fornecedores também está sujeito aos respectivos documentos
            e às condições aplicáveis aos serviços.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-black">
            8. Atualizações desta política
          </h2>
          <p>
            Esta política poderá ser atualizada quando houver mudanças
            nas tecnologias utilizadas, nas finalidades de tratamento
            ou na legislação aplicável. A versão vigente ficará
            disponível nesta página.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-black">
            9. Contato
          </h2>
          <p>
            Para dúvidas sobre cookies e proteção de dados, entre em
            contato pelo e-mail contato@agapestreetwear.com.br.
          </p>
          <p>
            Responsável: Jonathan Leite Da Silva — Dourados, Mato Grosso
            do Sul, Brasil.
          </p>
        </section>

        <p className="text-sm text-gray-600">
          Consulte também nossa{" "}
          <a
            href="/privacidade"
            className="font-semibold underline underline-offset-4"
          >
            Política de Privacidade
          </a>
          .
        </p>
      </div>
    </article>
  );
}
