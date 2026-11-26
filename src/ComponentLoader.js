
/**
 * @class The automation loader abstraction class.
 */
class AutomationComponentLoader
{
    static __baseUrl = null;
    static __loadingList = [];
    static __loadingProgressTable = {};
    static __loadingOrder = 0;

    // Unique cache buster for each game session.
    static __cacheBuster = Date.now();

    static loadFromUrl(baseUrl, disableFeaturesByDefault = false, disableSettingsByDefault = false)
    {
        this.__baseUrl = baseUrl;

        // Load dependencies first.
        this.__addScript("src/lib/Focus/Achievements.js");
        this.__addScript("src/lib/Focus/Quests.js");
        this.__addScript("src/lib/Focus/PokerusCure.js");
        this.__addScript("src/lib/Focus/ShadowPurification.js");
        this.__addScript("src/lib/Utils/Battle.js");
        this.__addScript("src/lib/Utils/Gym.js");
        this.__addScript("src/lib/Utils/LocalStorage.js");
        this.__addScript("src/lib/Utils/OakItem.js");
        this.__addScript("src/lib/Utils/Pokeball.js");
        this.__addScript("src/lib/Utils/Route.js");

        this.__loadingOrder += 1;

        // Load automation features.
        this.__addScript("src/lib/Instances/BattleCafe.js");
        this.__addScript("src/lib/Instances/BattleFrontier.js");
        this.__addScript("src/lib/Instances/Dungeon.js");
        this.__addScript("src/lib/Instances/Gym.js");
        this.__addScript("src/lib/Instances/Safari.js");

        this.__addScript("src/lib/Click.js");
        this.__addScript("src/lib/Farm.js");
        this.__addScript("src/lib/Focus.js");
        this.__addScript("src/lib/Hatchery.js");
        this.__addScript("src/lib/Items.js");
        this.__addScript("src/lib/Menu.js");
        this.__addScript("src/lib/Notifications.js");
        this.__addScript("src/lib/Shop.js");
        this.__addScript("src/lib/Purify.js");
        this.__addScript("src/lib/TimeWeather.js");
        this.__addScript("src/lib/PokeballFilters.js");
        this.__addScript("src/lib/Trivia.js");
        this.__addScript("src/lib/Underground.js");
        this.__addScript("src/lib/Utils.js");

        this.__loadingOrder += 1;

        // Load the main automation class.
        this.__addScript("src/Automation.js");

        this.__setupAutomationRunner(
            disableFeaturesByDefault,
            disableSettingsByDefault
        );
    }

    static __addScript(fileRelativePath)
    {
        this.__loadingList.push({
            order: this.__loadingOrder,
            filePath: fileRelativePath
        });
    }

    static __loadScript(fileRelativePath)
    {
        let scriptName =
            this.__extractNameFromFile(fileRelativePath);

        this.__loadingProgressTable[scriptName] = false;

        let request = new XMLHttpRequest();

        request.onreadystatechange = function()
        {
            if (request.readyState !== 4)
            {
                return;
            }

            if (request.status !== 200)
            {
                console.error(
                    "[Pokeclicker Automation] Failed to download:",
                    fileRelativePath,
                    "HTTP status:",
                    request.status
                );

                return;
            }

            try
            {
                // Check JavaScript syntax before injecting.
                new Function(request.responseText);

                var script = document.createElement("script");

                script.innerHTML = request.responseText;
                script.id = "pokeclicker-automation-" + scriptName;

                document.head.appendChild(script);

                this.__loadingProgressTable[scriptName] = true;

                console.log(
                    "[Pokeclicker Automation] Loaded:",
                    fileRelativePath
                );
            }
            catch (error)
            {
                console.error(
                    "[Pokeclicker Automation] Error loading:",
                    fileRelativePath,
                    error
                );
            }

        }.bind(this);

        request.onerror = function()
        {
            console.error(
                "[Pokeclicker Automation] Network error:",
                fileRelativePath
            );
        };

        // Prevent old cached scripts from being loaded.
        request.open(
            "GET",
            this.__baseUrl +
            fileRelativePath +
            "?t=" +
            this.__cacheBuster,
            true
        );

        request.send();
    }

    static __extractNameFromFile(filePath)
    {
        let libPrefix = "src/lib/";

        if (filePath.startsWith(libPrefix))
        {
            let result = filePath.substring(
                libPrefix.length,
                filePath.length - 3
            );

            return result.replace("/", "-").toLowerCase();
        }

        return filePath.match(
            /^(.*\/)?([^/]+)\.js$/
        )[2].toLowerCase();
    }

    static __setupAutomationRunner(
        disableFeaturesByDefault,
        disableSettingsByDefault
    )
    {
        let currentLoadingOrder = -1;

        let watcher = setInterval(function()
        {
            let isLoadingCompleted =
                Object.keys(this.__loadingProgressTable)
                .every(key => this.__loadingProgressTable[key]);

            let isGameStarted =
                typeof App !== "undefined" &&
                App.game &&
                App.game.worker &&
                App.game.worker instanceof Worker;

            if (!isLoadingCompleted || !isGameStarted)
            {
                return;
            }

            if (currentLoadingOrder !== this.__loadingOrder)
            {
                currentLoadingOrder += 1;

                for (const scriptData of this.__loadingList)
                {
                    if (scriptData.order === currentLoadingOrder)
                    {
                        this.__loadScript(scriptData.filePath);
                    }
                }

                return;
            }

            clearInterval(watcher);

            try
            {
                Automation.start(
                    disableFeaturesByDefault,
                    disableSettingsByDefault
                );

                console.log(
                    "[Pokeclicker Automation] Started successfully."
                );
            }
            catch (error)
            {
                console.error(
                    "[Pokeclicker Automation] Startup failed:",
                    error
                );
            }

        }.bind(this), 200);
    }
}
