/**
 * Adds quick toggles to the native Poké Balls table.
 * The game's filter observables remain the single source of truth.
 */
class AutomationPokeballFilters
{
    static subscription = null;
    static pending = null;

    static initialize(step)
    {
        if (step !== Automation.InitSteps.Finalize || this.subscription !== null) return;
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
        const list = App.game.pokeballFilters.displayList;
        if (typeof list?.subscribe !== "function") return;
        const schedule = () =>
        {
            if (this.pending !== null) return;
            this.pending = setTimeout(() =>
            {
                this.pending = null;
                try { this.refresh(panel); }
                catch (error)
                {
                    this.subscription?.dispose();
                    this.subscription = null;
                    console.error("[TINKLE AUTOMATION] Quick filters stopped:", error);
                }
            }, 0);
        };
        this.subscription = list.subscribe(schedule);
        schedule();
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
                cell.appendChild(button);
                const attrs = ko.pureComputed(() => ({
                    "aria-checked": String(!!filter.enabled()),
                    "aria-label": "Enable filter " + filter.name,
                    title: filter.name === "Automation" ? "Managed by automation"
                        : (filter.enabled() ? "Disable " : "Enable ") + filter.name
                }));
                const disabled = ko.pureComputed(() => filter.name === "Automation");
                ko.utils.domNodeDisposal.addDisposeCallback(button, () => {
                    attrs.dispose();
                    disabled.dispose();
                });
                ko.applyBindingsToNode(button, {
                    attr: attrs,
                    disable: disabled,
                    click: () => {
                        if (filter.name !== "Automation") filter.enabled(!filter.enabled());
                    },
                    clickBubble: false
                }, ko.contextFor(row));
                button.addEventListener("contextmenu", event => {
                    event.preventDefault();
                    event.stopPropagation();
                });
            }
        }
    }
}
