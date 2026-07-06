function alternarAbaRanque(tipo) {
    const btnGlobal = document.getElementById("btn-rank-global");
    const btnAreas = document.getElementById("btn-rank-areas");
    const contentGlobal = document.getElementById("rank-content-global");
    const contentAreas = document.getElementById("rank-content-areas");

    if (tipo === 'global') {
        btnGlobal.classList.add("active");
        btnGlobal.classList.remove("btn-ascend-outline");
        btnGlobal.classList.add("btn-ascend");

        btnAreas.classList.remove("active");
        btnAreas.classList.add("btn-ascend-outline");
        btnAreas.classList.remove("btn-ascend");

        contentGlobal.classList.remove("d-none");
        contentAreas.classList.add("d-none");
    } else {
        btnGlobal.classList.remove("active");
        btnGlobal.classList.add("btn-ascend-outline");
        btnGlobal.classList.remove("btn-ascend");

        btnAreas.classList.add("active");
        btnAreas.classList.remove("btn-ascend-outline");
        btnAreas.classList.add("btn-ascend");

        contentGlobal.classList.add("d-none");
        contentAreas.classList.remove("d-none");

        // Ativar a primeira área por padrão
        const select = document.getElementById("select-area-rank");
        if (select) {
            mostrarEstradaArea(select.value);
        }
    }
}

function mostrarEstradaArea(area) {
    document.querySelectorAll(".area-road-list").forEach(road => {
        road.classList.add("d-none");
    });
    const targetRoad = document.getElementById("road-area-" + area);
    if (targetRoad) {
        targetRoad.classList.remove("d-none");
    }
}
