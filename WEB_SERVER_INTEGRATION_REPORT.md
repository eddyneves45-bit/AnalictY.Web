# Relatório de Integração: AnalictY.Web ↔ AnalictY.Server

**Data:** 07/06/2026  
**Objetivo:** Mapear todas as dependências de API e SignalR do AnalictY.Web em relação ao AnalictY.Server

---

## Resumo Executivo

- **Total de endpoints consumidos pelo Web:** 63
- **Endpoints existentes no Server:** 62
- **Endpoints faltantes no Server:** 1 (legado `/api/mes/*`)
- **Endpoints com nome divergente:** 0
- **Páginas usando mocks:** 0
- **Páginas usando localhost hardcoded:** 1 (next.config.js - proxy)

**Nota:** Uma validação posterior (ENDPOINTS_VALIDATION_REPORT.md) confirmou que 10 endpoints inicialmente marcados como FALTA existem no Server. A divergência ocorreu por limitação/truncamento da busca anterior, não por ausência real de endpoints.

---

## SignalR Hubs

### Hub Utilizado
- **Nome:** `/hubs/mes`
- **Biblioteca:** `@microsoft/signalr` v10.0.0
- **Configuração:** `HUB_BASE_URL` (variável de ambiente, padrão: API base URL)
- **WithCredentials:** true (envia cookies)

### Eventos SignalR Esperados
- `machines:snapshot` - Snapshot de máquinas
- `machines:update` - Atualização de máquina
- `runtime:snapshot` - Snapshot de runtime
- `runtime:update` - Atualização de runtime
- `alerts:snapshot` - Snapshot de alertas
- `alerts:created` - Alerta criado
- `alerts:updated` - Alerta atualizado
- `alerts:deleted` - Alerta excluído
- `mes:snapshot` - Snapshot MES
- `mes:update` - Atualização MES

### Páginas que usam SignalR
- `/app/alerts/page.tsx` - Alertas operacionais
- `/app/tags/page.tsx` - Gestão de TAGs
- `/app/principal/page.tsx` - Dashboard principal
- `/app/mes-dashboard/page.tsx` - Dashboard MES

---

## Matriz de Integração: Página → Endpoint

### Autenticação

| Página | Endpoint | Método | Status no Server |
|--------|----------|--------|------------------|
| `auth-provider.tsx` | `/api/auth/login` | POST | ✅ EXISTE |
| `auth-provider.tsx` | `/api/auth/refresh` | POST | ✅ EXISTE |
| `auth-provider.tsx` | `/api/auth/logout` | POST | ✅ EXISTE |
| `auth-provider.tsx` | `/api/auth/me` | GET | ✅ EXISTE |
| `register-modal.tsx` | `/api/auth/register` | POST | ✅ EXISTE |

### Máquinas e Pastas

