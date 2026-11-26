/**
 * TINKLE AUTOMATION: optional in-game hour and regional weather overrides.
 * Approach references: YggdrasziI Simple Time Changer and KarmaAlex Simple
 * Weather Changer (credit Ephenia and Optimatum), GPL-3.0.
 * https://github.com/YggdrasziI/Pokeclicker-Scripts
 */
class AutomationTimeWeather
{
    static Settings = { Hour: "TimeWeather-Hour", Weather: "TimeWeather-Weather" };
    static hour = -1;
    static weather = -1;
    static weatherOptions = [];
    static installed = false;

    static initialize(step)
    {
        if (step === Automation.InitSteps.BuildMenu)
        {
            // Fail closed if a future game version changes these APIs.
            if (typeof GameHelper === "undefined" || typeof Weather === "undefined"
                || typeof WeatherType === "undefined"
                || typeof GameHelper.tick !== "function"
                || typeof GameHelper.currentTime !== "function"
                || typeof Weather.generateWeather !== "function"
                || !Weather.regionalWeather || typeof Weather.regionalWeather.forEach !== "function")
            {
                console.warn("[TINKLE AUTOMATION] Time & Weather unavailable: incompatible game API.");
                return;
            }
            const storage = Automation.Utils.LocalStorage;
            storage.setDefaultValue(this.Settings.Hour, -1);
            storage.setDefaultValue(this.Settings.Weather, -1);
            this.weatherOptions = Object.entries(WeatherType)
                .filter(([name, value]) => typeof value === "number" && value >= 0)
                .map(([name, value]) => [value, name.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2")]);
            this.hour = Number(storage.getValue(this.Settings.Hour));
            this.weather = Number(storage.getValue(this.Settings.Weather));
            if (!Number.isInteger(this.hour) || this.hour < -1 || this.hour > 23) this.hour = -1;
            if (!this.weatherOptions.some(([value]) => value === this.weather)) this.weather = -1;

            const container = document.createElement("div");
            Automation.Menu.AutomationButtonsDiv.appendChild(container);
            Automation.Menu.addSeparator(container);
            const title = document.createElement("div");
            title.textContent = "Time & Weather";
            title.style.textAlign = "center";
            container.appendChild(title);

            const addSelect = (label, options, value, change) =>
            {
                const row = document.createElement("label");
                Object.assign(row.style, { display: "flex", alignItems: "center", gap: "4px",
                    margin: "2px 5px", fontSize: "12px" });
                const caption = document.createElement("span");
                caption.textContent = label;
                row.appendChild(caption);
                const select = document.createElement("select");
                Object.assign(select.style, { flex: "1", minWidth: "0", height: "22px", fontSize: "11px" });
                for (const [id, name] of options)
                {
                    const option = document.createElement("option");
                    option.value = String(id);
                    option.textContent = name;
                    select.appendChild(option);
                }
                select.value = String(value);
                select.addEventListener("change", () => change(Number(select.value)));
                row.appendChild(select);
                container.appendChild(row);
                return select;
            };
            const hours = Array.from({ length: 24 }, (_, h) =>
                [h, String(h).padStart(2, "0") + ":00"]);
            const timeSelect = addSelect("Time", [[-1, "Real time"], ...hours], this.hour, value =>
            {
                this.hour = value;
                storage.setValue(this.Settings.Hour, value);
                this.applyHour(true);
            });
            const weatherSelect = addSelect("Weather", [[-1, "Default"], ...this.weatherOptions], this.weather, value =>
            {
                this.weather = value;
                storage.setValue(this.Settings.Weather, value);
                Weather.generateWeather(new Date());
            });
            const reset = document.createElement("button");
            reset.type = "button";
            reset.className = "btn btn-sm btn-secondary";
            reset.textContent = "Restore defaults";
            Object.assign(reset.style, { display: "block", margin: "4px auto", fontSize: "11px", padding: "1px 5px" });
            reset.addEventListener("click", () =>
            {
                timeSelect.value = "-1";
                weatherSelect.value = "-1";
                timeSelect.dispatchEvent(new Event("change"));
                weatherSelect.dispatchEvent(new Event("change"));
            });
            container.appendChild(reset);
            this.installHooks();
        }
        else if (step === Automation.InitSteps.Finalize && this.installed)
        {
            this.applyHour(false);
            if (this.weather >= 0) Weather.generateWeather(new Date());
        }
    }

    static applyHour(restore)
    {
        if (this.hour < 0)
        {
            if (restore) GameHelper.currentTime(new Date());
            return;
        }
        const now = new Date(GameHelper.currentTime());
        if (Number.isNaN(now.getTime())) return;
        if (now.getHours() !== this.hour)
        {
            now.setHours(this.hour);
            GameHelper.currentTime(now);
        }
    }

    static installHooks()
    {
        if (this.installed) return;
        const owner = this;
        const tick = GameHelper.tick;
        GameHelper.tick = function (...args)
        {
            const result = tick.apply(this, args);
            if (owner.hour >= 0) owner.applyHour(false);
            return result;
        };
        const generate = Weather.generateWeather;
        Weather.generateWeather = function (...args)
        {
            if (owner.weather < 0) return generate.apply(this, args);
            Weather.regionalWeather.forEach(observable =>
            {
                if (typeof observable === "function") observable(owner.weather);
            });
        };
        this.installed = true;
    }
}
