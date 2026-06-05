'use client'

import React, { useMemo, useState } from 'react'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { usePageReady } from '@/components/providers/navigation-feedback-provider'
import {
  AlertTriangle,
  BarChart3,
  BellRing,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Database,
  Download,
  Factory,
  FileText,
  Gauge,
  HardDrive,
  History,
  Info,
  LayoutDashboard,
  MessageCircle,
  Network,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  UserCog,
  Wrench,
} from 'lucide-react'

type HelpMode = 'user' | 'setup' | 'technical'

type HelpArticle = {
  id: string
  mode: HelpMode
  category: string
  title: string
  summary: string
  icon: React.ComponentType<{ className?: string }>
  keywords: string[]
  sections: Array<{
    heading: string
    body: string[]
    steps?: string[]
  }>
}

const modes: Array<{ id: HelpMode; label: string; description: string }> = [
  {
    id: 'user',
    label: 'Usando o Sistema',
    description: 'Operação diária, consultas, relatórios e interpretação das telas.',
  },
  {
    id: 'setup',
    label: 'Configuração Básica',
    description: 'Cadastros e ajustes que preparam o AnalictY para funcionar na fábrica.',
  },
  {
    id: 'technical',
    label: 'Administração Técnica',
    description: 'Instalação, atualização, banco local, integrações e diagnóstico técnico.',
  },
]

