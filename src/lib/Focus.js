/**
 * @class The AutomationFocus regroups the 'Focus on' button functionalities
 */
class AutomationFocus
{
    // Aliases on the other classes
    static Achievements = AutomationFocusAchievements;
    static Quests = AutomationFocusQuests;
    static PokerusCure = AutomationFocusPokerusCure;
    static ShadowPurification = AutomationFocusShadowPurification;

    static Settings = {
                          FeatureEnabled: "Focus-Enabled",
                          FocusedTopic: "Focus-SelectedTopic",
                          OakItemLoadoutUpdate: "Focus-OakItemLoadoutUpdate",
                          BallToUseToCatch: "Focus-BallToUseToCatch"
                      };

    /**
     * @brief Initializes the component
     *
     * @param initStep: The current automation init step
     */
    static initialize(initStep)
    {
        // Only consider the BuildMenu init step
        if (initStep == Automation.InitSteps.BuildMenu)
        {
            // Disable 'Focus on' by default
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.FeatureEnabled, false);

            this.__internal__buildFunctionalitiesList();
            this.__internal__buildMenu();
        }
        else if (initStep == Automation.InitSteps.Finalize)
        {
            // Restore previous session state
            this.__internal__toggleFocus();
        }
    }

    /******************************************************************************\
    |***    Focus specific members, should only be used by focus sub-classes    ***|
    \******************************************************************************/

    static __noFunctionalityRefresh = -1;
    static __pokeballToUseSelectElem = null;

    /**
     * @brief Makes sure no instance is in progress
     *        It will ask the Dungeon 'Auto fight' feature to stop if enabled
     *
     * @returns True if no instance is in progress, false otherwise
     */
    static __ensureNoInstanceIsInProgress()
    {
        // Ask the dungeon auto-fight to stop, if the feature is enabled
        if (Automation.Utils.LocalStorage.getValue(Automation.Dungeon.Settings.FeatureEnabled) === "true")
        {
            Automation.Dungeon.stopAfterThisRun();
            return false;
        }

        // Disable 'Focus on' if an instance is in progress, and exit
        if (Automation.Utils.isInInstanceState())
        {
            Automation.Menu.forceAutomationState(this.Settings.FeatureEnabled, false);
            Automation.Notifications.sendWarningNotif("Can't run while in an instance\nTurning the feature off", "Focus");
            return false;
        }

        return true;
    }

    /**
     * @brief Moves the player to the best route for EXP farming
     *
     * @note If the user is in a state in which he cannot be moved, the feature is automatically disabled.
     */
    static __goToBestRouteForDungeonToken()
    {
        if (!this.__ensureNoInstanceIsInProgress())
        {
            return;
        }

        const selectedPokeball = parseInt(Automation.Utils.LocalStorage.getValue(this.Settings.BallToUseToCatch));

        // Ensure that the player has some balls available
        if (!this.__ensurePlayerHasEnoughBalls(selectedPokeball))
        {
            return;
        }

        // Equip the Oak item catch loadout
        this.__equipLoadout(Automation.Utils.OakItem.Setup.PokemonCatch);

        // Equip an "Already caught" pokeball
        Automation.Utils.Pokeball.catchEverythingWith(selectedPokeball);

        // Move to the highest unlocked route
        Automation.Utils.Route.moveToHighestDungeonTokenIncomeRoute(selectedPokeball);
    }

    /**
     * @brief Waits for the 'Auto Fight' menu to appear, and then chooses the right opponent and enables it
     *
     * @param {string} gymName
     */
    static __enableAutoGymFight(gymName)
    {
        const menuWatcher = setInterval(function()
            {
                if (Automation.Utils.LocalStorage.getValue(this.Settings.FeatureEnabled) === "false")
                {
                    clearInterval(menuWatcher);
                    return;
                }

                for (const option of Automation.Gym.GymSelectElem.options)
                {
                    if (option.value === gymName)
                    {
                        option.selected = true;
                        Automation.Menu.forceAutomationState(Automation.Gym.Settings.FeatureEnabled, true);
                        clearInterval(menuWatcher);
                        break;
                    }
                }
            }.bind(this), 50); // Check every game tick
    }

    /**
     * @brief Moves the player to the best gym to earn the given @p gemType
     *        If no gym is found, moves to the best route to earn the given @p gemType
     *
     * @note If the user is in a state in which he cannot be moved, the feature is automatically disabled.
     */
    static __goToBestGymOrRouteForGem(gemType)
    {
        if (!this.__ensureNoInstanceIsInProgress())
        {
            return;
        }

        const bestGym = Automation.Utils.Gym.findBestGymForFarmingType(gemType);
        const bestRoute = Automation.Utils.Route.findBestRouteForFarmingType(gemType);

        // Compare with a 1/1000 precision
        if ((bestGym !== null) && (Math.ceil(bestGym.Rate * 1000) >= Math.ceil(bestRoute.Rate * 1000)))
        {
            Automation.Utils.Route.moveToTown(bestGym.Town);
            this.__enableAutoGymFight(bestGym.Name);
        }
        else
        {
            Automation.Utils.Route.moveToRoute(bestRoute.Route, bestRoute.Region);
        }
    }

    /**
     * @brief Updates the Oak item loadout with the provided @p loadoutCandidates
     *
     * @note The loadout will only be modified if the OakItemLoadoutUpdate is enabled
     *
     * @see Automation.Utils.OakItem.equipLoadout()
     *
     * @param {Array} loadoutCandidates: The wanted loadout composition
     */
    static __equipLoadout(loadoutCandidates)
    {
        if (Automation.Utils.LocalStorage.getValue(this.Settings.OakItemLoadoutUpdate) === "true")
        {
            Automation.Utils.OakItem.equipLoadout(loadoutCandidates);
        }
    }

    /**
     * @brief Ensures that the player has some balls of the given @p ballType
     *        Otherwise, it will move to the best gym to farm money until it can buy 10 of those
     *
     * @param ballType: The ball type to have
     *
     * @returns True if the player has some, false otherwise
     */
    static __ensurePlayerHasEnoughBalls(ballType)
    {
        // Buy some balls if needed
        if (App.game.pokeballs.getBallQuantity(ballType) === 0)
        {
            const pokeballName = GameConstants.Pokeball[ballType];
            const pokeballItem = ItemList[pokeballName];

            // Disable the feature if we are not able to buy more balls (for now, only money currency is supported)
            if (pokeballItem.currency != GameConstants.Currency.money)
            {
                Automation.Menu.forceAutomationState(this.Settings.FeatureEnabled, false);
                Automation.Notifications.sendWarningNotif("No more pokéball of the selected type are available", "Focus");
                return false;
            }

            // No more money, or too expensive, go farm some money
            if ((App.game.wallet.currencies[GameConstants.Currency.money]() < pokeballItem.totalPrice(10))
                || (pokeballItem.totalPrice(1) !== pokeballItem.basePrice))
            {
                this.__internal__goToBestGymForMoney();
                return false;
            }

            pokeballItem.buy(10);
        }

        return true;
    }

    /*********************************************************************\
    |***    Internal members, should never be used by other classes    ***|
    \*********************************************************************/

    static __internal__focusLoop = null;
    static __internal__activeFocus = null;
    static __internal__focusSelectElem = null;

    static __internal__functionalities = [];
    static __internal__lockedFunctionalities = [];

    static __internal__lastFocusData = null;
    static __internal__shinyPanel = null;
    static __internal__shinyPanelLastContent = null;
    static __internal__shinyHuntComplete = false;

    /**
     * @brief Builds the menu
     *
     * The 'Focus on' functionality is disabled by default (if never set in a previous session)
     */
    static __internal__buildMenu()
    {
        // Add the related buttons to the automation menu
        const focusContainer = document.createElement("div");
        focusContainer.style.textAlign = "center";
        Automation.Menu.AutomationButtonsDiv.appendChild(focusContainer);

        // Add the title
        const titleDiv = Automation.Menu.createTitleElement("Focus on");
        focusContainer.appendChild(titleDiv);

        // Button and list container
        const buttonContainer = document.createElement("div");
        buttonContainer.style.textAlign = "right";
        buttonContainer.classList.add("hasAutomationTooltip");
        focusContainer.appendChild(buttonContainer);

        // Add the drop-down list
        this.__internal__focusSelectElem = Automation.Menu.createDropDownListElement("focusSelection");
        this.__internal__focusSelectElem.style.width = "calc(100% - 55px)";
        this.__internal__focusSelectElem.style.paddingLeft = "3px";
        buttonContainer.appendChild(this.__internal__focusSelectElem);

        this.__internal__populateFocusOptions();
        this.__internal__focusOnChanged(false);
        this.__internal__focusSelectElem.onchange = function() { Automation.Focus.__internal__focusOnChanged(); };

        // Add the 'Focus on' button
        const focusButton = Automation.Menu.createButtonElement(this.Settings.FeatureEnabled);
        const isFeatureEnabled = (Automation.Utils.LocalStorage.getValue(this.Settings.FeatureEnabled) === "true");
        focusButton.textContent = (isFeatureEnabled ? "On" : "Off");
        focusButton.classList.add(isFeatureEnabled ? "btn-success" : "btn-danger");
        focusButton.onclick = function() { Automation.Menu.toggleButtonState(this.Settings.FeatureEnabled) }.bind(this);
        focusButton.style.marginTop = "3px";
        focusButton.style.marginLeft = "5px";
        focusButton.style.marginRight = "10px";
        buttonContainer.appendChild(focusButton);

        // Toggle the 'Focus on' loop on click
        focusButton.addEventListener("click", this.__internal__toggleFocus.bind(this), false);

        // Build the shiny hunting status panel
        this.__internal__buildShinyPanel(focusContainer);

        // Build advanced settings
        this.__internal__buildAdvancedSettings(focusContainer);

        // Set an unlock watcher if needed
        if (this.__internal__lockedFunctionalities.length != 0)
        {
            this.__internal__setUnlockWatcher();
        }
    }

    /**
     * @brief Builds the 'Focus on' feature advanced settings panel
     *
     * @param {Element} parent: The parent div to add the settings to
     */
    static __internal__buildAdvancedSettings(parent)
    {
        // Build advanced settings panel
        const focusSettingPanel = Automation.Menu.addSettingPanel(parent);
        focusSettingPanel.style.textAlign = "right";

        const titleDiv = Automation.Menu.createTitleElement("'Focus on' advanced settings");
        titleDiv.style.marginBottom = "10px";
        focusSettingPanel.appendChild(titleDiv);

        const focusSettingsTabsGroup = "automationFocusSettings";
        const generalTabContainer = Automation.Menu.addTabElement(focusSettingPanel, "General", focusSettingsTabsGroup);

        /**********************\
        |*   Balls settings   *|
        \**********************/

        this.__internal__buildBallSelectionAdvancedSettings(generalTabContainer);

        /**********************\
        |*  Toggles settings  *|
        \**********************/

        // Add some space
        generalTabContainer.appendChild(document.createElement("br"));

        // OakItem loadout setting
        const disableOakItemTooltip = "Modifies the oak item loadout automatically";
        Automation.Menu.addLabeledAdvancedSettingsToggleButton("Optimize oak item loadout",
                                                               this.Settings.OakItemLoadoutUpdate,
                                                               disableOakItemTooltip,
                                                               generalTabContainer);

        /*********************\
        |*  Quests settings  *|
        \*********************/

        const questTabContainer = Automation.Menu.addTabElement(focusSettingPanel, "Quests", focusSettingsTabsGroup);
        this.Quests.__buildAdvancedSettings(questTabContainer);

        /***************************\
        |*  Achievements settings  *|
        \***************************/

        const achievementsTabContainer = Automation.Menu.addTabElement(focusSettingPanel, "Achievements", focusSettingsTabsGroup);
        this.Achievements.__buildAdvancedSettings(achievementsTabContainer);

        /***************************\
        |*  Pokérus Cure settings  *|
        \***************************/

        const pokerusCureTabContainer = Automation.Menu.addTabElement(focusSettingPanel, "Pokérus Cure", focusSettingsTabsGroup);
        this.PokerusCure.__buildAdvancedSettings(pokerusCureTabContainer);
    }

    /**
     * @brief Builds the ball selection advanced settings drop-down lists
     *
     * @param {Element} generalTabContainer: The tab container
     */
    static __internal__buildBallSelectionAdvancedSettings(generalTabContainer)
    {
        const disclaimer = Automation.Menu.TooltipSeparator + "⚠️ Equipping higher pokéballs can be cost-heavy during early game";

        // Pokeball to use for catching
        const pokeballToUseTooltip = "Defines which pokeball will be equipped to catch\n"
                                   + "already caught pokémon, when needed"
                                   + disclaimer;

        this.__internal__setBallToUseToCatchDefaultValue();

        this.__pokeballToUseSelectElem = Automation.Menu.addPokeballList(this.Settings.BallToUseToCatch,
                                                                         "Pokeball to use for catching",
                                                                         pokeballToUseTooltip);
        generalTabContainer.appendChild(this.__pokeballToUseSelectElem);
    }

    /**
     * @brief Toggles the 'Focus on' feature
     *
     * If the feature was enabled and it's toggled to disabled, the loop will be stopped.
     * If the feature was disabled and it's toggled to enabled, the loop will be started.
     *
     * @param enable: [Optional] If a boolean is passed, it will be used to set the right state.
     *                Otherwise, the local storage value will be used
     */
    static __internal__toggleFocus(enable)
    {
        // If we got the click event, use the button status
        if ((enable !== true) && (enable !== false))
        {
            enable = (Automation.Utils.LocalStorage.getValue(this.Settings.FeatureEnabled) === "true");
        }

        if (enable)
        {
            // Only set a loop if there is none active
            if (this.__internal__focusLoop === null)
            {
                // Save the active focus
                this.__internal__activeFocus =
                    this.__internal__functionalities.filter((functionality) => functionality.id === this.__internal__focusSelectElem.value)[0];

                // Set focus loop if needed
                if (this.__internal__activeFocus.refreshRateAsMs !== this.__noFunctionalityRefresh)
                {
                    this.__internal__focusLoop = setInterval(this.__internal__activeFocus.run, this.__internal__activeFocus.refreshRateAsMs);
                }

                // First loop run (to avoid waiting too long before the first iteration, in case of long refresh rate)
                this.__internal__activeFocus.run();
            }
        }
        else
        {
            // Unregister the loop
            clearInterval(this.__internal__focusLoop);
            if (this.__internal__activeFocus !== null)
            {
                if (this.__internal__activeFocus.stop !== undefined)
                {
                    // Reset any dungeon request that might have occured
                    Automation.Dungeon.stopAfterThisRun();

                    this.__internal__activeFocus.stop();
                }
                this.__internal__activeFocus = null;
            }
            this.__internal__focusLoop = null;
            this.__internal__lastFocusData = null;
        }
    }

    /**
     * @brief Build the list of available elements that the player will be able to set the focus on
     */
    static __internal__buildFunctionalitiesList()
    {
        this.__internal__functionalities.push(
            {
                id: "XP",
                name: "Experience",
                tooltip: "Automatically moves to the best route for EXP"
                       + Automation.Menu.TooltipSeparator
                       + "Such route is the highest unlocked one\n"
                       + "with HP lower than Click Attack",
                run: function() { this.__internal__goToBestRouteForExp(); }.bind(this),
                refreshRateAsMs: 10000 // Refresh every 10s
            });

        this.__internal__functionalities.push(
            {
                id: "Gold",
                name: "Money",
                tooltip: "Automatically moves to the best gym for money"
                       + Automation.Menu.TooltipSeparator
                       + "Gyms gives way more money than routes\n"
                       + "The best gym is the one that gives the most money per game tick",
                run: function() { this.__internal__goToBestGymForMoney(); }.bind(this),
                stop: function() { Automation.Menu.forceAutomationState(Automation.Gym.Settings.FeatureEnabled, false); },
                refreshRateAsMs: 10000 // Refresh every 10s
            });

        this.__internal__functionalities.push(
            {
                id: "DungeonTokens",
                name: "Dungeon Tokens",
                tooltip: "Moves to the best route to earn dungeon tokens"
                       + Automation.Menu.TooltipSeparator
                       + "The most efficient route is the one giving\n"
                       + "the most token per game tick.\n"
                       + "The most efficient Oak items loadout will be equipped.\n"
                       + "The configured balls will automatically be used and bought if needed.",
                run: function() { this.__goToBestRouteForDungeonToken(); }.bind(this),
                stop: function()
                    {
                        Automation.Menu.forceAutomationState(Automation.Gym.Settings.FeatureEnabled, false);
                        Automation.Utils.Pokeball.disableAutomationFilter();
                    }.bind(this),
                refreshRateAsMs: 3000 // Refresh every 3s
            });

        this.__internal__functionalities.push(
            {
                id: "Shinies",
                name: "Shinies",
                tooltip: "Automatically hunts missing shiny Pokémon."
                       + Automation.Menu.TooltipSeparator
                       + "Moves to the first accessible route with missing shinies.\n"
                       + "Automatically advances when all route shinies are caught.\n"
                       + "Roaming Pokémon are excluded.",
                run: function()
                {
                    this.__internal__huntMissingShinies();
                }.bind(this),
                stop: function()
                {
                    this.__internal__updateShinyPanelVisibility();
                }.bind(this),
                refreshRateAsMs: 3000
            });


        
        this.Quests.__registerFunctionalities(this.__internal__functionalities);
        this.Achievements.__registerFunctionalities(this.__internal__functionalities);
        this.PokerusCure.__registerFunctionalities(this.__internal__functionalities);
        this.ShadowPurification.__registerFunctionalities(this.__internal__functionalities);

        this.__internal__addGemsFocusFunctionalities();
    }

    /**
     * @brief Adds a separator to the focus drop-down list
     *
     * @param {string} title: The separator text to display
     * @param {CallableFunction} isUnlockedCallback: The condition to display the separator
     */
    static __internal__addFunctionalitySeparator(title, isUnlockedCallback = function() { return true; })
    {
        this.__internal__functionalities.push({ id: "separator", name: title, tooltip: "", isUnlocked: isUnlockedCallback });
    }

    /**
     * @brief Registers all gem focus features to the drop-down list
     */
    static __internal__addGemsFocusFunctionalities()
    {
        const isUnlockedCallback = function() { return App.game.gems.canAccess(); };
        this.__internal__addFunctionalitySeparator("==== Gems ====", isUnlockedCallback);

        // Sort the types alphabetically
        const gemListCopy = [...Array(Gems.nTypes).keys()];
        gemListCopy.sort((a, b) => (PokemonType[a] < PokemonType[b]) ? -1 : 1);

        for (const gemType of gemListCopy)
        {
            const gemTypeName = PokemonType[gemType];

            this.__internal__functionalities.push(
                {
                    id: gemTypeName + "Gems",
                    name: gemTypeName + " Gems",
                    tooltip: "Moves to the best gym or route to earn " + gemTypeName + " gems"
                           + Automation.Menu.TooltipSeparator
                           + "The best location is the one that will give the most\n"
                           + gemTypeName + " gems per game tick.\n"
                           + "Both gyms and routes are considered, the best one will be used.",
                    run: function() { this.__goToBestGymOrRouteForGem(gemType); }.bind(this),
                    stop: function() { Automation.Menu.forceAutomationState(Automation.Gym.Settings.FeatureEnabled, false); },
                    isUnlocked: isUnlockedCallback,
                    refreshRateAsMs: 10000 // Refresh every 10s
                });
        }
    }

    /**
     * @brief Populates the drop-down list based on the registered functionalities
     *
     * If any functionality is locked, the corresponding focus topic will be hidden to the player.
     */
    static __internal__populateFocusOptions()
    {
        const lastAutomationFocusedTopic = Automation.Utils.LocalStorage.getValue(this.Settings.FocusedTopic);
        for (const functionality of this.__internal__functionalities)
        {
            const opt = document.createElement("option");

            if ((functionality.isUnlocked !== undefined)
                && !functionality.isUnlocked())
            {
                this.__internal__lockedFunctionalities.push({ functionality, opt });
                opt.hidden = true;
            }

            if (functionality.id == "separator")
            {
                opt.disabled = true;
            }
            else
            {
                opt.value = functionality.id;
                opt.id = functionality.id;

                if (!opt.hidden && (lastAutomationFocusedTopic === functionality.id))
                {
                    // Restore previous session selected element
                    opt.selected = true;
                }
            }
            opt.textContent = functionality.name;

            this.__internal__focusSelectElem.options.add(opt);
        }
    }

    /**
     * @brief Watches for the in-game functionalities and balls to be available.
     *        Once available, the corresponding drop-down list item will be displayed to the user
     */
    static __internal__setUnlockWatcher()
    {
        const watcher = setInterval(function()
            {
                // Reverse iterate to avoid any problem that would be cause by element removal
                for (var i = this.__internal__lockedFunctionalities.length - 1; i >= 0; i--)
                {
                    if (this.__internal__lockedFunctionalities[i].functionality.isUnlocked())
                    {
                        // Make the element visible
                        this.__internal__lockedFunctionalities[i].opt.hidden = false;

                        // Remove the functionality from the locked list
                        this.__internal__lockedFunctionalities.splice(i, 1);
                    }
                }

                if (this.__internal__lockedFunctionalities.length == 0)
                {
                    // No more missing element, unregister the loop
                    clearInterval(watcher);
                }
            }.bind(this), 5000); // Refresh every 5s
    }

    /**
     * @brief Updates the tooltip and action on selected value changed event
     *
     * If a 'Focus on' action was in progress, it will be stopped
     *
     * @param {boolean} forceOff: If set to True (default value) the 'Focus on' feature will be turned off
     */
    static __internal__focusOnChanged(forceOff = true)
    {
        // Stop the current loop if any, and turn the button off
        if (forceOff)
        {
            // Stop the current loop if any, and disable the button
            Automation.Menu.forceAutomationState(this.Settings.FeatureEnabled, false);
        }

        // Update the tooltip
        const activeFocus = this.__internal__functionalities.filter((functionality) => functionality.id === this.__internal__focusSelectElem.value)[0];
        this.__internal__focusSelectElem.parentElement.setAttribute("automation-tooltip-text", activeFocus.tooltip);

        // Save the last selected topic
        Automation.Utils.LocalStorage.setValue(this.Settings.FocusedTopic, this.__internal__focusSelectElem.value);
        this.__internal__shinyHuntComplete = false;
        this.__internal__updateShinyPanelVisibility();
    }

    /**
     * @brief Moves the player to the best route for EXP farming
     *
     * @note If the user is in a state in which he cannot be moved, the feature is automatically disabled.
     *
     * @see Automation.Utils.Route.moveToBestRouteForExp
     */
    static __internal__goToBestRouteForExp()
    {
        if (!this.__ensureNoInstanceIsInProgress())
        {
            return;
        }

        // Equip the most effective Oak item loadout for XP farming
        this.__equipLoadout(Automation.Utils.OakItem.Setup.PokemonExp);

        Automation.Utils.Route.moveToBestRouteForExp();
    }

    /**
     * @brief Moves the player to the best gym for Money farming
     *
     * @note If the user is in a state in which he cannot be moved, the feature is automatically disabled.
     */
    static __internal__goToBestGymForMoney()
    {
        if (!this.__ensureNoInstanceIsInProgress())
        {
            return;
        }

        // Only compute the gym the first time, since there is almost no chance that it will change while the feature is active
        if (this.__internal__lastFocusData === null)
        {
            this.__internal__lastFocusData = Automation.Utils.Gym.findBestGymForMoney();
        }

        // Equip the 'money' Oak loadout
        this.__equipLoadout(Automation.Utils.OakItem.Setup.Money);

        // Fallback to the exp route if no gym can be found
        if (this.__internal__lastFocusData.bestGymTown === null)
        {
            Automation.Utils.Route.moveToBestRouteForExp();
            return;
        }

        Automation.Utils.Route.moveToTown(this.__internal__lastFocusData.bestGymTown);
        this.__enableAutoGymFight(this.__internal__lastFocusData.bestGym);
    }

    /**
     * @brief Sets the default value of the BallToUseToCatch setting
     */
    static __internal__setBallToUseToCatchDefaultValue()
    {
        // Set the most effective available ball in priority
        for (const ball of [ GameConstants.Pokeball.Ultraball, GameConstants.Pokeball.Greatball, GameConstants.Pokeball.Pokeball ])
        {
            if (App.game.pokeballs.pokeballs[ball].unlocked())
            {
                Automation.Utils.LocalStorage.setDefaultValue(this.Settings.BallToUseToCatch, ball);
                break;
            }
        }
    }

    
    /**
     * Builds the shiny hunting status panel.
     */
    static __internal__buildShinyPanel(parent)
    {
        // Independent of the automation sidebar and its settings popouts.
        const wrapper = document.createElement("details");
        wrapper.id = "automationShinyHuntingOverlay";
        wrapper.open = true;
        Object.assign(wrapper.style, {
            position: "relative",
            width: "240px",
            maxWidth: "calc(100vw - 20px)",
            boxSizing: "border-box",
            backgroundColor: "#444444",
            color: "#eeeeee",
            border: "1px solid #aaaaaa",
            borderRadius: "5px",
            fontFamily: "inherit",
            fontSize: "12px",
            lineHeight: "1.4",
            textAlign: "left",
            zIndex: "999"
        });
        const title = document.createElement("summary");
        title.textContent = "Shiny Hunting";
        Object.assign(title.style, {
            cursor: "pointer", padding: "8px 10px", fontWeight: "bold"
        });
        wrapper.appendChild(title);

        const panel = document.createElement("div");
        panel.id = "automationShinyHuntingPanel";
        Object.assign(panel.style, {
            padding: "8px 10px",
            maxHeight: "max(80px, calc(100vh - 220px))",
            overflowY: "auto",
            boxSizing: "border-box",
            borderTop: "1px solid #777"
        });
        wrapper.appendChild(panel);
        (document.getElementById("automationLeftSidebar") || document.body).appendChild(wrapper);
        this.__internal__shinyPanel = panel;
        this.__internal__updateShinyPanelVisibility();
    }

    /**
     * Shows or hides the panel depending on the selected
     * focus mode.
     */
    static __internal__updateShinyPanelVisibility()
    {
        const panel = this.__internal__shinyPanel;

        if (!panel)
        {
            return;
        }

        const shinySelected =
            this.__internal__focusSelectElem.value === "Shinies";

        panel.parentElement.hidden = !shinySelected;
        panel.hidden = !shinySelected;

        if (!shinySelected)
        {
            panel.innerHTML = "";
            this.__internal__shinyPanelLastContent = null;
            return;
        }

        const enabled =
            Automation.Utils.LocalStorage.getValue(
                this.Settings.FeatureEnabled
            ) === "true";

        if (!enabled && !this.__internal__shinyHuntComplete)
        {
            panel.innerHTML =
                '<div style="text-align:center;">' +
                'Enable Focus to begin hunting.' +
                '</div>';

            this.__internal__shinyPanelLastContent = null;
        }
    }

    /**
     * Gets the normally encounterable Pokémon on a route
     * and determines whether each has been caught shiny.
     */
    static __internal__getRouteShinyStatus(route)
    {
        const pokemonNames = [...new Set(
            RouteHelper.getAvailablePokemonList(
                route.number,
                route.region
            )
        )];

        return pokemonNames.map(name =>
        {
            const pokemon = PokemonHelper.getPokemonByName(name);

            return {
                name: name,
                id: pokemon.id,
                caught: App.game.party.alreadyCaughtPokemon(
                    pokemon.id,
                    true
                )
            };
        });
    }

    /**
     * Updates the panel with the current route and its
     * shiny capture progress.
     */
    static __internal__updateShinyPanel(route, pokemonList)
    {
        const panel = this.__internal__shinyPanel;

        if (!panel)
        {
            return;
        }

        const total = pokemonList.length;

        const caught = pokemonList.filter(
            pokemon => pokemon.caught
        ).length;

        const missing = total - caught;

        const percentage = total > 0
            ? Math.floor(caught / total * 100)
            : 100;

        const rawRegion = String(GameConstants.Region[route.region] ?? route.region);
        const regionName = rawRegion.charAt(0).toUpperCase() + rawRegion.slice(1);

        const routeName =
            route.routeName || `Route ${route.number}`;

        const displayKey = JSON.stringify({
            region: route.region,
            route: route.number,
            pokemon: pokemonList
        });

        // Avoid rebuilding the panel unnecessarily.
        if (displayKey === this.__internal__shinyPanelLastContent)
        {
            return;
        }

        this.__internal__shinyPanelLastContent = displayKey;

        panel.hidden = false;

        let html = `
            <div style="text-align:center;">
                <strong>
                    ${routeName.toLowerCase().startsWith(regionName.toLowerCase()) ? routeName : `${regionName} - ${routeName}`}
                </strong>
            </div>

            <div style="margin-top:8px;text-align:center;">
                ${caught} / ${total} shinies caught (${percentage}%)
            </div>

            <div style="
                width:100%;
                height:10px;
                background:#777;
                border-radius:5px;
                overflow:hidden;
                margin:5px 0 8px 0;
            ">
                <div style="
                    width:${percentage}%;
                    height:100%;
                    background:#28a745;
                "></div>
            </div>

            <div style="
                max-height:200px;
                overflow-y:auto;
            ">
        `;

        // Show missing Pokémon first.
        const sortedPokemon = [...pokemonList].sort(
            (a, b) => Number(a.caught) - Number(b.caught)
        );

        for (const pokemon of sortedPokemon)
        {
            const color = pokemon.caught
                ? "#28a745"
                : "#dc3545";

            const status = pokemon.caught
                ? "Caught"
                : "Missing";

            const symbol = pokemon.caught
                ? "&#10003;"
                : "&#10007;";

            html += `
                <div style="
                    display:flex;
                    align-items:center;
                    justify-content:space-between;
                    padding:3px 0;
                    border-bottom:1px solid rgba(128,128,128,0.2);
                ">
                    <div style="
                        display:flex;
                        align-items:center;
                        min-width:0;
                        flex:1;
                        overflow-wrap:anywhere;
                    ">
                        <img
                            src="assets/images/pokemon/shiny/${pokemon.id}.png"
                            style="width:28px;height:28px;margin-right:5px;"
                            onerror="this.style.display='none';"
                        >
                        <span>${pokemon.name}</span>
                    </div>

                    <span style="
                        color:${color};
                        font-weight:bold;
                        white-space:nowrap;
                        flex-shrink:0;
                        margin-left:5px;
                    ">
                        ${symbol} ${status}
                    </span>
                </div>
            `;
        }

        html += `
            </div>

            <div style="
                margin-top:8px;
                text-align:center;
            ">
                <strong>${missing} shinies remaining</strong>
                <br>
                <small>Roaming Pokémon excluded</small>
            </div>
        `;

        panel.innerHTML = html;
    }

    /**
     * Finds the first accessible route with missing shinies
     * and automatically battles on that route.
     */
    static __internal__huntMissingShinies()
    {
        this.__internal__shinyHuntComplete = false;

        if (!this.__ensureNoInstanceIsInProgress())
        {
            return;
        }

        // Search regions in order, then ascending route number.
        const routes = [...Routes.regionRoutes].sort(
            (a, b) =>
                (a.region - b.region) ||
                (a.number - b.number)
        );

        for (const route of routes)
        {
            // Skip inaccessible routes.
            if (!Automation.Utils.Route.canMoveToRoute(
                route.number,
                route.region,
                route
            ))
            {
                continue;
            }

            const pokemonList =
                this.__internal__getRouteShinyStatus(route);

            if (pokemonList.length === 0)
            {
                continue;
            }

            const missingShinies = pokemonList.filter(
                pokemon => !pokemon.caught
            );

            // Skip completed routes.
            if (missingShinies.length === 0)
            {
                continue;
            }

            // Move only when not already on the desired route.
            if (
                player.route !== route.number ||
                player.region !== route.region ||
                App.game.gameState !== GameConstants.GameState.fighting
            )
            {
                Automation.Utils.Route.moveToRoute(
                    route.number,
                    route.region
                );
            }

            // Enable the existing Auto attack feature.
            if (
                Automation.Utils.LocalStorage.getValue(
                    Automation.Click.Settings.FeatureEnabled
                ) !== "true"
            )
            {
                Automation.Menu.forceAutomationState(
                    Automation.Click.Settings.FeatureEnabled,
                    true
                );
            }

            // Update the live shiny tracking panel.
            this.__internal__updateShinyPanel(
                route,
                pokemonList
            );

            // Remain on this route until every shiny is caught.
            return;
        }

        // No accessible routes have missing shinies.
        this.__internal__shinyHuntComplete = true;
        this.__internal__shinyPanelLastContent = null;

        if (this.__internal__shinyPanel)
        {
            this.__internal__shinyPanel.innerHTML = `
                <div style="text-align:center;">
                    <strong style="color:#28a745;">
                        Shiny Hunting Complete
                    </strong>
                    <br><br>
                    All accessible route shinies have been caught!
                </div>
            `;
        }

        // Stop the focus loop.
        Automation.Menu.forceAutomationState(
            this.Settings.FeatureEnabled,
            false
        );

        Automation.Notifications.sendWarningNotif(
            "All accessible route shinies have been caught!",
            "Focus"
        );
    }

}
