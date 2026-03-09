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
