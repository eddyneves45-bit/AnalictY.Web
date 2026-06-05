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

**Fase atual:** W1 - Base do Web

- [x] Criar README
- [ ] Copiar documentação WEB_SCOPE.md
- [ ] Copiar .gitignore
- [ ] Copiar frontend
- [ ] Remover rotas técnicas
- [ ] Build

## Próximos Passos

1. Copiar frontend do `scada_mes`
2. Remover telas técnicas (logs, database-browser, etc.)
3. Ajustar URL da API para apontar para Server
4. Build e validação

## Documentação

- [Escopo do Web](docs/WEB_SCOPE.md)

## Plataforma AnalictY

Este é um dos três produtos da plataforma:

- **AnalictY.Server** - Backend/Runtime
- **AnalictY.Web** (este repositório) - Interface operacional web
- **AnalictY.Manager** - Aplicativo Windows para administração local