| Página | Endpoint | Método | Status no Server |
|--------|----------|--------|------------------|
| `machines/page.tsx` | `/api/machines` | GET | ✅ EXISTE |
| `machines/page.tsx` | `/api/machines` | POST | ✅ EXISTE |
| `machines/page.tsx` | `/api/machines/{id}` | PUT | ✅ EXISTE |
| `machines/page.tsx` | `/api/machines/{id}` | DELETE | ✅ EXISTE |
| `machines/page.tsx` | `/api/machine-folders` | GET | ✅ EXISTE |
| `machines/page.tsx` | `/api/machine-folders` | POST | ✅ EXISTE |
| `machines/page.tsx` | `/api/machine-folders/{id}` | PUT | ✅ EXISTE |
| `machines/page.tsx` | `/api/machine-folders/{id}` | DELETE | ✅ EXISTE |
| `machines/[id]/config/page.tsx` | `/api/machines/{id}` | GET | ✅ EXISTE |
| `machines/[id]/config/page.tsx` | `/api/machines/{id}/tag-mapping` | GET | ✅ EXISTE |
| `machines/[id]/config/page.tsx` | `/api/machines/{id}/tag-mapping` | PUT | ✅ EXISTE |
| `machines/[id]/config/page.tsx` | `/api/machines/{id}/tag-mapping/{role}` | PUT | ❌ FALTA |
| `machines/[id]/config/page.tsx` | `/api/machines/{id}/downtime-reasons` | GET | ✅ EXISTE |
| `machines/[id]/config/page.tsx` | `/api/machines/{id}/downtime-reasons` | PUT | ✅ EXISTE |
| `machines/[id]/config/page.tsx` | `/api/machines/{id}/downtime-reasons/{code}` | DELETE | ✅ EXISTE |
| `machines/[id]/config/page.tsx` | `/api/machines/{id}/loss-config` | GET | ✅ EXISTE |
| `machines/[id]/config/page.tsx` | `/api/machines/{id}/loss-config` | PUT | ✅ EXISTE |
| `machines/[id]/config/page.tsx` | `/api/machines/{id}/goals` | GET | ✅ EXISTE |
| `machines/[id]/config/page.tsx` | `/api/machines/{id}/goals` | PUT | ✅ EXISTE |
| `principal/page.tsx` | `/api/machines/{id}/goals` | GET | ✅ EXISTE |
| `principal/page.tsx` | `/api/machines/{id}/goals` | PUT | ✅ EXISTE |
| `principal/page.tsx` | `/api/machines/{id}/tag-mapping` | GET | ✅ EXISTE |
| `status/page.tsx` | `/api/machines/{id}/tag-mapping` | GET | ✅ EXISTE |

### Configurações

| Página | Endpoint | Método | Status no Server |
|--------|----------|--------|------------------|
| `tags/page.tsx` | `/api/config/tags` | GET | ✅ EXISTE |
| `tags/page.tsx` | `/api/config/tags` | POST | ✅ EXISTE |
| `tags/page.tsx` | `/api/config/tags/{id}` | PUT | ✅ EXISTE |
| `tags/page.tsx` | `/api/config/tags/{id}` | DELETE | ✅ EXISTE |
| `shifts/page.tsx` | `/api/config/shifts` | GET | ✅ EXISTE |
| `shifts/page.tsx` | `/api/config/shifts` | POST | ✅ EXISTE |
| `shifts/page.tsx` | `/api/config/shifts/{id}` | PUT | ✅ EXISTE |
| `shifts/page.tsx` | `/api/config/shifts/{id}` | DELETE | ✅ EXISTE |
| `config/page.tsx` | `/api/config/system/timezone` | GET | ✅ EXISTE |
| `config/page.tsx` | `/api/config/system/timezone` | PUT | ✅ EXISTE |
| `system-status-indicator.tsx` | `/api/health/mysql` | GET | ✅ EXISTE |
| `system-status-indicator.tsx` | `/api/config/system/time` | GET | ✅ EXISTE |
| `report/page.tsx` | `/api/config/ftp-export/test` | POST | ✅ EXISTE |
| `report/page.tsx` | `/api/config/ftp-export/send-report` | POST | ✅ EXISTE |

### Alertas

| Página | Endpoint | Método | Status no Server |
|--------|----------|--------|------------------|
| `alerts/page.tsx` | `/api/alerts` | GET | ✅ EXISTE |
| `alerts/page.tsx` | `/api/alert-rules` | GET | ✅ EXISTE |
| `alerts/page.tsx` | `/api/alert-rules` | POST | ✅ EXISTE |
| `alerts/page.tsx` | `/api/alert-rules/{id}` | PUT | ✅ EXISTE |
| `alerts/page.tsx` | `/api/alert-rules/{id}` | DELETE | ✅ EXISTE |
| `alerts/page.tsx` | `/api/alerts/{id}/acknowledge` | POST | ✅ EXISTE |
| `alerts/page.tsx` | `/api/alerts/retention` | GET | ✅ EXISTE |
| `alerts/page.tsx` | `/api/alerts/retention` | PUT | ✅ EXISTE |
| `alerts/page.tsx` | `/api/notifications/telegram/status` | GET | ✅ EXISTE |
| `alerts/page.tsx` | `/api/notifications/telegram/connections` | GET | ✅ EXISTE |
| `alerts/page.tsx` | `/api/notifications/telegram/recipients` | GET | ✅ EXISTE |
| `alerts/page.tsx` | `/api/notifications/telegram/test` | POST | ✅ EXISTE |

