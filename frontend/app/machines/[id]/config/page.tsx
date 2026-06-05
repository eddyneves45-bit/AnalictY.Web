"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProtectedLayout } from "@/components/layout/protected-layout";
import { Settings, ArrowLeft, X, Edit } from "lucide-react";
import { API_BASE_URL, apiFetch } from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";
import { formatRuntimeValue } from "@/lib/runtime-format";

interface Tag {
  id: number;
  name: string;
  tagName?: string;
  tag_name?: string;
  tag_type: string;
  driver: string;
  driverType?: string;
  address: string;
  description: string;
  unit: string;
  enabled: boolean;
  current_value?: any;
  quality?: string;
}

interface MachineDetails {
  name: string;
  code: string;
  cost_center: string;
}

const formatValue = (value: any): string => {
  return formatRuntimeValue(value, "N/A");
};

interface Mapping {
  id?: number;
  role?: string;
  tag_alias?: string;
  tagAlias?: string;
  tag_id?: number;
  tag_config_id?: number;
  tagConfigId?: number;
  TagConfigId?: number;
  TagAlias?: string;
  tag_name?: string;
  tagName?: string;
}

interface TagMappingResponse {
  machine_id: number;
  mappings: Mapping[];
}

interface MachineDowntimeReason {
  id?: number;
  code: number;
  description: string;
  category?: string | null;
  is_active: boolean;
}

interface MachineLossConfig {
  loss_source: "tag" | "fixed";
  fixed_loss_value: number;
}

interface MachineGoal {
  id?: number;
  machine_id?: string;
  meta_producao_dia: number | null;
  meta_producao_hora: number | null;
  tempo_ciclo_ideal_segundos: number | null;
  vigente_de: string;
  vigente_ate: string | null;
  ativo: boolean;
}

// ROLES fixos definidos no backend
const ROLES = [
  { key: "production_counter", label: "Contador" },
  { key: "machine_status", label: "Status" },
  { key: "downtime_reason_code", label: "Motivo" },
  { key: "loss_count", label: "Perdas" },
];

