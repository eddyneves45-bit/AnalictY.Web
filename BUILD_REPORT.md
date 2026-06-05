# Relatório de Build - AnalictY.Web

## Data
05/06/2026

## Status
✅ **Build com êxito**

## Comandos Executados
```powershell
cd frontend
npm install
npm run build
```

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

## Rotas Mantidas (Operacionais)
- / (home)
- /alerts
- /bi (Business Intelligence)
- /config (apenas parte operacional)
- /dashboard
- /dashboards
- /downtime-reasons
- /help
- /machines
- /mes-dashboard
- /principal
- /production-history
- /report
- /shifts
- /status
- /tags

## Build Output
✓ Compiled successfully in 10.1s
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (27/27)
✓ Collecting build traces

## Páginas Geradas
27 páginas estáticas/dinâmicas

## Erros
0 erros

## Próximos Passos
1. Ajustar URL da API para apontar para AnalictY.Server
2. Remover referências às rotas técnicas na navegação
3. Testar integração com Server

## Observações
- Frontend copiado do `scada_mes` sem alterações de código
- Apenas rotas técnicas foram removidas fisicamente
- Configuração operacional em /config precisa ser limpa de seções técnicas
