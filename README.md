# AnalictY.Web

Interface operacional web da plataforma AnalictY.

## Responsabilidades

- Visão geral da produção
- Status das máquinas
- Histórico de produção
- Histórico de paradas
- Relatórios operacionais
- Alertas operacionais
- Dashboards
- Configurações operacionais simples

## Tecnologias

- Next.js 15
- React 18
- TypeScript
- Tailwind CSS
- SignalR (tempo real)

## Estrutura

```text
app/
├── alerts/              # Alertas operacionais
├── dashboard/          # Dashboards
├── machines/           # Máquinas e status
├── production-history/ # Histórico de produção
├── downtime-reasons/   # Motivos de parada
├── report/             # Relatórios
├── bi/                 # Business Intelligence
├── config/             # Configurações operacionais
├── tags/               # TAGs
├── shifts/             # Turnos
└── help/               # Ajuda ao usuário
```

## Status da Migração

Este repositório está sendo migrado progressivamente do `scada_mes`.

**Fase atual:** W2 - Web limpo e compilando

- [x] Criar README
- [x] Copiar documentação WEB_SCOPE.md
- [x] Copiar .gitignore
- [x] Copiar frontend
- [x] Remover rotas técnicas (14 rotas removidas)
- [x] Limpar config/page.tsx (removidas seções técnicas)
- [x] Remover lógica de /security
- [x] Build validado após limpeza

## Rotas Removidas (Técnicas - vão para Manager)
- /logs
- /local-server
- /database-browser
- /mysql-console
- /mqtt-monitor
- /opc-browser
- /security
- /connections
- /production-diagnostics
- /simulator
- /audit
- /users
- /weintek-browser
- /telegram-notifications

## Próximos Passos

1. Configurar NEXT_PUBLIC_API_URL em .env.local para apontar para Server
2. Testar integração Server ↔ Web
3. Validar endpoints principais

## Documentação

- [Escopo do Web](docs/WEB_SCOPE.md)

## Plataforma AnalictY

Este é um dos três produtos da plataforma:

- **AnalictY.Server** - Backend/Runtime
- **AnalictY.Web** (este repositório) - Interface operacional web
- **AnalictY.Manager** - Aplicativo Windows para administração local
