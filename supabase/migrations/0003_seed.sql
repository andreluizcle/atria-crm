-- =============================================================================
-- 0003_seed.sql — templates de exemplo, um por plataforma
-- =============================================================================
-- Serve para o bot ter o que mostrar em /enviarmensagem logo no primeiro uso.
-- Pode rodar de novo sem duplicar (idempotente por titulo).
--
-- Variaveis disponiveis na interpolacao (ver core/src/validacao/interpolar.ts):
--   {{nome}} {{telefone}} {{email}} {{site}} {{instagram}} {{linkedin}}
--   {{cnpj}} {{origem_lead}} {{status}} {{responsavel}}
-- =============================================================================

insert into public.mensagens_prontas (titulo, plataforma, assunto, conteudo)
values
  (
    'Primeiro contato — WhatsApp',
    'whatsapp',
    null,
    E'Ola, {{nome}}! Tudo bem?\n\n' ||
    E'Sou {{responsavel}}, da Atria, empresa junior da universidade. ' ||
    E'Trabalhamos com projetos sob medida para negocios como o seu, com preco de EJ ' ||
    E'e acompanhamento de professores.\n\n' ||
    E'Faz sentido marcarmos uma conversa rapida de 15 minutos essa semana?'
  ),
  (
    'Primeiro contato — Instagram',
    'instagram',
    null,
    E'Oi, {{nome}}! Vi o perfil de voces por aqui e curti muito o trabalho.\n\n' ||
    E'Sou {{responsavel}}, da Atria (empresa junior). A gente ajuda negocios ' ||
    E'como o de voces com projetos sob medida.\n\n' ||
    E'Posso te mandar mais detalhes?'
  ),
  (
    'Primeiro contato — LinkedIn',
    'linkedin',
    null,
    E'Ola, {{nome}}!\n\n' ||
    E'Sou {{responsavel}}, da Atria, empresa junior da universidade. ' ||
    E'Atendemos empresas com projetos sob medida, com custo acessivel e ' ||
    E'orientacao academica.\n\n' ||
    E'Teria interesse em uma conversa rapida para eu entender melhor os desafios de voces?'
  ),
  (
    'Primeiro contato — E-mail',
    'email',
    'Proposta de parceria — Atria Empresa Junior',
    E'Ola, {{nome}}!\n\n' ||
    E'Meu nome e {{responsavel}} e faco parte da Atria, a empresa junior da nossa universidade.\n\n' ||
    E'Desenvolvemos projetos sob medida para empresas, com preco acessivel e ' ||
    E'acompanhamento de professores da area. Chegamos ate voces por {{origem_lead}}.\n\n' ||
    E'Se fizer sentido, posso te apresentar nosso portfolio em uma call de 15 minutos. ' ||
    E'Qual o melhor dia para voce?\n\n' ||
    E'Um abraco,\n{{responsavel}}\nAtria Empresa Junior'
  )
on conflict (titulo) do nothing;
