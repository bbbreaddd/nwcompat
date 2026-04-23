// OneLoader compatibility
var global = globalThis;

nwcompat.nativeInfo = JSON.parse(nwcompat.getNativeInfo());

console.log("hello from nwcompat");
console.log(`webview: ${nwcompat.nativeInfo.webViewPackage} ${nwcompat.nativeInfo.webViewVersion}`);
console.log(`host: ${nwcompat.nativeInfo.hostVersion}, useragent: ${navigator.userAgent}`);

nwcompat.game = (() => {
    const data = nwcompat.fsReadFile("index.html");
    if (!data) throw "failed to read index.html";

    const dom = new DOMParser().parseFromString(window.atob(data), "text/html");
    const el = dom.querySelector("title");
    if (!el || !el.innerText) throw "title element not found";

    const text = el.innerText.toLowerCase();
    if (text.includes("omori")) return "omori";
    if (text.includes("in stars and time")) return "instarsandtime";
    return "unknown";
})();

console.log(`detected game: ${nwcompat.game}`);

nwcompat.patches = [];
nwcompat.runPatches = (stage, data) => {
    nwcompat.patches.forEach((patch) => {
        if (patch.stage !== stage) return;
        if (patch.target !== nwcompat.game && patch.target !== "common") return;
        if (stage === "scriptload" && !patch.scripts.includes(data.name.split(".")[0])) return;

        console.log(`Running ${stage} '${patch.target}/${patch.name}' patch`);
        try {
            patch.patch(data);
        } catch (e) {
            console.warn(e);
            console.warn(e.stack);
            debugger;
        }
    });
};

nwcompat.loadData = function () {
    const fs = require("fs");
    const pp = require("path");

    const base = pp.dirname(process.mainModule.filename);
    const savePath = pp.join(base, "save");
    const configPath = pp.join(savePath, "nwcompat.json");

    if (!fs.existsSync(savePath)) fs.mkdirSync(savePath);
    if (!fs.existsSync(configPath)) fs.writeFileSync(configPath, "{}");

    const file = JSON.parse(fs.readFileSync(configPath, "ascii") || "{}");

    // old format, convert to object
    if (Array.isArray(file.achievements)) {
        // TODO migration (but were there any saved achievements if this shit was broken??)
        file.achievements = {};
    }

    nwcompat.savedData = {};
    nwcompat.savedData.achievements = file.achievements || {};
    nwcompat.savedData.gamepad = file.gamepad || {};
    nwcompat.savedData.gamepad.buttons ||= {};
    nwcompat.savedData.gamepad.visible = file.gamepad?.visible ?? true;
    nwcompat.savedData.gamepad.touchEnabled = file.gamepad?.touchEnabled ?? true;
    nwcompat.savedData.fps = file.fps || { visible: false, mode: 0 };

    this.preCacheAchievements();
};

nwcompat.saveData = function () {
    const fs = require("fs");
    const pp = require("path");
    const base = pp.dirname(process.mainModule.filename);

    const configPath = pp.join(base, "save", "nwcompat.json");

    fs.writeFile(configPath, JSON.stringify(nwcompat.savedData), () => {
        // TODO alert user if save failed
    });
};

nwcompat.getAchievementIcon = async function (url) {
    if (!url || !url.startsWith("http")) return url;

    const fs = require("fs");
    const pp = require("path");
    const iconsPath = pp.join(nwcompat.nativeInfo.dataDirectory, "icons");

    try {
        if (!fs.existsSync(iconsPath)) fs.mkdirSync(iconsPath);

        const filename = `${nwcompat.game}_${url.split("/").pop()}`;
        const localPath = pp.join(iconsPath, filename);

        if (fs.existsSync(localPath)) {
            const data = fs.readFileSync(localPath);
            return `data:image/png;base64,${data.toString("base64")}`;
        }

        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64data = reader.result;
                const base64Content = base64data.split(",")[1];
                // Save directly using the fs implementation with base64 encoding hint
                fs.writeFileSync(localPath, base64Content, "base64");
                resolve(base64data);
            };
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.warn(`[nwcompat] Failed to cache icon: ${url}`, e);
        return url;
    }
};

nwcompat.preCacheAchievements = function () {
    try {
        const fs = require("fs");
        const pp = require("path");
        const iconsPath = pp.join(nwcompat.nativeInfo.dataDirectory, "icons");

        const achievementsModule = require("./node/achievements.js");
        const achievementsData = achievementsModule[nwcompat.game];

        if (achievementsData) {
            if (!fs.existsSync(iconsPath)) fs.mkdirSync(iconsPath);

            for (const id in achievementsData) {
                const url = achievementsData[id].img;
                if (!url || !url.startsWith("http")) continue;

                const filename = `${nwcompat.game}_${url.split("/").pop()}`;
                const localPath = pp.join(iconsPath, filename);

                // Only trigger getAchievementIcon if the file doesn't exist
                // This avoids loading the file into memory on every startup
                if (!fs.existsSync(localPath)) {
                    this.getAchievementIcon(url);
                }
            }
        }
    } catch (e) {
        console.warn("[nwcompat] Failed to load achievements for pre-caching", e);
    }
};

