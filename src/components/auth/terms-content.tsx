import { TERMS_VERSION_LABEL } from "@/lib/terms-acceptance";

export const TERMS_CONTACT_EMAIL = "wrscircuito@gmail.com";

export const TERMS_SECTIONS: Array<[string, string]> = [
  ["1. Quem somos e aceitação", `O Visita SC ("o app") é desenvolvido e administrado por um desenvolvedor individual independente. Contato: ${TERMS_CONTACT_EMAIL}. Ao aceitar estes Termos no cadastro, no acesso por código ou quando solicitado no app, você celebra um acordo com o desenvolvedor. Se não concordar, não use o app.`],
  ["2. Ferramenta independente e não oficial", "O Visita SC é uma ferramenta independente e não oficial. Não é afiliado, aprovado, patrocinado nem de forma alguma ligado à Watch Tower Bible and Tract Society of Pennsylvania, à Watchtower Bible and Tract Society of New York, Inc., à International Bible Students Association nem a qualquer outra entidade associada às Testemunhas de Jeová. As marcas mencionadas, como JW, JW.ORG, JW Library e Tradução do Novo Mundo, pertencem aos respectivos titulares; qualquer referência é apenas descritiva, para indicar o contexto de uso do app."],
  ["3. Finalidade", "O Visita SC é uma ferramenta pessoal que ajuda superintendentes de circuito, anciãos e a esposa do superintendente a organizar a semana de visita (programação, reuniões, refeições, transporte, esboços e anotações) e a fazer anotações em reuniões, assembleias e congressos. Oferece apenas recursos práticos e complementares. Não presta serviços religiosos, não fornece conteúdo doutrinário próprio, aconselhamento nem interpretações oficiais, e não substitui nenhum app ou publicação oficial."],
  ["4. Sua conta", "Você é responsável por manter sua senha, PIN e códigos de acesso em sigilo e por tudo o que for feito com sua conta. Avise o superintendente se suspeitar de uso indevido."],
  ["5. Dados de outras pessoas", "Inclua apenas as informações de irmãos e famílias necessárias à visita, trate-as com discrição e não as compartilhe fora da finalidade do aplicativo."],
  ["6. Uso adequado", "O app destina-se ao uso pessoal. Não é permitido usá-lo para fins comerciais, enviar conteúdo ofensivo, tentar acessar dados de outras congregações, burlar a segurança, nem extrair, copiar em massa, redistribuir ou explorar comercialmente os conteúdos exibidos."],
  ["7. Conteúdo pessoal e backups", "Esboços, anotações e anexos são seus. Muitos ficam guardados apenas no seu aparelho, por isso faça backups regularmente."],
  ["8. Conteúdos de terceiros", `O app não inclui nem distribui textos bíblicos ou publicações. A Bíblia e as anotações do JW Library só aparecem a partir de arquivos que o próprio usuário importa no seu aparelho. Esses conteúdos continuam sendo propriedade de seus detentores de direitos; o Visita SC não reivindica sua titularidade, não os vende, não os licencia e não obtém receita com eles, e eles servem apenas para consulta e estudo pessoal, privado e não comercial. Se você é detentor de direitos e considera que algum conteúdo viola seus direitos, escreva para ${TERMS_CONTACT_EMAIL}; o conteúdo será prontamente removido ou desativado.`],
  ["9. Disponibilidade e responsabilidade", "O app é oferecido \"no estado em que se encontra\" e \"conforme disponível\", sem garantias de qualquer tipo, na medida permitida por lei. Podemos fazer melhorias, pausas para manutenção ou mudanças nas funções, buscando sempre preservar seus dados. Na medida permitida pela lei aplicável, o desenvolvedor não responde por danos indiretos ou consequentes do uso do app, incluindo a perda de dados guardados apenas no aparelho. Nada nestes Termos limita os direitos que a lei do seu país lhe garante como consumidor."],
  ["10. Privacidade", "O tratamento dos dados segue a Política de Privacidade, que faz parte destes termos."],
  ["11. Alterações", "Estes Termos podem ser atualizados. Em mudanças importantes, você verá um aviso no app e precisará aceitar a nova versão para continuar. A versão em vigor fica sempre disponível nesta página."],
  ["12. Lei aplicável e foro", "Estes Termos são regidos pela lei brasileira. Se você for consumidor, mantém a proteção das normas obrigatórias do seu país de residência e, quando a lei assim prever, a competência dos tribunais do seu local de residência. Não se aplica nenhuma arbitragem obrigatória."],
];

export function TermsContent() {
  return (
    <>
      <p className="text-xs text-muted-foreground">Última atualização: {TERMS_VERSION_LABEL}</p>
      {TERMS_SECTIONS.map(([title, body]) => (
        <section key={title} className="space-y-1">
          <h2 className="font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{body}</p>
        </section>
      ))}
    </>
  );
}
