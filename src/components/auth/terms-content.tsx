export const TERMS_SECTIONS: Array<[string, string]> = [
  ["1. Finalidade", "O Visita SC ajuda superintendentes de circuito, anciãos e a esposa do superintendente a organizar a semana de visita: programação, reuniões, refeições, transporte, esboços e anotações."],
  ["2. Sua conta", "Você é responsável por manter sua senha, PIN e códigos de acesso em sigilo e por tudo o que for feito com sua conta. Avise o superintendente se suspeitar de uso indevido."],
  ["3. Dados de outras pessoas", "Inclua apenas as informações de irmãos e famílias necessárias à visita, trate-as com discrição e não as compartilhe fora da finalidade do aplicativo."],
  ["4. Uso adequado", "Não é permitido usar o aplicativo para fins comerciais, enviar conteúdo ofensivo, tentar acessar dados de outras congregações ou burlar a segurança."],
  ["5. Conteúdo pessoal", "Esboços, anotações e anexos são seus. Muitos ficam guardados apenas no seu aparelho, por isso faça backups regularmente."],
  ["6. Disponibilidade", "O serviço é oferecido como está. Podemos fazer melhorias, pausas para manutenção ou mudanças nas funções, buscando sempre preservar seus dados."],
  ["7. Privacidade", "O tratamento dos dados segue a Política de Privacidade, que faz parte destes termos."],
  ["8. Alterações", "Estes termos podem ser atualizados. A versão em vigor fica sempre disponível nesta página."],
];

export function TermsContent() {
  return (
    <>
      {TERMS_SECTIONS.map(([title, body]) => (
        <section key={title} className="space-y-1">
          <h2 className="font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{body}</p>
        </section>
      ))}
    </>
  );
}
