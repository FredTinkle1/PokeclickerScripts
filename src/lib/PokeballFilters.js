/**
 * Adds quick toggles to the native Poké Balls table.
 * The game's filter observables remain the single source of truth.
 */
class AutomationPokeballFilters
{
    static timer = null;

    static initialize(step)
    {
        if (step !== Automation.InitSteps.Finalize || this.timer !== null) return;
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
        // Poll at a bounded rate rather than observing mutations caused by our
        // own DOM updates. This prevents recursive microtask starvation.
        const refresh = () =>
        {
            try
            {
                const currentPanel = document.getElementById("pokeballSelector");
                if (currentPanel) this.refresh(currentPanel);
            }
            catch (error)
            {
                clearInterval(this.timer);
                this.timer = null;
                console.error("[TINKLE AUTOMATION] Quick filter controls stopped:", error);
            }
        };
        this.timer = setInterval(refresh, 500);
        refresh();
    }

    static refresh(panel)
    {
        const body = panel.querySelector("#pokeballFilters");
        const table = body?.closest("table");
        const header = table?.tHead?.rows[0];
        if (!body || !header) return;
        if (!table.classList.contains("tinkleFilterTable")) table.classList.add("tinkleFilterTable");
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
                    button.setAttribute("aria-checked", String(!!current.enabled()));
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
            const state = String(!!filter.enabled());
            const label = "Enable filter " + filter.name;
            const title = managed ? "Managed by automation" : (filter.enabled() ? "Disable " : "Enable ") + filter.name;
            if (button.disabled !== managed) button.disabled = managed;
            if (button.getAttribute("aria-checked") !== state) button.setAttribute("aria-checked", state);
            if (button.getAttribute("aria-label") !== label) button.setAttribute("aria-label", label);
            if (button.title !== title) button.title = title;
        }
    }
}
