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

        const uniqueId = `ach-${id}-${Date.now()}`;
        const el = nwcompat.createAchievementElement(info.name, info.description, info.img, uniqueId);
        document.querySelector(".nwcompat-achievement-area").appendChild(el);

        setTimeout(() => {
            document.getElementById(uniqueId)?.remove();
        }, 5000);
    },
    clearAchievement(id, successCallback, errorCallback) {
        delete nwcompat.savedData.achievements[id];
        nwcompat.saveData();
        if (successCallback) successCallback();
    },
    getStatInt(name) { return 0; },
    getStatFloat(name) { return 0.0; },
    setStat(name, value) { return true; },
    storeStats(successCallback, errorCallback) { if (successCallback) successCallback(); },
    getFriendCount(flags) { return 0; },
    FriendFlags: {
        None: 0,
        Blocked: 1,
        FriendshipRequested: 2,
        Immediate: 4,
        ClanMember: 8,
        OnGameServer: 16,
        HasPlayedWith: 32,
        FriendOfFriend: 64,
        RequestingFriendship: 128,
        RequestingInfo: 256,
        All: 511,
    },
    activateGameOverlay(option) { console.log(`[greenworks] Overlay requested: ${option}`); },
    isGameOverlayEnabled() { return false; },
    activateGameOverlayToWebPage(url) { window.open(url, "_blank"); },
    isSubscribedApp(appId) { return true; },
    getDLCCount() { return 0; },
    isDLCInstalled(dlcAppId) { return false; },
    installDLC(dlcAppId) {},
    uninstallDLC(dlcAppId) {},
    isCloudEnabled() { return false; },
    isCloudEnabledForUser() { return false; },
};
