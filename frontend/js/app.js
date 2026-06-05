async function fetchMachines() {
    const res = await fetch("/api/mes/machines");
    if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
    }
    return await res.json();
}

function getStateClass(machine) {
    if (machine.connection_state === "degraded") return "degraded";
    if (!machine.state) return "";
    if (machine.state === "running") return "running";
    if (machine.state === "stopped") return "stopped";
    return "";
}

function percent(value) {
    if (value === undefined || value === null) return "-";
    return `${(value * 100).toFixed(1)}%`;
}

function seconds(value) {
    return `${Math.round(value || 0)}s`;
}

function renderMachine(m) {
    return `
        <div class="card ${getStateClass(m)}">
            <h3>${m.tag}</h3>
            <div class="metric"><strong>Estado:</strong> ${m.state || "-"}</div>
            <div class="metric"><strong>Motivo:</strong> ${m.reason || "-"}</div>
            <div class="metric"><strong>OEE:</strong> ${percent(m.oee?.oee)}</div>
            <div class="metric"><strong>Disponibilidade:</strong> ${percent(m.oee?.availability)}</div>
            <div class="metric"><strong>Performance:</strong> ${percent(m.oee?.performance)}</div>
            <div class="metric"><strong>Qualidade:</strong> ${percent(m.oee?.quality)}</div>
            <div class="metric"><strong>Rodando:</strong> ${seconds(m.metrics?.running_time)}</div>
            <div class="metric"><strong>Parado:</strong> ${seconds(m.metrics?.stopped_time)}</div>
            <a class="link" href="machine.html?tag=${encodeURIComponent(m.tag)}">Detalhes</a>
        </div>
    `;
}

async function load() {
    const container = document.getElementById("machines");
    const lastUpdate = document.getElementById("last-update");

    try {
        const machines = await fetchMachines();
        if (!machines.length) {
            container.innerHTML = `<div class="empty">Nenhuma máquina encontrada.</div>`;
        } else {
            container.innerHTML = machines.map(renderMachine).join("");
        }
        lastUpdate.textContent = `Última atualização: ${new Date().toLocaleTimeString()}`;
    } catch (error) {
        container.innerHTML = `<div class="error">Erro ao carregar máquinas: ${error.message}</div>`;
        lastUpdate.textContent = "Falha na atualização";
    }
}

setInterval(load, 2000);
load();
