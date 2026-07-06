let modalAtivo = null;

function abrirBloco(id) {
    const modal = document.getElementById(id);

    if (!modal) {
        return;
    }

    modal.classList.add("active");
    modalAtivo = modal;
    document.body.style.overflow = "hidden";
}

function abrirBlocoPorTitulo(titulo) {
    const cards = document.querySelectorAll("[data-module-title]");

    for (const card of cards) {
        if (card.dataset.moduleTitle === titulo) {
            const button = card.querySelector("button[onclick^='abrirBloco']");
            if (button) {
                button.click();
            }
            return;
        }
    }
}

function fecharBloco(id) {
    const modal = document.getElementById(id);

    if (!modal) {
        return;
    }

    modal.classList.remove("active");
    modalAtivo = null;
    document.body.style.overflow = "";
}

function fecharModalAtivo() {
    if (!modalAtivo) {
        return;
    }

    modalAtivo.classList.remove("active");
    modalAtivo = null;
    document.body.style.overflow = "";
}

function trocarAbaWorkspace(botao) {
    const modal = botao.closest(".workspace-modal");
    const targetId = botao.dataset.target;

    modal.querySelectorAll(".workspace-tab").forEach(item => {
        item.classList.remove("active");
    });

    modal.querySelectorAll(".workspace-panel").forEach(panel => {
        panel.classList.remove("active");
    });

    botao.classList.add("active");

    const panel = modal.querySelector("#" + targetId);

    if (panel) {
        panel.classList.add("active");
    }
}

function selecionarTipoConteudo(botao) {
    const tipo = botao.dataset.tipo;
    const form = botao.closest("form");
    const select = form.querySelector(".tipo-conteudo");

    if (select) {
        select.value = tipo;
        trocarTipoConteudo(select);
    }

    const botoes = form.querySelectorAll(".tipo-btn");

    botoes.forEach(item => {
        item.classList.remove("active");
    });

    botao.classList.add("active");
}

function trocarTipoConteudo(select) {
    const form = select.closest("form");
    const campos = form.querySelectorAll(".campo-tipo");

    campos.forEach(campo => {
        campo.classList.add("d-none");
    });

    const tipo = select.value;
    const campoSelecionado = form.querySelector(".campo-" + tipo);

    if (campoSelecionado) {
        campoSelecionado.classList.remove("d-none");
    }
}

document.addEventListener("keydown", function(event) {
    if (event.key === "Escape") {
        fecharModalAtivo();
    }
});

