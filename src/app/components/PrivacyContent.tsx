
export default function PrivacyContent() {
  return (
    <article className="mx-auto max-w-4xl px-6 pt-28 pb-16 text-black">
      <header className="mb-12">
        <p className="mb-3 text-sm uppercase tracking-widest text-gray-600">
          Agape Streetwear
        </p>

        <h1 className="mb-4 text-4xl font-bold">
          Política de Privacidade
        </h1>

        <p className="text-sm text-gray-600">
          Última atualização: 23 de novembro de 2026
        </p>
      </header>

      <div className="space-y-10 leading-7 text-gray-700">
        <section>
          <h2 className="mb-3 text-xl font-semibold text-black">
            1. Introdução
          </h2>
          <p>
            A Agape Streetwear respeita a privacidade de seus clientes
            e realiza o tratamento de dados pessoais conforme a
            legislação aplicável, especialmente a Lei Geral de
            Proteção de Dados Pessoais (Lei nº 13.709/2018 — LGPD).
          </p>
          <p className="mt-3">
            Esta política explica quais dados pessoais podem ser
            coletados, para quais finalidades são utilizados, com
            quem podem ser compartilhados, por quanto tempo podem
            ser conservados e quais são os direitos dos titulares.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-black">
            2. Controlador dos dados pessoais
          </h2>
          <p>
            Controlador: Jonathan Leite Da Silva, pessoa física,
            responsável pela operação da Agape Streetwear e pelas
            decisões relacionadas ao tratamento de dados pessoais.
          </p>
          <p className="mt-3">
            Localidade: Dourados, Mato Grosso do Sul, Brasil.
          </p>
          <p className="mt-3">
            Contato para assuntos relacionados à privacidade:
            {" "}
            <a
              href="mailto:suporte@in.agapestreetwear.com.br"
              className="font-semibold underline underline-offset-4"
            >
              suporte@in.agapestreetwear.com.br
            </a>.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-black">
            3. Dados pessoais coletados
          </h2>
          <p>
            Os dados coletados dependem da utilização da loja e
            das funcionalidades acessadas pelo usuário. Podemos
            tratar as seguintes informações:
          </p>
          <ul className="ml-6 mt-3 list-disc space-y-2">
            <li>Nome completo e endereço de e-mail;</li>
            <li>Telefone e outras informações de contato;</li>
            <li>
              Endereço de entrega, CEP, cidade, estado e informações
              necessárias à realização da entrega;
            </li>
            <li>
              CPF, quando solicitado e fornecido pelo cliente;
            </li>
            <li>
              Produtos, quantidades, valores, situação e histórico
              de pedidos;
            </li>
            <li>
              Identificadores de pagamento, valores, moeda e
              informações sobre as transações;
            </li>
            <li>
              Dados técnicos, como endereço IP, navegador,
              dispositivo e registros de acesso, quando
              disponibilizados pelos serviços utilizados;
            </li>
            <li>
              Informações relacionadas à autenticação e à utilização
              da conta.
            </li>
          </ul>
          <p className="mt-3">
            A loja não solicita os dados completos do cartão
            diretamente para armazená-los em seu banco de dados.
            O processamento das informações do meio de pagamento
            é realizado pela Stripe.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-black">
            4. Finalidades e bases legais do tratamento
          </h2>
          <p>
            Os dados pessoais são tratados para finalidades
            determinadas, conforme as bases legais previstas
            na LGPD, incluindo:
          </p>
          <ul className="ml-6 mt-3 list-disc space-y-2">
            <li>
              Cadastro, criação de conta e autenticação:
              execução de contrato ou procedimentos preliminares
              solicitados pelo titular;
            </li>
            <li>
              Processamento de compras, pagamentos e organização
              de entregas: execução de contrato;
            </li>
            <li>
              Atendimento relacionado a pedidos e compras:
              execução de contrato e, quando aplicável,
              legítimo interesse;
            </li>
            <li>
              Tratamento de reclamações e defesa de direitos:
              exercício regular de direitos;
            </li>
            <li>
              Prevenção a fraudes, proteção das contas e segurança
              da loja: legítimo interesse, quando aplicável;
            </li>
            <li>
              Cumprimento de obrigações fiscais, legais e
              regulatórias: cumprimento de obrigação legal
              ou regulatória;
            </li>
            <li>
              Consulta de CEP e preenchimento de endereço:
              procedimentos preliminares relacionados à compra
              ou execução do contrato;
            </li>
            <li>
              Envio futuro de ofertas, promoções e novidades:
              consentimento específico, livre e opcional,
              quando essa funcionalidade for implementada.
            </li>
          </ul>
          <p className="mt-3">
            O armazenamento e a organização dos dados nos sistemas
            utilizados pela loja são realizados para viabilizar
            as finalidades informadas, respeitando as respectivas
            bases legais e os direitos dos titulares.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-black">
            5. Compartilhamento de dados
          </h2>
          <p>
            Os dados pessoais poderão ser compartilhados com
            fornecedores de tecnologia e serviços necessários
            à operação da loja, limitando-se às informações
            pertinentes a cada finalidade:
          </p>
          <ul className="ml-6 mt-3 list-disc space-y-2">
            <li>
              <strong>Clerk:</strong> autenticação, gerenciamento
              de contas e sessões de usuários;
            </li>
            <li>
              <strong>Stripe:</strong> processamento de pagamentos,
              realização de transações e mecanismos de prevenção
              a fraudes;
            </li>
            <li>
              <strong>Prisma Postgres:</strong> armazenamento de
              informações relacionadas às contas, clientes e pedidos;
            </li>
            <li>
              <strong>Vercel:</strong> hospedagem e execução da
              aplicação, incluindo processamento de requisições;
            </li>
            <li>
              <strong>Resend:</strong> envio de e-mails relacionados
              ao funcionamento da loja e às comunicações transacionais;
            </li>
            <li>
              <strong>ViaCEP:</strong> consulta de informações de
              endereço a partir do CEP informado pelo usuário;
            </li>
            <li>
              <strong>Hostless:</strong> hospedagem do serviço técnico
              utilizado para encaminhar notificações de pedidos pagos
              ao WhatsApp da loja.
            </li>
          </ul>
          <p className="mt-3">
            A infraestrutura Cloudflare também pode processar
            requisições relacionadas ao domínio personalizado
            utilizado pelo Clerk, conforme o funcionamento
            desse serviço.
          </p>
          <p className="mt-3">
            A Agape Streetwear mantém informações necessárias
            à gestão dos pedidos e transações, como valores,
            moeda, identificadores de pagamento e situação
            das operações. Os dados do meio de pagamento são
            processados pela Stripe.
          </p>
          <p className="mt-3">
            Atualmente, as entregas são realizadas diretamente
            pelo responsável pela loja. Não há compartilhamento
            habitual com transportadoras para a operação atual.
            Caso esse modelo seja alterado, os dados necessários
            à entrega poderão ser compartilhados com os prestadores
            envolvidos.
          </p>
          <p className="mt-3">
            A Agape Streetwear não comercializa dados pessoais.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-black">
            6. Transferência internacional de dados
          </h2>
          <p>
            Alguns fornecedores utilizados pela loja podem armazenar
            ou processar dados pessoais fora do Brasil, o que pode
            caracterizar transferência internacional de dados.
          </p>
          <p className="mt-3">
            O banco de dados Prisma Postgres utilizado pela aplicação
            está localizado na região de Washington, nos Estados
            Unidos. As funções da aplicação hospedadas na Vercel
            utilizam a região identificada como iad1, também
            localizada nos Estados Unidos.
          </p>
          <p className="mt-3">
            Outros fornecedores podem realizar operações de
            tratamento em diferentes localidades, conforme suas
            estruturas técnicas e condições de serviço.
          </p>
          <p className="mt-3">
            As transferências internacionais deverão observar
            os requisitos da LGPD e da regulamentação aplicável,
            incluindo a utilização de mecanismos legalmente válidos
            para essas operações.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-black">
            7. Segurança das informações
          </h2>
          <p>
            A Agape Streetwear adota medidas técnicas e administrativas
            destinadas a proteger os dados pessoais contra acessos
            não autorizados, perdas, alterações e usos indevidos.
          </p>
          <p className="mt-3">
            Entre as medidas utilizadas estão mecanismos de
            autenticação, controle de acesso administrativo,
            serviços especializados de processamento de pagamentos
            e infraestrutura de hospedagem.
          </p>
          <p className="mt-3">
            O acesso administrativo aos sistemas da loja é restrito
            às pessoas autorizadas para essa finalidade.
            Nenhum sistema é completamente livre de riscos,
            mas buscamos manter medidas compatíveis com a
            natureza das informações tratadas.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-black">
            8. Cookies e tecnologias semelhantes
          </h2>
          <p>
            A loja utiliza cookies e tecnologias semelhantes
            relacionadas à autenticação, manutenção de sessões,
            segurança e processamento de pagamentos, incluindo
            serviços do Clerk, Stripe e infraestrutura relacionada
            ao domínio personalizado do Clerk.
          </p>
          <p className="mt-3">
            Também utilizamos armazenamento no navegador:
          </p>
          <ul className="ml-6 mt-3 list-disc space-y-2">
            <li>
              <strong>localStorage:</strong> utilizado para manter
              os produtos adicionados ao carrinho e registrar que
              o usuário fechou o aviso informativo sobre cookies;
            </li>
            <li>
              <strong>sessionStorage:</strong> utilizado durante
              o checkout para armazenar informações técnicas
              temporárias relacionadas à continuidade da compra.
            </li>
          </ul>
          <p className="mt-3">
            Atualmente, a aplicação não possui integração própria
            identificada com ferramentas de análise ou publicidade,
            como Google Analytics, Meta Pixel ou Microsoft Clarity.
          </p>
          <p className="mt-3">
            Para mais informações sobre essas tecnologias,
            suas finalidades e formas de gerenciamento, consulte
            nossa{" "}
            <a
              href="/cookies"
              className="font-semibold underline underline-offset-4"
            >
              Política de Cookies
            </a>.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-black">
            9. Comunicações
          </h2>
          <p>
            A loja poderá utilizar e-mail e WhatsApp para
            comunicações necessárias ao atendimento e à execução
            dos pedidos, incluindo informações sobre pagamentos,
            confirmação de compras e atualizações relacionadas
            aos pedidos.
          </p>
          <p className="mt-3">
            Atualmente, o serviço de WhatsApp integrado à operação
            é utilizado para encaminhar notificações de pedidos
            pagos ao WhatsApp da loja. Isso não significa que
            exista uma campanha de marketing por WhatsApp ativa.
          </p>
          <p className="mt-3">
            Futuramente, a loja poderá oferecer o recebimento
            de ofertas, promoções e novidades por e-mail e
            WhatsApp. Essa finalidade dependerá de autorização
            específica e opcional do titular, separada das
            comunicações necessárias à compra.
          </p>
          <p className="mt-3">
            A autorização para receber comunicações promocionais
            não será condição para criar uma conta ou realizar
            uma compra. Quando essa funcionalidade estiver
            disponível, o titular poderá cancelar sua autorização
            a qualquer momento.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-black">
            10. Retenção e exclusão dos dados
          </h2>
          <p>
            Os dados pessoais serão conservados pelo período
            necessário para cumprir as finalidades para as quais
            foram coletados, considerando a execução dos pedidos,
            o atendimento ao cliente, as obrigações legais e
            regulatórias e o exercício regular de direitos.
          </p>
          <p className="mt-3">
            O titular poderá solicitar a exclusão de sua conta
            e de seus dados pessoais pelo canal de contato
            indicado nesta política. A solicitação será analisada
            pelo responsável, considerando a natureza dos dados,
            as finalidades do tratamento e as hipóteses legais
            de conservação.
          </p>
          <p className="mt-3">
            Quando a exclusão for cabível, os dados serão eliminados
            ou anonimizados, conforme aplicável. Informações que
            precisem ser conservadas para cumprir obrigações legais
            ou regulatórias, ou para o exercício regular de direitos,
            poderão ser mantidas pelo período necessário.
          </p>
          <p className="mt-3">
            Quando houver conservação excepcional, os dados
            deverão ter seu acesso e utilização limitados às
            finalidades que justificam sua manutenção.
          </p>
          <p className="mt-3">
            A solicitação de exclusão não significa necessariamente
            a eliminação imediata de todos os registros relacionados
            a compras e transações, pois algumas informações podem
            estar sujeitas a prazos legais de conservação.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-black">
            11. Direitos dos titulares
          </h2>
          <p>
            Conforme a Lei Geral de Proteção de Dados Pessoais
            (LGPD), o titular poderá exercer os direitos previstos
            na legislação, incluindo:
          </p>
          <ul className="ml-6 mt-3 list-disc space-y-2">
            <li>
              Confirmação da existência de tratamento de dados pessoais;
            </li>
            <li>
              Acesso aos dados pessoais tratados;
            </li>
            <li>
              Correção de dados incompletos, inexatos ou desatualizados;
            </li>
            <li>
              Anonimização, bloqueio ou eliminação de dados
              desnecessários, excessivos ou tratados em
              desconformidade com a legislação;
            </li>
            <li>
              Portabilidade dos dados, observadas as condições
              e a regulamentação aplicáveis;
            </li>
            <li>
              Informação sobre entidades públicas e privadas
              com as quais os dados são compartilhados;
            </li>
            <li>
              Informação sobre a possibilidade de não fornecer
              consentimento e suas consequências, quando aplicável;
            </li>
            <li>
              Revogação do consentimento, quando essa for a base
              legal utilizada;
            </li>
            <li>
              Eliminação dos dados pessoais tratados com base
              no consentimento, observadas as exceções legais.
            </li>
          </ul>
          <p className="mt-3">
            As solicitações serão analisadas pelo responsável
            pelo tratamento e atendidas conforme os prazos,
            procedimentos e condições previstos na legislação.
          </p>
          <p className="mt-3">
            Para exercer seus direitos ou esclarecer dúvidas
            sobre o tratamento de dados pessoais, entre em contato:
          </p>
          <a
            href="mailto:suporte@in.agapestreetwear.com.br"
            className="mt-2 inline-block font-semibold text-black underline underline-offset-4"
          >
            suporte@in.agapestreetwear.com.br
          </a>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-black">
            12. Alterações nesta política
          </h2>
          <p>
            Esta política poderá ser atualizada para refletir
            mudanças nos serviços, nas operações da loja,
            nas finalidades de tratamento ou na legislação aplicável.
          </p>
          <p className="mt-3">
            A versão atualizada ficará disponível nesta página,
            acompanhada da respectiva data de atualização.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-black">
            13. Contato
          </h2>
          <p>
            Agape Streetwear
          </p>
          <p>
            Controlador: Jonathan Leite Da Silva
          </p>
          <p>
            Dourados — Mato Grosso do Sul, Brasil.
          </p>
          <p>
            E-mail para assuntos relacionados à privacidade:
            {" "}
            <a
              href="mailto:suporte@in.agapestreetwear.com.br"
              className="font-semibold underline underline-offset-4"
            >
              suporte@in.agapestreetwear.com.br
            </a>.
          </p>
        </section>

        <p className="text-sm text-gray-600">
          Consulte também nossa{" "}
          <a
            href="/cookies"
            className="font-semibold underline underline-offset-4"
          >
            Política de Cookies
          </a>.
        </p>
      </div>
    </article>
  );
}