const articles: HelpArticle[] = [
  {
    id: 'user-start',
    mode: 'user',
    category: 'Primeiros passos',
    title: 'Entrar e navegar no AnalictY',
    summary: 'Entenda a estrutura principal do sistema e como se orientar nas telas.',
    icon: BookOpen,
    keywords: ['entrar', 'login', 'menu', 'navegação', 'começar', 'sistema'],
    sections: [
      {
        heading: 'Visão geral',
        body: [
          'O AnalictY é uma plataforma de acompanhamento industrial. Ele organiza máquinas, produção, status, paradas, alertas e relatórios em uma interface única.',
          'O menu lateral é o ponto principal de navegação. Nele ficam as telas de operação, histórico, relatórios, alertas, configurações e ajuda.',
        ],
      },
      {
        heading: 'Fluxo de uso recomendado',
        body: ['Para usar o sistema no dia a dia, siga uma sequência simples.'],
        steps: [
          'Entre com seu usuário e senha.',
          'Abra a tela Visão Geral.',
          'Escolha uma máquina, se quiser analisar um equipamento específico.',
          'Consulte Status, Histórico de Produção, Histórico de Paradas ou Relatório conforme a necessidade.',
          'Use Ajuda sempre que precisar entender uma tela ou procedimento.',
        ],
      },
    ],
  },
  {
    id: 'principal',
    mode: 'user',
    category: 'Operação',
    title: 'Visão Geral dos Equipamentos',
    summary: 'Tela principal para acompanhar o estado atual da fábrica.',
    icon: LayoutDashboard,
    keywords: ['principal', 'visão geral', 'máquinas', 'cards', 'status', 'filtros'],
    sections: [
      {
        heading: 'Para que serve',
        body: [
          'A Visão Geral mostra todas as máquinas cadastradas e resume a situação da fábrica no momento atual.',
          'Use essa tela para saber rapidamente quantas máquinas estão cadastradas, rodando, ociosas, inativas ou em manutenção.',
        ],
      },
      {
        heading: 'Indicadores superiores',
        body: [
          'Total Máquinas mostra a quantidade de equipamentos cadastrados.',
          'Total em Operação mostra quantas máquinas estão em produção.',
          'Total em Manutenção mostra máquinas em estado de manutenção.',
          'Total Ociosas mostra máquinas sem produção ou aguardando operação.',
        ],
      },
      {
        heading: 'Filtros',
        body: ['Os filtros ajudam a encontrar rapidamente o equipamento certo.'],
        steps: [
          'Use Setor para visualizar uma área específica da fábrica.',
          'Use Centro de Custo para separar linhas, células ou departamentos.',
          'Use Status para filtrar máquinas rodando, ociosas, inativas ou em manutenção.',
          'Use Buscar para localizar por nome ou código.',
        ],
      },
    ],
  },
  {
    id: 'select-machine',
    mode: 'user',
    category: 'Operação',
    title: 'Selecionar uma máquina',
    summary: 'Como escolher uma máquina e usar essa seleção nas demais telas.',
    icon: Factory,
    keywords: ['selecionar', 'máquina', 'dashboard', 'favorito', 'pj08'],
    sections: [
      {
        heading: 'Como funciona',
        body: [
          'Ao clicar no cartão de uma máquina, ela passa a ser a Máquina Selecionada no menu lateral.',
          'Essa seleção serve como referência para dashboards, status, históricos, BI e relatórios.',
        ],
      },
      {
        heading: 'Quando usar',
        body: [
          'Use a seleção quando quiser analisar uma máquina específica, por exemplo PJ08, uma prensa, um forno ou uma linha de produção.',
          'Para trocar de máquina, volte à Visão Geral e clique em outro equipamento.',
        ],
      },
    ],
  },
  {
    id: 'status',
    mode: 'user',
    category: 'Operação',
    title: 'Status da máquina',
    summary: 'Acompanhe o estado operacional e o tempo em cada condição.',
    icon: Gauge,
    keywords: ['status', 'rodando', 'ociosa', 'manutenção', 'inativa', 'tempo'],
    sections: [
      {
        heading: 'O que a tela mostra',
        body: [
          'A tela Status mostra a condição da máquina no período selecionado.',
          'Ela ajuda a entender quanto tempo a máquina ficou produzindo, ociosa, em manutenção ou inativa.',
        ],
      },
      {
        heading: 'Como interpretar',
        body: [
          'Produzindo indica tempo útil de operação.',
          'Ociosa indica tempo sem produção, normalmente aguardando operador, material, setup ou outra condição.',
          'Manutenção indica parada relacionada a intervenção técnica.',
          'Inativa indica equipamento desligado, sem sinal ou fora do período operacional.',
        ],
      },
    ],
  },
  {
    id: 'production-history',
    mode: 'user',
    category: 'Históricos',
    title: 'Histórico de Produção',
    summary: 'Consulte a produção por hora, dia e período.',
    icon: History,
    keywords: ['histórico', 'produção', 'matriz', 'hora', 'dia', 'contador'],
    sections: [
      {
        heading: 'Para que serve',
        body: [
          'O Histórico de Produção mostra quanto a máquina produziu dentro do período escolhido.',
          'A visualização em matriz facilita comparar produção por hora e por dia.',
        ],
      },
      {
        heading: 'Como consultar',
        body: ['Use esta sequência para consultar a produção.'],
        steps: [
          'Selecione a máquina na Visão Geral.',
          'Abra Histórico Produção no menu lateral.',
          'Escolha data inicial, data final e horário.',
          'Clique em Carregar.',
          'Analise os valores por hora e o total produzido.',
        ],
      },
      {
        heading: 'Se aparecer vazio',
        body: [
          'Confira se a máquina correta está selecionada e se o período realmente teve produção.',
          'Se a máquina acabou de ser configurada, confirme com o administrador se a tag de produção foi vinculada corretamente.',
        ],
      },
    ],
  },
  {
    id: 'downtime-history',
    mode: 'user',
    category: 'Históricos',
    title: 'Histórico de Paradas',
    summary: 'Veja quando a máquina parou, por quanto tempo e por qual motivo.',
    icon: AlertTriangle,
    keywords: ['paradas', 'motivo', 'downtime', 'histórico', 'ociosa', 'manutenção'],
    sections: [
      {
        heading: 'Para que serve',
        body: [
          'O Histórico de Paradas ajuda a identificar perdas de disponibilidade.',
          'Ele mostra eventos de parada, duração e motivo informado ou detectado.',
        ],
      },
      {
        heading: 'Como usar',
        body: [
          'Selecione a máquina e o período desejado.',
          'Use os registros para entender padrões de parada, causas frequentes e oportunidades de melhoria.',
        ],
      },
    ],
  },
  {
    id: 'reports',
    mode: 'user',
    category: 'Consultas',
    title: 'Relatórios',
    summary: 'Gere consultas e arquivos para análise de produção, status e paradas.',
    icon: FileText,
    keywords: ['relatório', 'csv', 'produção', 'status', 'paradas', 'exportar'],
    sections: [
      {
        heading: 'Tipos de relatório',
        body: [
          'Produção: mostra quantidades produzidas no período.',
          'Status: mostra tempo em produção, ociosidade, manutenção e inatividade.',
          'Paradas: mostra eventos de parada e suas durações.',
        ],
      },
      {
        heading: 'Como gerar',
        body: ['O processo é simples e segue o padrão das demais consultas.'],
        steps: [
          'Escolha a máquina.',
          'Escolha o tipo de relatório.',
          'Informe o período.',
          'Clique para visualizar ou exportar.',
        ],
      },
    ],
  },
  {
    id: 'alerts-user',
    mode: 'user',
    category: 'Operação',
    title: 'Alertas',
    summary: 'Entenda avisos importantes sobre máquinas, produção e eventos.',
    icon: BellRing,
    keywords: ['alertas', 'aviso', 'notificação', 'telegram', 'evento'],
    sections: [
      {
        heading: 'O que são alertas',
        body: [
          'Alertas são avisos automáticos criados para chamar atenção sobre situações importantes.',
          'Eles podem indicar máquina parada, valor fora do esperado, falha de comunicação ou outras condições configuradas.',
        ],
      },
      {
        heading: 'Como agir',
        body: [
          'Leia o alerta, identifique a máquina e verifique a tela relacionada.',
          'Quando aplicável, registre a causa, acione manutenção ou acompanhe a recuperação do equipamento.',
        ],
      },
    ],
  },
  {
    id: 'empty-screens',
    mode: 'user',
    category: 'Dúvidas comuns',
    title: 'Quando uma tela aparece vazia',
    summary: 'Checklist simples para usuários antes de chamar suporte.',
    icon: CircleHelp,
    keywords: ['vazio', 'sem dados', 'não aparece', 'filtro', 'período'],
    sections: [
      {
        heading: 'Verifique primeiro',
        body: ['A maior parte dos casos está relacionada a seleção ou período.'],
        steps: [
          'Confirme se a máquina correta está selecionada.',
          'Confira se o período escolhido contém dados.',
          'Remova filtros muito restritivos.',
          'Atualize a tela.',
          'Se continuar vazio, peça ao administrador para verificar tags e integrações.',
        ],
      },
    ],
  },
  {
    id: 'machine-setup',
    mode: 'setup',
    category: 'Cadastros',
    title: 'Cadastrar máquinas',
    summary: 'Registre os equipamentos que serão acompanhados no AnalictY.',
    icon: Factory,
    keywords: ['cadastro', 'máquina', 'equipamento', 'centro de custo', 'setor'],
    sections: [
      {
        heading: 'Informações principais',
        body: [
          'Uma máquina deve ter nome, código, centro de custo, setor ou localização e status ativo.',
          'O código deve ser claro e único, pois aparece em filtros, relatórios e telas de operação.',
        ],
      },
      {
        heading: 'Boas práticas',
        body: [
          'Use nomes que o operador reconhece no chão de fábrica.',
          'Padronize códigos por linha, célula ou equipamento para facilitar busca e relatórios.',
        ],
      },
    ],
  },
  {
    id: 'tag-setup',
    mode: 'setup',
    category: 'Cadastros',
    title: 'Cadastrar tags',
    summary: 'Crie variáveis industriais para produção, status, paradas e perdas.',
    icon: SlidersHorizontal,
    keywords: ['tag', 'contador', 'status', 'driver', 'endereço', 'produção'],
    sections: [
      {
        heading: 'O que é uma tag',
        body: [
          'Tag é uma variável recebida do equipamento, CLP, supervisório, IHM ou gateway.',
          'Exemplos: contador de produção, status da máquina, motivo de parada e contador de perdas.',
        ],
      },
      {
        heading: 'Campos importantes',
        body: [
          'Driver indica a origem do dado, como OPC UA, MQTT, Weintek REST ou virtual.',
          'Endereço indica onde o Runtime deve encontrar o valor.',
          'Tipo de dado informa se o valor é número, texto, booleano ou outro formato.',
        ],
      },
    ],
  },
  {
    id: 'mapping-setup',
    mode: 'setup',
    category: 'Cadastros',
    title: 'Vincular tags à máquina',
    summary: 'Transforme valores recebidos em informações de produção e parada.',
    icon: ClipboardList,
    keywords: ['mapeamento', 'vincular', 'produção', 'status', 'motivo', 'perdas'],
    sections: [
      {
        heading: 'Por que vincular',
        body: [
          'Receber uma tag não basta para gerar indicadores. O sistema precisa saber o papel daquela tag dentro da máquina.',
          'O mapeamento informa se a tag representa produção, status, motivo de parada, perdas ou outra função.',
        ],
      },
      {
        heading: 'Mapeamentos comuns',
        body: [
          'production_counter: contador de produção.',
          'machine_status: status operacional da máquina.',
          'downtime_reason_code: código do motivo de parada.',
          'loss_count: contador de perdas.',
        ],
      },
    ],
  },
  {
    id: 'shift-setup',
    mode: 'setup',
    category: 'Cadastros',
    title: 'Cadastrar turnos',
    summary: 'Organize relatórios e indicadores por período de trabalho.',
    icon: BarChart3,
    keywords: ['turno', 'horário', 'produção', 'relatório'],
    sections: [
      {
        heading: 'Função dos turnos',
        body: [
          'Turnos permitem separar produção por período de trabalho.',
          'Eles são usados em relatórios, BI e matrizes de produção.',
        ],
      },
      {
        heading: 'Atenção',
        body: [
          'Turnos que passam da meia-noite devem ter horários bem definidos para evitar interpretação incorreta do período.',
          'Mantenha os turnos atualizados quando houver mudança de escala.',
        ],
      },
    ],
  },
  {
    id: 'reasons-setup',
    mode: 'setup',
    category: 'Cadastros',
    title: 'Motivos de parada',
    summary: 'Cadastre causas para analisar perdas de disponibilidade.',
    icon: AlertTriangle,
    keywords: ['motivo', 'parada', 'setup', 'manutenção', 'material'],
    sections: [
      {
        heading: 'Para que serve',
        body: [
          'Motivos de parada ajudam a explicar por que uma máquina ficou sem produzir.',
          'Com motivos padronizados, a análise de perdas fica mais confiável.',
        ],
      },
      {
        heading: 'Exemplos',
        body: [
          'Aguardando material, setup, manutenção corretiva, manutenção preventiva, falta de operador e qualidade.',
          'Evite motivos genéricos demais, pois eles dificultam a análise posterior.',
        ],
      },
    ],
  },
  {
    id: 'telegram-setup',
    mode: 'setup',
    category: 'Notificações',
    title: 'Configurar Telegram',
    summary: 'Envie alertas e avisos para pessoas ou grupos fora da tela do sistema.',
    icon: MessageCircle,
    keywords: ['telegram', 'bot', 'chat', 'notificação', 'alerta'],
    sections: [
      {
        heading: 'Objetivo',
        body: [
          'O Telegram serve para avisar operadores, líderes, manutenção ou supervisores quando ocorrer uma situação importante.',
          'Ele complementa os alertas internos do sistema.',
        ],
      },
      {
        heading: 'Configuração básica',
        body: ['O administrador normalmente faz esta configuração.'],
        steps: [
          'Criar ou usar um bot do Telegram.',
          'Informar o token do bot no AnalictY.',
          'Informar o chat ou grupo que receberá as mensagens.',
          'Enviar uma mensagem de teste.',
          'Associar regras de alerta às notificações.',
        ],
      },
      {
        heading: 'Boas práticas',
        body: [
          'Mensagens devem ser curtas e indicar máquina, horário, condição e severidade.',
          'Evite excesso de mensagens repetidas para não reduzir a atenção da equipe.',
        ],
      },
    ],
  },
  {
    id: 'users-setup',
    mode: 'setup',
    category: 'Segurança',
    title: 'Usuários e permissões',
    summary: 'Controle quem pode consultar, configurar e administrar o sistema.',
    icon: UserCog,
    keywords: ['usuário', 'permissão', 'admin', 'segurança', 'login'],
    sections: [
      {
        heading: 'Perfis',
        body: [
          'Usuários comuns devem acessar telas de operação e consulta.',
          'Administradores podem configurar máquinas, tags, integrações, usuários e permissões.',
        ],
      },
      {
        heading: 'Recomendação',
        body: [
          'Dê permissões administrativas apenas para pessoas responsáveis por manutenção do sistema.',
          'Use contas individuais para facilitar auditoria e rastreabilidade.',
        ],
      },
    ],
  },
  {
    id: 'config-screen',
    mode: 'setup',
    category: 'Configurações',
    title: 'O que existe em Configurações',
    summary: 'Resumo dos blocos disponíveis na área de configuração.',
    icon: Settings,
    keywords: ['configurações', 'opc ua', 'mqtt', 'mysql', 'weintek', 'tags', 'máquinas'],
    sections: [
      {
        heading: 'Conexões',
        body: [
          'OPC UA configura leitura de dados por servidor OPC UA.',
          'MQTT configura recebimento de mensagens por tópico.',
          'Weintek REST configura recebimento de JSON por POST.',
          'MySQL configura a base MES onde eventos e resumos são armazenados.',
        ],
      },
      {
        heading: 'Produção e operação',
        body: [
          'Máquinas, tags, turnos, simulador e diagnóstico de produção ficam nessa área.',
          'Use Diagnóstico de Produção quando precisar conferir o caminho completo do dado até o relatório.',
        ],
      },
      {
        heading: 'Sistema',
        body: [
          'A área de sistema mostra versão instalada, canal, origem, pasta de dados e opções de atualização.',
          'Também concentra ajustes gerais usados pelo Runtime.',
        ],
      },
    ],
  },
  {
    id: 'technical-architecture',
    mode: 'technical',
    category: 'Arquitetura',
    title: 'Como o AnalictY funciona por dentro',
    summary: 'Explicação técnica do Runtime, frontend, Agent e bancos.',
    icon: Network,
    keywords: ['runtime', 'backend', 'frontend', 'agent', 'arquitetura'],
    sections: [
      {
        heading: 'Componentes',
        body: [
          'Backend .NET executa API, runtime de tags, filas, persistência, relatórios e integrações.',
          'Frontend Next/Node entrega a interface web para usuários.',
          'Agent fica na bandeja do Windows e serve como ponto local de controle.',
          'SQLite guarda configurações locais e snapshots. MySQL guarda eventos MES e históricos consolidados.',
        ],
      },
    ],
  },
  {
    id: 'technical-install',
    mode: 'technical',
    category: 'Instalação',
    title: 'Instalação, atualização e reinstalação',
    summary: 'Diferença entre instalador completo e pacote de atualização.',
    icon: Download,
    keywords: ['instalar', 'atualizar', 'setup', 'zip', 'reinstalar'],
    sections: [
      {
        heading: 'Instalador completo',
        body: [
          'Use AnalictY-Setup-x.x.x.exe para instalação do zero ou reinstalação completa.',
          'Ele inclui backend, frontend, Agent, Node runtime, scripts e serviços Windows.',
        ],
      },
      {
        heading: 'Atualização local',
        body: [
          'Use AnalictY-x.x.x.zip como pacote de update.',
          'A aplicação da atualização é feita pelo script C:\\Program Files\\AnalictY\\updater\\apply-update.ps1.',
        ],
      },
      {
        heading: 'Backup',
        body: [
          'Antes de reinstalar, faça backup de C:\\ProgramData\\AnalictY.',
          'Se existir C:\\Program Files\\AnalictY\\data, copie essa pasta também.',
        ],
      },
    ],
  },
  {
    id: 'technical-sqlite',
    mode: 'technical',
    category: 'Banco de dados',
    title: 'SQLite local',
    summary: 'Base local de configuração, snapshots e filas.',
    icon: Database,
    keywords: ['sqlite', 'banco', 'backup', 'programdata', 'dados'],
    sections: [
      {
        heading: 'Função',
        body: [
          'O SQLite guarda usuários, permissões, máquinas, tags, mapeamentos, conexões, snapshots e filas locais.',
          'Ele é essencial para preservar a configuração da instalação.',
        ],
      },
      {
        heading: 'Localizar banco',
        body: [
          'Use PowerShell: Get-ChildItem "C:\\ProgramData\\AnalictY","C:\\Program Files\\AnalictY" -Recurse -Include *.db,*.sqlite,*.sqlite3',
        ],
      },
    ],
  },
  {
    id: 'technical-weintek',
    mode: 'technical',
    category: 'Integrações',
    title: 'Weintek REST',
    summary: 'Recebimento de POST JSON e publicação realtime.',
    icon: Network,
    keywords: ['weintek', 'rest', 'post', 'json', 'queued_tags', 'matched_created_tags'],
    sections: [
      {
        heading: 'Fluxo técnico',
        body: [
          'A IHM ou gateway envia POST JSON para /api/weintek/ingest.',
          'O backend descobre os endereços, cruza com tags criadas e envia os valores para a fila de tags.',
          'A fila alimenta runtime, snapshot, persistência MES, alertas e realtime para a tela.',
        ],
      },
      {
        heading: 'Diagnóstico',
        body: [
          'matched_created_tags indica quantas tags criadas bateram com o payload.',
          'queued_tags indica quantas tags entraram na fila realtime.',
          'Se ambos vierem 0, normalmente o endereço gerado pelo JSON não bate com o cadastro.',
        ],
      },
    ],
  },
  {
    id: 'technical-services',
    mode: 'technical',
    category: 'Sistema',
    title: 'Portas e serviços Windows',
    summary: 'Portas principais e health check do Runtime.',
    icon: HardDrive,
    keywords: ['porta', 'serviço', 'windows', 'health', 'firewall'],
    sections: [
      {
        heading: 'Portas',
        body: [
          'Frontend: porta 3000, usada para acesso web.',
          'Backend: porta 5000, usada pela API local.',
          'Health check: http://127.0.0.1:5000/api/system/health deve retornar healthy.',
        ],
      },
      {
        heading: 'Serviços',
        body: [
          'Os serviços Windows mantêm backend e frontend ativos após o boot.',
          'O Agent pode ser fechado sem parar o Runtime.',
        ],
      },
    ],
  },
  {
    id: 'technical-troubleshooting',
    mode: 'technical',
    category: 'Suporte',
    title: 'Solução de problemas',
    summary: 'Pontos de verificação para suporte e automação.',
    icon: Wrench,
    keywords: ['erro', 'f5', 'sem dados', 'falha', 'diagnóstico', 'logs'],
    sections: [
      {
        heading: 'Tela só atualiza com F5',
        body: [
          'Verifique se a origem de dados está passando pela fila realtime.',
          'Em Weintek REST, confira queued_tags no retorno do POST.',
        ],
      },
      {
        heading: 'Histórico zerado',
        body: [
          'Use Diagnóstico de Produção para comparar TAG, fila, eventos_producao, resumos_producao_hora e matriz do relatório.',
          'Se o diagnóstico tem dados e o histórico não, verifique filtro, máquina selecionada e permissões.',
        ],
      },
      {
        heading: 'Logs',
        body: [
          'Os logs locais ficam em C:\\ProgramData\\AnalictY\\logs.',
        ],
      },
    ],
  },
]