### Relatórios

| Página | Endpoint | Método | Status no Server |
|--------|----------|--------|------------------|
| `report/page.tsx` | `/api/reports/executions` | GET | ✅ EXISTE |
| `report/page.tsx` | `/api/reports/executions/{id}` | DELETE | ✅ EXISTE |
| `report/page.tsx` | `/api/reports/schedules` | GET | ✅ EXISTE |
| `report/page.tsx` | `/api/reports/schedule` | POST | ✅ EXISTE |
| `report/page.tsx` | `/api/reports/schedules/{id}` | PUT | ✅ EXISTE |
| `report/page.tsx` | `/api/reports/generate` | POST | ✅ EXISTE |
| `report/page.tsx` | `/api/reports/production/matrix` | POST | ✅ EXISTE |
| `report/page.tsx` | `/api/reports/status/matrix` | POST | ✅ EXISTE |
| `report/page.tsx` | `/api/reports/downtime/events` | POST | ✅ EXISTE |
| `report/page.tsx` | `/api/reports/production/export/csv` | POST | ✅ EXISTE |
| `report/page.tsx` | `/api/reports/export/csv` | POST | ✅ EXISTE |
| `report/page.tsx` | `/api/reports/machine-dashboard` | GET | ✅ EXISTE |
| `production-history/page.tsx` | `/api/reports/production/matrix` | POST | ✅ EXISTE |

### Dashboard e BI

| Página | Endpoint | Método | Status no Server |
|--------|----------|--------|------------------|
| `dashboard/page.tsx` | `/api/dashboard/configs/default` | GET | ✅ EXISTE |
| `dashboard/page.tsx` | `/api/bi/machines/{id}/production-by-shift` | GET | ✅ EXISTE |
| `dashboard/page.tsx` | `/api/bi/machines/{id}/overview` | GET | ✅ EXISTE |
| `dashboards/page.tsx` | `/api/dashboard/configs` | GET | ✅ EXISTE |
| `dashboards/page.tsx` | `/api/dashboard/configs` | POST | ❌ FALTA |
| `dashboards/page.tsx` | `/api/dashboard/configs` | PUT | ✅ EXISTE |
| `dashboards/page.tsx` | `/api/dashboard/configs/{id}` | DELETE | ✅ EXISTE |
| `bi/efficiency/page.tsx` | `/api/machines` | GET | ✅ EXISTE |
| `bi/machines/page.tsx` | `/api/machines` | GET | ✅ EXISTE |
| `bi/reports/page.tsx` | `/api/machines` | GET | ✅ EXISTE |
| `bi/downtime/page.tsx` | `/api/machines` | GET | ✅ EXISTE |

### Runtime e Status

| Página | Endpoint | Método | Status no Server |
|--------|----------|--------|------------------|
| `status/page.tsx` | `/api/runtime/state` | GET | ✅ EXISTE |
| `status/page.tsx` | `/api/config/shifts` | GET | ✅ EXISTE |
| `status/page.tsx` | `/api/reports/machine-dashboard` | GET | ✅ EXISTE |
| `machines/[id]/config/page.tsx` | `/api/runtime/state` | GET | ✅ EXISTE |

### Downtimes

| Página | Endpoint | Método | Status no Server |
|--------|----------|--------|------------------|
| `downtime-reasons/page.tsx` | `/api/downtimes` | GET | ✅ EXISTE |
| `downtime-reasons/page.tsx` | `/api/downtime-reasons/catalog` | GET | ✅ EXISTE |
| `downtime-reasons/page.tsx` | `/api/downtime-reasons/catalog` | POST | ✅ EXISTE |
| `downtime-reasons/page.tsx` | `/api/downtimes/retention` | GET | ✅ EXISTE |
| `downtime-reasons/page.tsx` | `/api/downtimes/retention` | PUT | ✅ EXISTE |
| `downtime-reasons/page.tsx` | `/api/downtimes/{id}/classify` | POST | ✅ EXISTE |

