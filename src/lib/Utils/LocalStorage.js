
/**
 * Automation local storage with global settings
 * shared across all Pokeclicker saves.
 */
class AutomationUtilsLocalStorage
{
    static getValue(key)
    {
        return localStorage.getItem(
            this.__internal__getSaveSpecificKey(key)
        );
    }

    static setValue(key, value)
    {
        localStorage.setItem(
            this.__internal__getSaveSpecificKey(key),
            value
        );
    }

    static setDefaultValue(key, defaultValue)
    {
        let playerKey = this.__internal__getSaveSpecificKey(key);

        if (localStorage.getItem(playerKey) === null)
        {
            localStorage.setItem(playerKey, defaultValue);
        }
    }

    static unsetValue(key)
    {
        return localStorage.removeItem(
            this.__internal__getSaveSpecificKey(key)
        );
    }

    static __internal__getSaveSpecificKey(key)
    {
        const globalKey = `Automation-Global-${key}`;
        const oldKey = `Automation-${Save.key}-${key}`;

        // Migrate existing settings to global storage
        if (localStorage.getItem(globalKey) === null)
        {
            const oldValue = localStorage.getItem(oldKey);

            if (oldValue !== null)
            {
                localStorage.setItem(globalKey, oldValue);
            }
        }

        return globalKey;
    }
}