document.addEventListener("DOMContentLoaded", function() {
    document.querySelectorAll(".workspace-modal-overlay").forEach(function(overlay) {
        overlay.addEventListener("click", function(event) {
            if (event.target === overlay) {
                fecharBloco(overlay.id);
            }
        });
    });

    // Interceptar cliques em links de ações (incrementar, reduzir, alternar) para evitar recarregamento
    document.addEventListener("click", function(event) {
        const link = event.target.closest('a');
        if (!link) return;
        
        const href = link.getAttribute('href');
        if (!href) return;
        
        const isAction = href.includes("/incrementar") || 
                         href.includes("/reduzir") || 
                         href.includes("/alternar");
                         
        if (isAction) {
            event.preventDefault();
            
            // Adiciona ajax=1 ao URL
            const url = new URL(href, window.location.origin);
            url.searchParams.set("ajax", "1");
            
            fetch(url.toString())
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // 1. Atualiza o progresso geral da jornada no topo da página
                        const globalProgressBars = document.querySelectorAll(".journey-header-progress .progress-bar, .goal-progress-section .progress-bar");
                        globalProgressBars.forEach(bar => {
                            bar.style.width = data.meta_progresso + "%";
                            bar.innerText = data.meta_progresso + "%";
                        });
                        const globalProgressText = document.querySelector(".journey-header-progress strong, .goal-progress-section strong");
                        if (globalProgressText) {
                            globalProgressText.innerText = data.meta_progresso + "%";
                        }
                        
                        // 2. Atualiza o progresso da área de foco correspondente (background card)
                        const areaCard = document.querySelector(`.goal-area-card button[onclick*='modal-bloco-${data.bloco_id}']`)?.closest('.goal-area-card');
                        if (areaCard) {
                            const areaPercentEl = areaCard.querySelector(".goal-area-percent");
                            if (areaPercentEl) areaPercentEl.innerText = data.bloco_media_progresso + "%";
                            const areaProgressBar = areaCard.querySelector(".progress-bar");
                            if (areaProgressBar) areaProgressBar.style.width = data.bloco_media_progresso + "%";
                        }
                        
                        // 3. Atualizar elemento específico com base no retorno
                        // Caso seja incremento/redução de meta numérica
                        if (data.item_id && data.valor_atual !== undefined) {
                            const goalCard = document.querySelector(`.smart-goal-card a[href*="/metas-inteligentes/${data.item_id}/"]`)?.closest('.smart-goal-card');
                            if (goalCard) {
                                // Atualiza a contagem visual (ex: 2/4)
                                const countBadge = Array.from(goalCard.querySelectorAll(".smart-goal-badges span")).find(span => span.querySelector(".bi-graph-up-arrow") || span.textContent.includes('/'));
                                if (countBadge) {
                                    const totalVal = countBadge.textContent.split('/').pop().trim();
                                    countBadge.innerHTML = `<i class="bi bi-graph-up-arrow"></i> ${data.valor_atual}/${totalVal}`;
                                }
                                // Atualiza a porcentagem
                                const percentBadge = goalCard.querySelector(".smart-goal-percent");
                                if (percentBadge) percentBadge.innerText = data.percentual + "%";
                                // Atualiza a barra de progresso
                                const progressBar = goalCard.querySelector(".progress-bar");
                                if (progressBar) {
                                    progressBar.style.width = data.percentual + "%";
                                    progressBar.innerText = data.percentual + "%";
                                }
                            }
                        }
                        
                        // Caso seja alternância de subtarefa
                        if (data.item_id && data.concluido !== undefined && data.hasOwnProperty("pai_id")) {
                            const taskLink = document.querySelector(`a[href*="/itens/${data.item_id}/alternar"]`);
                            if (taskLink) {
                                const icon = taskLink.querySelector("i");
                                const titleSpan = taskLink.querySelector("span");
                                if (data.concluido) {
                                    icon.className = "bi bi-check-circle-fill text-success";
                                    if (titleSpan) titleSpan.classList.add("text-decoration-line-through", "text-muted");
                                } else {
                                    icon.className = "bi bi-circle";
                                    if (titleSpan) titleSpan.classList.remove("text-decoration-line-through", "text-muted");
                                }
                            }
                            
                            // Se tiver pai e o pai teve o percentual atualizado
                            if (data.pai_id && data.pai_percentual !== null) {
                                const goalCards = document.querySelectorAll('.smart-goal-card');
                                goalCards.forEach(card => {
                                    if (card.querySelector(`a[href*="/itens/${data.pai_id}/excluir"]`)) {
                                        // Atualiza porcentagem do pai
                                        const percentBadge = card.querySelector(".smart-goal-percent");
                                        if (percentBadge) percentBadge.innerText = data.pai_percentual + "%";
                                        // Atualiza a barra de progresso do pai
                                        const progressBar = card.querySelector(".progress-bar");
                                        if (progressBar) {
                                            progressBar.style.width = data.pai_percentual + "%";
                                            progressBar.innerText = data.pai_percentual + "%";
                                        }
                                        // Atualiza contagem de tarefas concluídas do pai
                                        const subtaskBadge = Array.from(card.querySelectorAll(".smart-goal-badges span")).find(span => span.querySelector(".bi-list-check") || span.textContent.includes('/'));
                                        if (subtaskBadge) {
                                            const totalTasks = card.querySelectorAll(".child-task").length;
                                            const completedTasks = card.querySelectorAll(".child-task i.bi-check-circle-fill").length;
                                            subtaskBadge.innerHTML = `<i class="bi bi-list-check"></i> ${completedTasks}/${totalTasks}`;
                                        }
                                    }
                                });
                            }
                        }
                        
                        // Caso seja alternância de etapa (Trilha)
                        if (data.etapa_id && data.concluido !== undefined) {
                            const stepLink = document.querySelector(`a[href*="/etapas/${data.etapa_id}/alternar"]`);
                            if (stepLink) {
                                const timelineItem = stepLink.closest(".timeline-item");
                                if (timelineItem) {
                                    const dot = timelineItem.querySelector(".timeline-dot");
                                    const stepTitle = timelineItem.querySelector(".timeline-title");
                                    if (data.concluido) {
                                        if (dot) {
                                            dot.classList.add("completed");
                                            dot.innerHTML = `<i class="bi bi-check-lg"></i>`;
                                        }
                                        if (stepTitle) stepTitle.classList.add("completed");
                                    } else {
                                        if (dot) {
                                            dot.classList.remove("completed");
                                            dot.innerHTML = "";
                                        }
                                        if (stepTitle) stepTitle.classList.remove("completed");
                                    }
                                }
                                
                                // Atualiza a barra de progresso da trilha
                                const trackerPremium = stepLink.closest(".progress-tracker-premium");
                                if (trackerPremium && data.progresso_percentual !== undefined) {
                                    const percentLabel = Array.from(trackerPremium.querySelectorAll("span, div")).find(el => el.textContent.includes("%"));
                                    if (percentLabel) {
                                        percentLabel.innerText = data.progresso_percentual + "%";
                                    }
                                    const trackerBar = trackerPremium.querySelector(".progress-bar");
                                    if (trackerBar) {
                                        trackerBar.style.width = data.progresso_percentual + "%";
                                        trackerBar.innerText = data.progresso_percentual + "%";
                                    }
                                }
                            }
                        }
                        
                        // Caso seja opção de checklist (Biblioteca)
                        if (data.opcao_id && data.selecionado !== undefined) {
                            const optionLink = document.querySelector(`a[href*="/opcoes/${data.opcao_id}/alternar"]`);
                            if (optionLink) {
                                const icon = optionLink.querySelector("i");
                                if (data.selecionado) {
                                    icon.className = "bi bi-check-square-fill";
                                } else {
                                    icon.className = "bi bi-square";
                                }
                            }
                        }

                        // === GATILHOS DE ANIMAÇÃO DE CONFETE ===
                        if (data.meta_progresso === 100) {
                            dispararConfeteGrande();
                        } else if (
                            data.percentual === 100 || 
                            data.pai_percentual === 100 || 
                            data.progresso_percentual === 100 || 
                            data.bloco_media_progresso === 100
                        ) {
                            dispararConfete();
                        }
                    }
                })
                .catch(err => {
                    console.error("Erro na requisição AJAX, recarregando página como fallback...", err);
                    window.location.href = href;
                });
        }
    });

    const params = new URLSearchParams(window.location.search);
    const modal = params.get("modal");
    const tab = params.get("tab");

    if (modal) {
        abrirBloco("modal-bloco-" + modal);
        if (tab) {
            const modalEl = document.getElementById("modal-bloco-" + modal);
            if (modalEl) {
                const tabButton = modalEl.querySelector(`.workspace-tab[data-target^="${tab}-"]`);
                if (tabButton) {
                    tabButton.click();
                }
            }
        }
    }
});

function dispararConfete() {
    if (typeof confetti === 'function') {
        const colors = ['#d8bd73', '#f2dda0', '#ffffff', '#8a6d2d'];
        
        confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 },
            colors: colors
        });
        
        setTimeout(() => {
            confetti({
                particleCount: 40,
                angle: 60,
                spread: 55,
                origin: { x: 0, y: 0.8 },
                colors: colors
            });
        }, 200);

        setTimeout(() => {
            confetti({
                particleCount: 40,
                angle: 120,
                spread: 55,
                origin: { x: 1, y: 0.8 },
                colors: colors
            });
        }, 250);
    }
}

function dispararConfeteGrande() {
    if (typeof confetti === 'function') {
        const duration = 2.5 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999, colors: ['#d8bd73', '#f2dda0', '#ffffff', '#8a6d2d'] };

        function randomInRange(min, max) {
            return Math.random() * (max - min) + min;
        }

        const interval = setInterval(function() {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
        }, 250);
    }
}