export default function MachineConfigPage() {
  const params = useParams();
  const router = useRouter();
  const machineId = parseInt(params.id as string);
  const { token } = useAuth();

  const [machineName, setMachineName] = useState<string>("");
  const [machineCode, setMachineCode] = useState<string>("");
  const [machineCostCenter, setMachineCostCenter] = useState<string>("");
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [reasons, setReasons] = useState<MachineDowntimeReason[]>([]);
  const [reasonForm, setReasonForm] = useState<MachineDowntimeReason>({
    code: 0,
    description: "Sem motivo",
    category: "",
    is_active: true,
  });
  const [lossConfig, setLossConfig] = useState<MachineLossConfig>({
    loss_source: "tag",
    fixed_loss_value: 0,
  });
  const [goals, setGoals] = useState<MachineGoal[]>([]);
  const [goalForm, setGoalForm] = useState<MachineGoal>({
    meta_producao_dia: null,
    meta_producao_hora: null,
    tempo_ciclo_ideal_segundos: null,
    vigente_de: toDateTimeLocalValue(new Date()),
    vigente_ate: null,
    ativo: true,
  });

  // Carregar dados da máquina e mapeamentos
  useEffect(() => {
    if (token) {
      loadMachineData();
      loadTags();
      loadReasons();
      loadLossConfig();
      loadGoals();
    }
  }, [token, machineId]);

  const loadMachineData = async () => {
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/machines/${machineId}`, {
        headers: {        },
      });
      if (response.ok) {
        const machine = await response.json();
        setMachineName(machine.name);
        setMachineCode(machine.code ?? machine.Code ?? "");
        setMachineCostCenter(machine.cost_center ?? machine.costCenter ?? machine.CostCenter ?? "");
      }

      const mappingResponse = await apiFetch(`${API_BASE_URL}/api/machines/${machineId}/tag-mapping`, {
        headers: {        },
      });
      if (mappingResponse.ok) {
        const data: TagMappingResponse = await mappingResponse.json();
        setMappings(data.mappings);
      } else {
        const text = await mappingResponse.text();
        setError(text || "Erro ao carregar associações da máquina");
      }
    } catch (error) {
      console.error("Erro ao carregar dados da máquina:", error);
      setError("Erro ao carregar dados da máquina");
    } finally {
      setLoading(false);
    }
  };

  const loadReasons = async () => {
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/machines/${machineId}/downtime-reasons`, {
        headers: {        },
      });

      if (response.ok) {
        setReasons(await response.json());
      } else {
        setError("Erro ao carregar motivos configurados");
      }
    } catch (error) {
      console.error("Erro ao carregar motivos configurados:", error);
      setError("Erro ao carregar motivos configurados");
    }
  };

  const loadLossConfig = async () => {
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/machines/${machineId}/loss-config`, {
        headers: {        },
      });

      if (response.ok) {
        setLossConfig(await response.json());
      } else {
        setError("Erro ao carregar configuração de perdas");
      }
    } catch (error) {
      console.error("Erro ao carregar configuração de perdas:", error);
      setError("Erro ao carregar configuração de perdas");
    }
  };

  const loadGoals = async () => {
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/machines/${machineId}/goals`, {
        headers: {        },
      });

      if (response.ok) {
        setGoals(await response.json());
      } else {
        setError("Erro ao carregar metas da máquina");
      }
    } catch (error) {
      console.error("Erro ao carregar metas da máquina:", error);
      setError("Erro ao carregar metas da máquina");
    }
  };

  const loadTags = async () => {
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/config/tags`, {
        headers: {        },
      });
      if (response.ok) {
        const data = await response.json();
        const rawTags: Tag[] = data.items || data;
        const runtimeResponse = await apiFetch(`${API_BASE_URL}/api/runtime/state`, {
          headers: {          },
        });
        const runtimeStates = runtimeResponse.ok ? await runtimeResponse.json() : [];

        setTags(rawTags.map((tag) => {
          const runtimeState = runtimeStates.find((state: any) => getRuntimeTagId(state) === tag.id);

          return {
            ...tag,
            name: tag.name || tag.tagName || tag.tag_name || `TAG ${tag.id}`,
            driver: tag.driver || tag.driverType || "",
            current_value: runtimeState?.value,
            quality: runtimeState?.quality,
          };
        }));
      } else {
        console.error("Erro ao carregar tags:", response.status);
        setError("Erro ao carregar tags");
      }
    } catch (error) {
      console.error("Erro ao carregar tags:", error);
      setError("Erro ao carregar tags");
    }
  };

  const mapTagToRole = async (role: string, tagId: number) => {

    try {
      const response = await apiFetch(`${API_BASE_URL}/api/machines/${machineId}/tag-mapping`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",        },
        body: JSON.stringify({
          role,
          tag_id: tagId,
          tag_config_id: tagId,
          tag_alias: role,
        }),
      });

      if (response.ok) {
        setError("");
        await loadMachineData();
        await loadTags();
        setShowModal(false);
        setSearchTerm("");
      } else {
        const data = await response.json().catch(() => null);
        setError(data?.message || data?.detail || "Erro ao associar TAG à máquina");
      }
    } catch (error) {
      console.error("Erro ao salvar mapeamento:", error);
      setError("Erro ao associar TAG à máquina");
    }
  };

  const handleRemoveMapping = async (role: string) => {
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/machines/${machineId}/tag-mapping/${role}`, {
        method: "DELETE",
        headers: {        },
      });

      if (response.ok) {
        setError("");
        await loadMachineData();
      } else {
        const data = await response.json().catch(() => null);
        setError(data?.message || data?.detail || "Erro ao remover associação");
      }
    } catch (error) {
      console.error("Erro ao remover mapeamento:", error);
      setError("Erro ao remover associação");
    }
  };

  const handleSaveReason = async () => {
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/machines/${machineId}/downtime-reasons`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",        },
        body: JSON.stringify(reasonForm),
      });

      if (response.ok) {
        setError("");
        await loadReasons();
        setReasonForm({
          code: 0,
          description: "Sem motivo",
          category: "",
          is_active: true,
        });
      } else {
        const data = await response.json().catch(() => null);
        setError(data?.message || "Erro ao salvar motivo");
      }
    } catch (error) {
      console.error("Erro ao salvar motivo:", error);
      setError("Erro ao salvar motivo");
    }
  };

  const handleEditReason = (reason: MachineDowntimeReason) => {
    setReasonForm({
      code: reason.code,
      description: reason.description,
      category: reason.category || "",
      is_active: reason.is_active,
    });
  };

  const handleDeleteReason = async (code: number) => {
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/machines/${machineId}/downtime-reasons/${code}`, {
        method: "DELETE",
        headers: {        },
      });

      if (response.ok) {
        setError("");
        await loadReasons();
      } else {
        setError("Erro ao remover motivo");
      }
    } catch (error) {
      console.error("Erro ao remover motivo:", error);
      setError("Erro ao remover motivo");
    }
  };

  const handleSaveLossConfig = async () => {
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/machines/${machineId}/loss-config`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",        },
        body: JSON.stringify(lossConfig),
      });

      if (response.ok) {
        setError("");
        setLossConfig(await response.json());
      } else {
        const data = await response.json().catch(() => null);
        setError(data?.message || "Erro ao salvar configuração de perdas");
      }
    } catch (error) {
      console.error("Erro ao salvar configuração de perdas:", error);
      setError("Erro ao salvar configuração de perdas");
    }
  };

  const handleSaveGoal = async () => {
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/machines/${machineId}/goals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",        },
        body: JSON.stringify({
          ...goalForm,
          vigente_de: goalForm.vigente_de,
          vigente_ate: goalForm.vigente_ate || null,
        }),
      });

      if (response.ok) {
        setError("");
        await loadGoals();
        setGoalForm({
          meta_producao_dia: null,
          meta_producao_hora: null,
          tempo_ciclo_ideal_segundos: null,
          vigente_de: toDateTimeLocalValue(new Date()),
          vigente_ate: null,
          ativo: true,
        });
      } else {
        const data = await response.json().catch(() => null);
        setError(data?.message || data?.detail || "Erro ao salvar meta");
      }
    } catch (error) {
      console.error("Erro ao salvar meta:", error);
      setError("Erro ao salvar meta");
    }
  };

  const openModal = (role: string) => {
    setSelectedRole(role);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSearchTerm("");
    setSelectedRole(null);
  };

  const getMappingForRole = (role: string) => {
    return mappings.find((m) => getMappingRole(m) === role);
  };

  const getTagName = (tag: Tag) => tag.name || tag.tagName || tag.tag_name || `TAG ${tag.id}`;
  const getTagDriver = (tag: Tag) => tag.driver || tag.driverType || "";
  const getMappingRole = (mapping: Mapping) => mapping.role || mapping.tag_alias || mapping.tagAlias || mapping.TagAlias || "";
  const getMappingTagId = (mapping: Mapping) => mapping.tag_id || mapping.tag_config_id || mapping.tagConfigId || mapping.TagConfigId;
  const getRuntimeTagId = (state: any) => state.tagId || state.tag_id || state.TagId;
  const normalizeKey = (value: string) => value.replace(/\s+/g, "").toUpperCase();
  const suggestedPrefix = [machineCostCenter, machineCode].filter(Boolean).map(normalizeKey).join("_");
  const inferSuggestedRole = (tag: Tag) => {
    const name = getTagName(tag).toUpperCase();
    if (name.includes("STATUS")) return "machine_status";
    if (name.includes("PRODUCAO") || name.includes("PRODUÇÃO")) return "production_counter";
    if (name.includes("MOTIVO")) return "downtime_reason_code";
    if (name.includes("PERDA")) return "loss_count";
    return null;
  };

  const handleSelectTag = async (tagId: number) => {
    if (!selectedRole) return;
    await mapTagToRole(selectedRole, tagId);
  };
  const suggestedTags = tags
    .map((tag) => ({ tag, role: inferSuggestedRole(tag) }))
    .filter(({ tag, role }) =>
      !!role &&
      !!suggestedPrefix &&
      normalizeKey(getTagName(tag)).startsWith(`${suggestedPrefix}_`)
    );
  const availableSuggestions = suggestedTags.filter(({ role, tag }) => {
    const currentMapping = getMappingForRole(role!);
    return !currentMapping || getMappingTagId(currentMapping) !== tag.id;
  });
  const activeGoal = goals.find((goal) => goal.ativo);
  const getMappingTagName = (mapping: Mapping) => {
    const tagId = getMappingTagId(mapping);
    const tag = tags.find((item) => item.id === tagId);
    return mapping.tag_name || mapping.tagName || tag?.name || tag?.tagName || tag?.tag_name || `TAG ${tagId}`;
  };

  const filteredTags = tags.filter((tag) =>
    getTagName(tag).toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <ProtectedLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-600">Carregando...</div>
        </div>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <Settings className="h-8 w-8 text-gray-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Configuração de Máquina</h1>
                <p className="text-sm text-gray-500">{machineName}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabela de Mapeamentos */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ROLE (Slot Funcional)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  TAG Vinculada
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ROLES.map((role) => {
                const mapping = getMappingForRole(role.key);
                return (
                  <tr key={role.key}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {role.label}
                      </div>
                      <div className="text-sm text-gray-500">
                        {role.key}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {role.key === "loss_count" && lossConfig.loss_source === "fixed" ? (
                        <div className="text-sm text-gray-900">
                          Valor fixo: {lossConfig.fixed_loss_value}
                        </div>
                      ) : mapping ? (
                        <div className="text-sm text-gray-900">
                          {getMappingTagName(mapping)}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400 italic">
                          Não vinculado
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {role.key === "loss_count" && lossConfig.loss_source === "fixed" ? (
                        <span className="text-sm text-gray-400">Configuração fixa</span>
                      ) : mapping ? (
                        <>
                          <button
                            onClick={() => openModal(role.key)}
                            className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:border-red-500 hover:text-red-600 transition-colors mr-2"
                            title="Editar TAG"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleRemoveMapping(role.key)}
                            className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:border-red-500 hover:text-red-600 transition-colors"
                            title="Remover TAG"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => openModal(role.key)}
                          className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:border-red-500 hover:text-red-600 transition-colors"
                          title="Selecionar TAG"
                        >
                          <Settings className="h-5 w-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Sugestões por padrão de nome</h2>
            <p className="mt-1 text-sm text-gray-500">
              Prefixo usado: <span className="font-mono font-semibold text-gray-700">{suggestedPrefix || "-"}</span>
            </p>
          </div>
          <div className="p-6">
            {availableSuggestions.length === 0 ? (
              <div className="text-sm text-gray-500">
                Nenhuma TAG compatível nova encontrada para esta máquina.
              </div>
            ) : (
              <div className="space-y-3">
                {availableSuggestions.map(({ tag, role }) => {
                  const roleDefinition = ROLES.find((item) => item.key === role);
                  return (
                    <div key={`${role}-${tag.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{getTagName(tag)}</div>
                        <div className="mt-1 text-xs text-gray-500">
                          Sugestão: {roleDefinition?.label || role} · {tag.address}
                        </div>
                      </div>
                      <button
                        onClick={() => void mapTagToRole(role!, tag.id)}
                        className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
                      >
                        Vincular como {roleDefinition?.label || role}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Metas da máquina</h2>
            <p className="mt-1 text-sm text-gray-500">
              Cadastre manualmente a meta vigente. Ao salvar uma nova meta ativa, a anterior é encerrada e preservada no histórico.
            </p>
          </div>

          {activeGoal && (
            <div className="grid gap-4 border-b border-gray-200 bg-gray-50 px-6 py-4 md:grid-cols-4">
              <GoalSummary label="Meta diária" value={formatNullableNumber(activeGoal.meta_producao_dia)} suffix="unid/dia" />
              <GoalSummary label="Meta por hora" value={formatNullableNumber(activeGoal.meta_producao_hora)} suffix="unid/h" />
              <GoalSummary label="Ciclo ideal" value={formatNullableNumber(activeGoal.tempo_ciclo_ideal_segundos)} suffix="s" />
              <GoalSummary label="Vigente desde" value={formatDateTime(activeGoal.vigente_de)} />
            </div>
          )}

          <div className="grid gap-4 border-b border-gray-200 p-6 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto]">
            <GoalNumberInput
              label="Meta diária"
              value={goalForm.meta_producao_dia}
              onChange={(value) => setGoalForm({ ...goalForm, meta_producao_dia: value })}
            />
            <GoalNumberInput
              label="Meta por hora"
              value={goalForm.meta_producao_hora}
              onChange={(value) => setGoalForm({ ...goalForm, meta_producao_hora: value })}
            />
            <GoalNumberInput
              label="Ciclo ideal (s)"
              value={goalForm.tempo_ciclo_ideal_segundos}
              onChange={(value) => setGoalForm({ ...goalForm, tempo_ciclo_ideal_segundos: value })}
            />
            <label className="space-y-2">
              <span className="text-sm font-medium text-gray-600">Vigente de</span>
              <input
                type="datetime-local"
                value={goalForm.vigente_de}
                onChange={(e) => setGoalForm({ ...goalForm, vigente_de: e.target.value })}
                className="w-full rounded-xl border border-gray-300 px-4 py-2 text-gray-900 focus:border-red-500 focus:outline-none"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-gray-600">Vigente até</span>
              <input
                type="datetime-local"
                value={goalForm.vigente_ate || ""}
                onChange={(e) => setGoalForm({ ...goalForm, vigente_ate: e.target.value || null })}
                className="w-full rounded-xl border border-gray-300 px-4 py-2 text-gray-900 focus:border-red-500 focus:outline-none"
              />
            </label>
            <div className="flex items-end gap-3">
              <label className="flex h-11 items-center gap-2 rounded-xl border border-gray-200 px-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={goalForm.ativo}
                  onChange={(e) => setGoalForm({ ...goalForm, ativo: e.target.checked })}
                />
                Ativa
              </label>
              <button
                onClick={handleSaveGoal}
                className="h-11 rounded-xl bg-red-600 px-4 font-medium text-white transition-colors hover:bg-red-700"
              >
                Salvar meta
              </button>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {goals.length === 0 ? (
              <div className="px-6 py-5 text-sm text-gray-500">Nenhuma meta cadastrada para esta máquina.</div>
            ) : (
              goals.map((goal) => (
                <div key={goal.id} className="grid gap-3 px-6 py-4 text-sm md:grid-cols-[120px_120px_120px_1fr_1fr_90px] md:items-center">
                  <div>
                    <div className="text-xs uppercase text-gray-500">Meta diária</div>
                    <div className="font-medium text-gray-900">{formatNullableNumber(goal.meta_producao_dia)}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-gray-500">Meta/hora</div>
                    <div className="font-medium text-gray-900">{formatNullableNumber(goal.meta_producao_hora)}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-gray-500">Ciclo</div>
                    <div className="font-medium text-gray-900">{formatNullableNumber(goal.tempo_ciclo_ideal_segundos)} s</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-gray-500">Vigente de</div>
                    <div className="font-medium text-gray-900">{formatDateTime(goal.vigente_de)}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-gray-500">Vigente até</div>
                    <div className="font-medium text-gray-900">{goal.vigente_ate ? formatDateTime(goal.vigente_ate) : "Em aberto"}</div>
                  </div>
                  <div className={goal.ativo ? "font-medium text-green-700" : "text-gray-500"}>
                    {goal.ativo ? "Ativa" : "Histórica"}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Fonte das perdas</h2>
            <p className="mt-1 text-sm text-gray-500">
              Use TAG quando a máquina informar rejeitos. Use valor fixo quando a perda for constante nesta máquina.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-4 p-6">
            <label className="space-y-2">
              <span className="text-sm font-medium text-gray-600">Origem</span>
              <select
                value={lossConfig.loss_source}
                onChange={(e) => setLossConfig({ ...lossConfig, loss_source: e.target.value as MachineLossConfig["loss_source"] })}
                className="block rounded-xl border border-gray-300 px-4 py-2 text-gray-900 focus:border-red-500 focus:outline-none"
              >
                <option value="tag">TAG</option>
                <option value="fixed">Valor fixo</option>
              </select>
            </label>
            {lossConfig.loss_source === "fixed" && (
              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-600">Perdas fixas</span>
                <input
                  type="number"
                  min={0}
                  value={lossConfig.fixed_loss_value}
                  onChange={(e) => setLossConfig({ ...lossConfig, fixed_loss_value: Number(e.target.value) })}
                  className="block w-40 rounded-xl border border-gray-300 px-4 py-2 text-gray-900 focus:border-red-500 focus:outline-none"
                />
              </label>
            )}
            <button
              onClick={handleSaveLossConfig}
              className="h-11 rounded-xl bg-red-600 px-4 font-medium text-white transition-colors hover:bg-red-700"
            >
              Salvar perdas
            </button>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Motivos configuráveis da máquina</h2>
            <p className="mt-1 text-sm text-gray-500">
              A TAG de motivo explica os estados ociosa e manutenção. Cada código pode ter um significado próprio nesta máquina.
            </p>
          </div>

          <div className="grid gap-4 border-b border-gray-200 p-6 md:grid-cols-[120px_1fr_180px_auto]">
            <label className="space-y-2">
              <span className="text-sm font-medium text-gray-600">Código</span>
              <input
                type="number"
                min={0}
                value={reasonForm.code}
                onChange={(e) => setReasonForm({ ...reasonForm, code: Number(e.target.value) })}
                className="w-full rounded-xl border border-gray-300 px-4 py-2 text-gray-900 focus:border-red-500 focus:outline-none"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-gray-600">Descrição</span>
              <input
                type="text"
                value={reasonForm.description}
                onChange={(e) => setReasonForm({ ...reasonForm, description: e.target.value })}
                className="w-full rounded-xl border border-gray-300 px-4 py-2 text-gray-900 focus:border-red-500 focus:outline-none"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-gray-600">Categoria</span>
              <input
                type="text"
                value={reasonForm.category || ""}
                onChange={(e) => setReasonForm({ ...reasonForm, category: e.target.value })}
                placeholder="Opcional"
                className="w-full rounded-xl border border-gray-300 px-4 py-2 text-gray-900 focus:border-red-500 focus:outline-none"
              />
            </label>
            <div className="flex items-end gap-3">
              <label className="flex h-11 items-center gap-2 rounded-xl border border-gray-200 px-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={reasonForm.is_active}
                  onChange={(e) => setReasonForm({ ...reasonForm, is_active: e.target.checked })}
                />
                Ativo
              </label>
              <button
                onClick={handleSaveReason}
                className="h-11 rounded-xl bg-red-600 px-4 font-medium text-white transition-colors hover:bg-red-700"
              >
                Salvar
              </button>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {reasons.length === 0 ? (
              <div className="px-6 py-5 text-sm text-gray-500">Nenhum motivo configurado para esta máquina.</div>
            ) : (
              reasons.map((reason) => (
                <div key={reason.code} className="grid gap-3 px-6 py-4 md:grid-cols-[120px_1fr_180px_auto] md:items-center">
                  <div className="text-sm font-semibold text-gray-900">Código {reason.code}</div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{reason.description}</div>
                    <div className="text-xs text-gray-500">{reason.is_active ? "Ativo" : "Inativo"}</div>
                  </div>
                  <div className="text-sm text-gray-600">{reason.category || "-"}</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditReason(reason)}
                      className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:border-red-500 hover:text-red-600"
                      title="Editar motivo"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteReason(reason.code)}
                      className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:border-red-500 hover:text-red-600"
                      title="Excluir motivo"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

      {/* Modal de Seleção de TAG */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                Selecionar TAG para: {selectedRole}
              </h2>
              <p className="text-sm text-gray-500">
                Escolha uma TAG para associar a este role funcional
              </p>
            </div>

            <div className="space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-gray-600">Buscar TAG...</span>
                <input
                  type="text"
                  placeholder="Digite o nome da TAG"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm focus:border-red-500 focus:outline-none"
                />
              </label>

              <div className="max-h-96 overflow-y-auto rounded-xl border border-gray-200">
                {filteredTags.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    Nenhuma TAG encontrada
                  </div>
                ) : (
                  filteredTags.map((tag) => (
                    <div
                      key={tag.id}
                      onClick={() => handleSelectTag(tag.id)}
                      className="p-4 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {getTagName(tag)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {getTagDriver(tag)} - {tag.address}
                          </div>
                          {tag.quality && (
                            <div className="text-xs text-gray-400 mt-1">
                              Qualidade: {tag.quality}
                            </div>
                          )}
                        </div>
                        <div className="text-sm font-medium text-gray-700 ml-4">
                          {formatValue(tag.current_value)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="rounded-xl border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </ProtectedLayout>
  );
}

function GoalSummary({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase text-gray-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-gray-900">
        {value}
        {suffix ? <span className="ml-1 text-sm font-normal text-gray-500">{suffix}</span> : null}
      </div>
    </div>
  );
}

function GoalNumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-gray-600">{label}</span>
      <input
        type="number"
        min={0}
        step="any"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className="w-full rounded-xl border border-gray-300 px-4 py-2 text-gray-900 focus:border-red-500 focus:outline-none"
      />
    </label>
  );
}

function toDateTimeLocalValue(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

function formatNullableNumber(value: number | null | undefined) {
  return value === null || value === undefined ? "-" : String(value);
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR");
}