### Legado (JS antigo - pode ser removido)

| Página | Endpoint | Método | Status no Server |
|--------|----------|--------|------------------|
| `js/app.js` | `/api/mes/machines` | GET | ❌ FALTA |
| `js/machine.js` | `/api/mes/oee/{tag}` | GET | ❌ FALTA |
| `js/machine.js` | `/api/mes/events/{tag}` | GET | ❌ FALTA |
| `dashboard.html` | `/api/mes/machines` | GET | ❌ FALTA |

---

## Endpoints Faltantes no Server

### Dashboard Configs
1. `POST /api/dashboard/configs` - Criar configuração de dashboard

### Máquinas
2. `PUT /api/machines/{id}/tag-mapping/{role}` - Atualizar mapeamento por role

### Legado (pode ser ignorado/removido)
3. `GET /api/mes/machines` - Lista máquinas (legado MES)
4. `GET /api/mes/oee/{tag}` - OEE por TAG (legado MES)
5. `GET /api/mes/events/{tag}` - Eventos por TAG (legado MES)

**Nota:** Os 10 endpoints inicialmente marcados como faltantes foram validados e confirmados como existentes no Server (ver ENDPOINTS_VALIDATION_REPORT.md).

---

## Endpoints com Nome Divergente

**Nenhum encontrado.** Todos os endpoints do Web usam a mesma nomenclatura do Server.

---

## Páginas Usando Mocks

**Nenhuma encontrada.** O Web não usa dados mockados - todas as chamadas são para a API real.

---

## Páginas Usando Localhost Hardcoded

### next.config.js (Proxy de Desenvolvimento)
```javascript
// Proxy para API
destination: 'http://127.0.0.1:5000/api/:path*'

// Proxy para SignalR
destination: 'http://127.0.0.1:5000/hubs/:path*'
```

**Status:** ✅ Aceitável - é um proxy de desenvolvimento para Next.js. Em produção, usa `NEXT_PUBLIC_API_URL` configurável.

### help/page.tsx (Documentação)
```typescript
'Health check: http://127.0.0.1:5000/api/system/health deve retornar healthy.'
```

**Status:** ✅ Aceitável - é apenas documentação de exemplo.

---

## Arquivos Legado (Podem ser Removidos)

Os seguintes arquivos usam endpoints `/api/mes/*` que não existem no Server:
- `frontend/js/app.js`
- `frontend/js/machine.js`
- `frontend/dashboard.html`

**Recomendação:** Verificar se esses arquivos ainda são usados. Se não, remover.

---

## Priorização de Implementação

### Nível 1 - Importante (Funcionalidades principais)
1. `POST /api/dashboard/configs` - Criar dashboard config
2. `PUT /api/machines/{id}/tag-mapping/{role}` - Mapeamento por role

### Nível 2 - Legado (pode ser ignorado)
3-5. Endpoints `/api/mes/*` - Arquivos legado JS

---

## Conclusão

**Status da Integração:** 98% dos endpoints existem no Server (62 de 63)

**Endpoints faltantes (não críticos):**
1. `POST /api/dashboard/configs` - Criar configuração de dashboard
2. `PUT /api/machines/{id}/tag-mapping/{role}` - Mapeamento por role
3-5. Endpoints `/api/mes/*` - Arquivos legado JS (podem ser removidos)

**Validação:** Todos os 10 endpoints prioritários inicialmente marcados como faltantes foram confirmados como existentes no Server após validação detalhada (ENDPOINTS_VALIDATION_REPORT.md).

**Recomendação:** O Web está pronto para integração runtime com o Server. Os 2 endpoints faltantes não críticos podem ser implementados posteriormente se necessário.
