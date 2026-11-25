/**
 * Independent automatic Purify Chamber module.
 */
class AutomationPurify
{
    static Settings = { FeatureEnabled: "Purify-Enabled" };
    static __container = null;
    static __timer = null;

    static initialize(initStep)
    {
        if (initStep === Automation.InitSteps.BuildMenu)
        {
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.FeatureEnabled, false);
            this.__container = document.createElement("div");
            Automation.Menu.AutomationButtonsDiv.appendChild(this.__container);
            Automation.Menu.addSeparator(this.__container);
            const button = Automation.Menu.addAutomationButton(
                "Auto Purify", this.Settings.FeatureEnabled,
                "Automatically selects Shadow Pokémon and purifies them when the required flow is reached. Independent of Auto Shop.",
                this.__container);
            button.addEventListener("click", () => this.__tick());
            this.__container.hidden = !this.__isUnlocked();
        }
        else if (initStep === Automation.InitSteps.Finalize)
        {
            if (this.__timer === null)
            {
                this.__timer = setInterval(() => this.__tick(), 2000);
            }
            this.__tick();
        }
    }

    static __isUnlocked()
    {
        return typeof PurifyChamber !== "undefined"
            && !!App.game.purifyChamber
            && PurifyChamber.requirements.isCompleted();
    }

    static __tick()
    {
        const unlocked = this.__isUnlocked();
        if (this.__container) this.__container.hidden = !unlocked;
        if (!unlocked || Automation.Utils.LocalStorage.getValue(this.Settings.FeatureEnabled) !== "true")
        {
            return;
        }

        const chamber = App.game.purifyChamber;
        const shadow = GameConstants.ShadowStatus.Shadow;
        const nextShadow = () => App.game.party.caughtPokemon.find(p => p.shadow === shadow);
        const selected = chamber.selectedPokemon();
        if (!selected || selected.shadow !== shadow)
        {
            const next = nextShadow();
            if (!next) return;
            chamber.selectedPokemon(next);
        }

        if (chamber.canPurify())
        {
            chamber.purify();
            // Load another candidate immediately, before the next flow cycle.
            const next = nextShadow();
            if (next) chamber.selectedPokemon(next);
        }
    }
}
