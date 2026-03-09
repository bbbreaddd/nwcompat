nwcompat.patches.push({
    stage: "onload",
    target: "common",
    name: "misc",
    patch: () => {
        Utils.isMobileDevice = function () {
            return false;
        };

        const oBitmap = { drawText: Bitmap.prototype.drawText };
        // fix "The provided value 'undefined' is not a valid enum value of type CanvasTextAlign."
        Bitmap.prototype.drawText = function (text, x, y, maxWidth, lineHeight, align = "start") {
            oBitmap.drawText.call(this, text, x, y, maxWidth, lineHeight, align);
        };

        if (nwcompat.nativeInfo.isDebug) {
            let _scaledTime = performance.now();
            let _lastRealTime = performance.now();
            const _SceneManager_getTime = SceneManager._getTimeInMsWithoutMobileSafari;
            SceneManager._getTimeInMsWithoutMobileSafari = function () {
                let now = performance.now();
                let delta = now - _lastRealTime;
                _lastRealTime = now;
                _scaledTime += (nwcompat.debugSpeed ? delta * 4.0 : delta);
                return _scaledTime;
            };

            const _SceneManager_update = SceneManager.update;
            SceneManager.update = function () {
                _SceneManager_update.call(this);
                if (Graphics._video) {
                    Graphics._video.playbackRate = nwcompat.debugSpeed ? 4.0 : 1.0;
                }
            };
        }
    },
});
nwcompat.patches.push({
    stage: "presetup",
    target: "instarsandtime",
    name: "misc",
    patch: () => {
        // Fix YEP_CoreEngine enforcing screen ratios on mobile.
        const coreEngine = $plugins.find((p) => p.name === "YEP_CoreEngine");
        if (coreEngine && coreEngine.parameters) {
            coreEngine.parameters["Update Real Scale"] = "false";
        }
    },
});