export default function HelpPage() {
  const [mode, setMode] = useState<HelpMode>('user')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState('principal')
  usePageReady(true)

  const currentMode = modes.find((item) => item.id === mode) ?? modes[0]

  const filteredArticles = useMemo(() => {
    const normalizedQuery = normalize(query)
    return articles.filter((article) => {
      if (article.mode !== mode) return false
      if (!normalizedQuery) return true

      const haystack = normalize([
        article.category,
        article.title,
        article.summary,
        ...article.keywords,
        ...article.sections.flatMap((section) => [section.heading, ...section.body, ...(section.steps ?? [])]),
      ].join(' '))

      return haystack.includes(normalizedQuery)
    })
  }, [mode, query])

  const groupedArticles = useMemo(() => {
    return filteredArticles.reduce<Record<string, HelpArticle[]>>((groups, article) => {
      groups[article.category] ??= []
      groups[article.category].push(article)
      return groups
    }, {})
  }, [filteredArticles])

  const selectedArticle = filteredArticles.find((article) => article.id === selectedId)
    ?? filteredArticles[0]
    ?? articles.find((article) => article.mode === mode)
    ?? articles[0]
  const SelectedIcon = selectedArticle.icon

  function changeMode(nextMode: HelpMode) {
    setMode(nextMode)
    setQuery('')
    setSelectedId(articles.find((article) => article.mode === nextMode)?.id ?? articles[0].id)
  }

  return (
    <ProtectedLayout>
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm">
        <aside className="flex w-96 shrink-0 flex-col border-r border-gray-300 bg-gray-50">
          <div className="border-b border-gray-300 p-4">
            <div className="flex items-center gap-2">
              <CircleHelp className="h-5 w-5 text-red-600" />
              <h1 className="text-lg font-bold text-gray-900">Ajuda AnalictY</h1>
            </div>

            <div className="mt-4 grid gap-2">
              {modes.map((item) => (
                <button
                  key={item.id}
                  onClick={() => changeMode(item.id)}
                  className={`rounded-md border px-3 py-2 text-left transition-colors ${
                    item.id === mode
                      ? 'border-red-300 bg-red-50 text-red-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="block text-sm font-bold">{item.label}</span>
                  <span className="mt-0.5 block text-xs leading-4 text-gray-500">{item.description}</span>
                </button>
              ))}
            </div>

            <div className="relative mt-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Pesquisar ajuda..."
                className="h-10 w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
              />
            </div>
          </div>

          <nav className="min-h-0 flex-1 overflow-y-auto p-3">
            {Object.entries(groupedArticles).map(([category, items]) => (
              <div key={category} className="mb-4">
                <p className="mb-1 px-2 text-xs font-bold uppercase text-gray-500">{category}</p>
                <div className="space-y-1">
                  {items.map((article) => {
                    const Icon = article.icon
                    const isActive = article.id === selectedArticle.id
                    return (
                      <button
                        key={article.id}
                        onClick={() => setSelectedId(article.id)}
                        className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors ${
                          isActive
                            ? 'border border-red-200 bg-red-50 font-semibold text-red-700'
                            : 'text-gray-700 hover:bg-white hover:text-gray-950'
                        }`}
                      >
                        <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-red-600' : 'text-gray-500'}`} />
                        <span className="min-w-0 flex-1 truncate">{article.title}</span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            {filteredArticles.length === 0 && (
              <div className="rounded-md border border-gray-300 bg-white p-4 text-sm text-gray-500">
                Nenhum tópico encontrado.
              </div>
            )}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto">
          <article className="mx-auto max-w-5xl px-8 py-7">
            <header className="border-b border-gray-300 pb-5">
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-gray-900">
                  <SelectedIcon className="h-6 w-6 text-red-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase text-red-600">{currentMode.label}</p>
                  <h2 className="mt-1 text-2xl font-bold text-gray-950">{selectedArticle.title}</h2>
                  <p className="mt-2 text-sm text-gray-600">{selectedArticle.summary}</p>
                </div>
              </div>
            </header>

            <div className="mt-7 space-y-7">
              {selectedArticle.sections.map((section) => (
                <section key={section.heading} className="rounded-md border border-gray-200 bg-white p-5">
                  <h3 className="flex items-center gap-2 text-base font-bold text-gray-950">
                    <Info className="h-4 w-4 text-red-600" />
                    {section.heading}
                  </h3>
                  <div className="mt-3 space-y-3 text-sm leading-6 text-gray-700">
                    {section.body.map((paragraph) => (
                      <p key={paragraph}>{formatParagraph(paragraph)}</p>
                    ))}
                  </div>
                  {!!section.steps?.length && (
                    <ol className="mt-4 space-y-2">
                      {section.steps.map((step, index) => (
                        <li key={step} className="flex gap-3 text-sm text-gray-700">
                          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-red-600 text-xs font-bold text-white">
                            {index + 1}
                          </span>
                          <span className="pt-0.5">{formatParagraph(step)}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </section>
              ))}
            </div>

            <footer className="mt-8 grid gap-3 border-t border-gray-300 pt-5 md:grid-cols-3">
              <HelpHint icon={CheckCircle2} label="Operação" text="Comece por Visão Geral, selecione a máquina e consulte os históricos." />
              <HelpHint icon={Settings} label="Configuração" text="Cadastros corretos garantem indicadores e relatórios confiáveis." />
              <HelpHint icon={ShieldCheck} label="Suporte" text="Backup, logs e diagnóstico técnico ficam na área de Administração Técnica." />
            </footer>
          </article>
        </main>
      </div>
    </ProtectedLayout>
  )
}

function HelpHint({
  icon: Icon,
  label,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  text: string
}) {
  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
        <Icon className="h-4 w-4 text-red-600" />
        {label}
      </div>
      <p className="mt-2 text-xs leading-5 text-gray-600">{text}</p>
    </div>
  )
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function formatParagraph(value: string) {
  const parts = value.split(/(C:\\[^\s]+|\/api\/[^\s]+|http:\/\/[^\s]+|matched_created_tags|queued_tags|production_counter|healthy|AnalictY-[^\s]+\.zip|AnalictY-Setup-[^\s]+\.exe|apply-update\.ps1|eventos_producao|resumos_producao_hora)/g)
  return parts.map((part, index) =>
    /^(C:\\|\/api\/|http:\/\/|matched_created_tags|queued_tags|production_counter|healthy|AnalictY-|apply-update\.ps1|eventos_producao|resumos_producao_hora)/.test(part)
      ? <code key={`${part}-${index}`} className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-900">{part}</code>
      : <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>,
  )
}
