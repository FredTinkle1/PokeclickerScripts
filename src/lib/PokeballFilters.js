/**
 * Adds quick toggles to the native Poké Balls table.
 * The game's filter observables remain the single source of truth.
 */
class AutomationPokeballFilters
{
    static observer = null;
    static queued = false;

    static initialize(step)
    {
        if (step !== Automation.InitSteps.Finalize || this.observer) return;
        const panel = document.getElementById("pokeballSelector");
        if (!panel || typeof ko === "undefined" || !App.game.pokeballFilters) return;

        const style = document.createElement("style");
        style.id = "tinklePokeballQuickToggleStyle";
        style.textContent = `
            #pokeballSelector table.tinkleFilterTable th:first-child,
            #pokeballSelector table.tinkleFilterTable td:first-child { width: 43%; }
            #pokeballSelector table.tinkleFilterTable th:nth-child(2),
            #pokeballSelector table.tinkleFilterTable td:nth-child(2) { width: 19%; }
            #pokeballSelector table.tinkleFilterTable th:nth-child(3),
            #pokeballSelector table.tinkleFilterTable td:nth-child(3) { width: 19%; }
            #pokeballSelector table.tinkleFilterTable .tinkleFilterToggleCell {
                width: 19%; padding: 0 2px; text-align: center; vertical-align: middle;
            }
            #pokeballSelector .tinkleFilterToggle {
                box-sizing: border-box; position: relative; width: 29px; height: 17px;
                border: 1px solid transparent; border-radius: 12px; padding: 0;
                background: #777; cursor: pointer; vertical-align: middle;
            }
            #pokeballSelector .tinkleFilterToggle::after {
                content: ""; position: absolute; top: 2px; left: 2px;
                width: 11px; height: 11px; border-radius: 50%; background: white;
            }
            #pokeballSelector .tinkleFilterToggle[aria-checked="true"] { background: #008caf; }
            #pokeballSelector .tinkleFilterToggle[aria-checked="true"]::after { left: 14px; }
            #pokeballSelector .tinkleFilterToggle:disabled { cursor: default; opacity: .65; }
        `;
        document.head.appendChild(style);
        const refresh = () =>
        {
            if (this.queued) return;
            this.queued = true;
            queueMicrotask(() =>
            {
                this.queued = false;
                this.refresh(panel);
            });
        };
        this.observer = new MutationObserver(refresh);
        this.observer.observe(panel, { childList: true, subtree: true, attributes: true,
            attributeFilter: ["class", "data-name"] });
        this.refresh(panel);
    }

    static refresh(panel)
    {
        const body = panel.querySelector("#pokeballFilters");
        const table = body?.closest("table");
        const header = table?.tHead?.rows[0];
        if (!body || !header) return;
        table.classList.add("tinkleFilterTable");
        if (!header.querySelector(".tinkleFilterToggleCell"))
        {
            const th = document.createElement("th");
            th.className = "tinkleFilterToggleCell";
            th.textContent = "On";
            th.scope = "col";
            header.appendChild(th);
        }
        for (const row of body.rows)
        {
            const filter = ko.dataFor(row);
            if (!filter || typeof filter.enabled !== "function") continue;
            let cell = row.querySelector(".tinkleFilterToggleCell");
            if (!cell)
            {
                cell = row.insertCell();
                cell.className = "tinkleFilterToggleCell";
                const button = document.createElement("button");
                button.type = "button";
                button.className = "tinkleFilterToggle";
                button.setAttribute("role", "switch");
                button.addEventListener("click", event =>
                {
                    event.stopPropagation();
                    const current = ko.dataFor(row);
                    if (!current || current.name === "Automation" || typeof current.enabled !== "function") return;
                    current.enabled(!current.enabled());
                    this.refresh(panel);
                });
                button.addEventListener("contextmenu", event =>
                {
                    event.preventDefault();
                    event.stopPropagation();
                });
                cell.appendChild(button);
            }
            const button = cell.firstElementChild;
            const managed = filter.name === "Automation";
            button.disabled = managed;
            button.setAttribute("aria-checked", String(!!filter.enabled()));
            button.setAttribute("aria-label", "Enable filter " + filter.name);
            button.title = managed ? "Managed by automation" : (filter.enabled() ? "Disable " : "Enable ") + filter.name;
        }
    }
}