nwcompat.createAchievementElement = function (name, description, icon, id) {
    const elRoot = document.createElement("div");
    elRoot.className = "nwcompat-achievement";
    elRoot.id = id;

    const elIcon = document.createElement("div");
    elIcon.className = "nwcompat-achievement-icon";
    elIcon.style.backgroundImage = `url(${icon})`;
    nwcompat.getAchievementIcon(icon).then((localUrl) => {
        elIcon.style.backgroundImage = `url(${localUrl})`;
    });
    elRoot.appendChild(elIcon);

    const elText = document.createElement("div");
    elText.className = "nwcompat-achievement-text";
    elRoot.appendChild(elText);

    const elName = document.createElement("div");
    elName.className = "nwcompat-achievement-name";
    elName.textContent = name;
    elText.appendChild(elName);

    const elDesc = document.createElement("div");
    elDesc.className = "nwcompat-achievement-desc";
    elDesc.textContent = description;
    elText.appendChild(elDesc);

    return elRoot;
};

globalThis.require = (id) => {
    let module = __requireCache[id];

    if (module) {
        return module;
    } else {
        const fs = require("fs");
        const pp = require("path");

        try {
            const file = fs.readFileSync(pp.join(process.cwd(), id), "utf8");

            function evalInScope(js, contextAsScope) {
                return function () {
                    with (this) {
                        return eval(js);
                    }
                }.call(contextAsScope);
            }

            const context = { module: { exports: {} } };
            evalInScope(file, context);
            return context.module.exports;
        } catch (e) {
            console.error(`[nwcompat:require] module '${id}' not found`);
        }
    }
};

globalThis.process = {
    cwd: () => nwcompat.nativeInfo.gameDirectory,
    mainModule: {
        filename: nwcompat.nativeInfo.gameDirectory + "/index.html", // too early for path.join
    },
    env: {
        LOCALAPPDATA: nwcompat.nativeInfo.dataDirectory,
    },
    versions: { nw: "0.46.0" },
    platform: "win32",
    browser: true,
};

// Add test achievement button
if (nwcompat.nativeInfo.isDebug) {
    window.addEventListener("load", () => {
        const btn = document.createElement("button");
        const updateBtnText = () => {
            const unlocked = nwcompat.savedData?.achievements?.["TEST_ACHIEVEMENT"];
            btn.textContent = unlocked ? "Lock Test Achievement" : "Unlock Test Achievement";
        };
        
        btn.style.position = "absolute";
        btn.style.top = "10px";
        btn.style.right = "10px";
        btn.style.zIndex = "999999";
        btn.style.padding = "10px";
        btn.style.backgroundColor = "rgba(0,0,0,0.7)";
        btn.style.color = "white";
        btn.style.border = "1px solid white";
        btn.style.borderRadius = "5px";
        updateBtnText();
        
        btn.addEventListener("click", () => {
            if (nwcompat.savedData?.achievements?.["TEST_ACHIEVEMENT"]) {
                delete nwcompat.savedData.achievements["TEST_ACHIEVEMENT"];
                nwcompat.saveData();
                console.log("Test achievement locked successfully.");
                updateBtnText();
            } else {
                const greenworks = require("./greenworks");
                if (greenworks && greenworks.activateAchievement) {
                    greenworks.activateAchievement("TEST_ACHIEVEMENT",
                        () => {
                            console.log("Test achievement unlocked successfully.");
                            updateBtnText();
                        },
                        () => console.error("Failed to unlock test achievement.")
                    );
                }
            }
        });
        document.body.appendChild(btn);

        nwcompat.debugSpeed = false;
        const speedBtn = document.createElement("button");
        speedBtn.textContent = "Speed: Normal";
        speedBtn.style.position = "absolute";
        speedBtn.style.top = "50px";
        speedBtn.style.right = "10px";
        speedBtn.style.zIndex = "999999";
        speedBtn.style.padding = "10px";
        speedBtn.style.backgroundColor = "rgba(0,0,0,0.7)";
        speedBtn.style.color = "white";
        speedBtn.style.border = "1px solid white";
        speedBtn.style.borderRadius = "5px";
        speedBtn.addEventListener("click", () => {
            nwcompat.debugSpeed = !nwcompat.debugSpeed;
            speedBtn.textContent = nwcompat.debugSpeed ? "Speed: FAST" : "Speed: Normal";
            speedBtn.style.color = nwcompat.debugSpeed ? "yellow" : "white";
        });
        document.body.appendChild(speedBtn);
    });
}
