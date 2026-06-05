const params = new URLSearchParams(window.location.search);
const tag = params.get("tag");
let chart = null;

document.getElementById("title").innerText = tag || "Machine Detail";

async function fetchOEEHistory() {
    if (!tag) return [];
    const res = await fetch(`/api/mes/oee/${encodeURIComponent(tag)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
}

async function fetchEvents() {
    if (!tag) return [];
    const res = await fetch(`/api/mes/events/${encodeURIComponent(tag)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
}

async function renderChart() {
    const data = await fetchOEEHistory();
    const labels = data.map(d => d.timestamp);
    const values = data.map(d => d.oee);
    const ctx = document.getElementById("oeeChart");

    if (chart) {
        chart.destroy();
    }

    chart = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: "OEE",
                data: values,
                borderColor: "#00ff88",
                backgroundColor: "rgba(0, 255, 136, 0.12)",
                tension: 0.25,
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    min: 0,
                    max: 1
                }
            }
        }
    });
}

async function renderEvents() {
    const events = await fetchEvents();
    const list = document.getElementById("events");

    if (!events.length) {
        list.innerHTML = `<li>Nenhum evento encontrado.</li>`;
        return;
    }

    list.innerHTML = events.map(e => `
        <li>
            <strong>${e.timestamp || "-"}</strong>
            <span>${e.event || e.type || "evento"}</span>
            <em>${e.reason || ""}</em>
        </li>
    `).join("");
}

async function load() {
    try {
        await renderChart();
        await renderEvents();
    } catch (error) {
        document.getElementById("events").innerHTML = `<li>Erro ao carregar detalhe: ${error.message}</li>`;
    }
}

load();
