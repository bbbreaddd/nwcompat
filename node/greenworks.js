module.exports = {
    initAPI() {
        const db = nwcompat.getDbAchievements();
        if (!db) {
            console.error(`greenworks.initAPI: no achievements found for game '${nwcompat.game}'`);
            return false;
        }

        return true;
    },
    getNumberOfAchievements() {
        return Object.keys(nwcompat.getDbAchievements() || {}).length;
    },
    getAchievementNames() {
        return Object.keys(nwcompat.getDbAchievements() || {});
    },
    getAchievement(name, callback) {
        callback(!!nwcompat.savedData.achievements[name]);
    },
    isSteamRunning() {
        return true;
    },
    getSteamId() {
        return { screenName: "Mobile Player" };
    },
    getCurrentUILanguage() {
        return "english";
    },
    getCurrentGameLanguage() {
        return "english";
    },
    activateAchievement(id, successCallback, errorCallback) {
        const db = nwcompat.getDbAchievements();
        const info = db ? db[id] : null;
        if (!info) {
            console.error(`greenworks.activateAchievement: '${id}' not found`);
            if (errorCallback) errorCallback();
            return;
        }

        if (nwcompat.savedData.achievements[id] === true) {
            return;
        }

        nwcompat.savedData.achievements[id] = true;
        nwcompat.saveData();

        successCallback(true);

        const el = nwcompat.createAchievementElement(info.name, info.description, info.img, id);
        document.querySelector(".nwcompat-achievement-area").appendChild(el);

        setTimeout(() => {
            document.getElementById(id)?.remove();
        }, 5000);
    },
};
