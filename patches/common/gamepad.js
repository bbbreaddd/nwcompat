nwcompat.patches.push({
    stage: "onload",
    target: "common",
    name: "gamepad",
    patch: () => {
        const { layouts, VirtualGamepad, Draggable, Pad, Button } = require("virtual-gamepad");
        const targetLayout = layouts.xbox;

        // Use a high index initially to avoid clashing with physical controller at index 0
        new VirtualGamepad(4, targetLayout.id);

        const oGetGamepads = navigator.getGamepads.bind(navigator);
        navigator.getGamepads = function () {
            const gamepads = oGetGamepads();
            // Ensure we have a proper array to work with
            const result = gamepads ? Array.from(gamepads) : [null, null, null, null];
            
            if (VirtualGamepad.instance.interacted) {
                // Check if virtual gamepad is already in the list
                let existingIndex = result.indexOf(VirtualGamepad.instance);
                
                if (existingIndex === -1) {
                    // Find the FIRST NULL slot to insert the virtual gamepad
                    // This ensures it doesn't overwrite a physical controller at index 0
                    let inserted = false;
                    for (let i = 0; i < result.length; i++) {
                        if (result[i] === null) {
                            result[i] = VirtualGamepad.instance;
                            VirtualGamepad.instance.index = i; // Sync internal index with slot
                            inserted = true;
                            break;
                        }
                    }
                    if (!inserted) {
                        VirtualGamepad.instance.index = result.length;
                        result.push(VirtualGamepad.instance);
                    }
                } else {
                    // Ensure the internal index property stays in sync with its position
                    VirtualGamepad.instance.index = existingIndex;
                }
            }
            return result;
        };

        const gamepadRoot = document.querySelector(".nwcompat-gamepad");
        const initialButtonSize = nwcompat.savedData.gamepad.buttonSize || 56;
        gamepadRoot.style.setProperty("--nwcompat-gamepad-button-size", `${initialButtonSize}px`);

        if (!nwcompat.savedData.gamepad.visible) {
            gamepadRoot.classList.add("hidden");
        }

        const gamepadEditor = document.createElement("div");
        gamepadEditor.className = "editor";
        gamepadRoot.appendChild(gamepadEditor);

        const toggleBtn = document.createElement("button");
        toggleBtn.className = "nwcompat-gamepad-toggle";
        toggleBtn.tabIndex = -1;
        toggleBtn.innerHTML = `
            <svg viewBox="0 0 24 24">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
            </svg>
        `;
        
        // Use pointerdown to ensure it triggers before the game engine can intercept it
        toggleBtn.addEventListener("pointerdown", (e) => {
            e.stopPropagation(); // Stop the game engine from seeing this touch
            const isHidden = gamepadRoot.classList.toggle("hidden");
            nwcompat.savedData.gamepad.visible = !isHidden;
            nwcompat.saveData();
        });
        gamepadRoot.appendChild(toggleBtn);

        const sizeLabel = document.createElement("div");
        sizeLabel.textContent = "Button Size";
        sizeLabel.style.color = "white";
        sizeLabel.style.fontSize = "14px";
        gamepadEditor.appendChild(sizeLabel);

        const sizeSlider = document.createElement("input");
        sizeSlider.type = "range";
        sizeSlider.min = "32";
        sizeSlider.max = "64";
        sizeSlider.value = initialButtonSize;
        sizeSlider.addEventListener("input", (e) => {
            const size = e.target.value;
            gamepadRoot.style.setProperty("--nwcompat-gamepad-button-size", `${size}px`);
        });
        gamepadEditor.appendChild(sizeSlider);

        const saveButton = document.createElement("button");
        saveButton.textContent = "Save";
        saveButton.addEventListener("click", () => {
            Draggable.inEditMode = false;
            gamepadRoot.classList.remove("edit");

            nwcompat.savedData.gamepad.buttonSize = parseInt(sizeSlider.value, 10);

            for (const draggable of Draggable.draggables) {
                nwcompat.savedData.gamepad.buttons[draggable.el.id] = {
                    inset: { ...draggable.options.inset },
                };
            }
            nwcompat.saveData();
        });
        gamepadEditor.appendChild(saveButton);

        const resetButton = document.createElement("button");
        resetButton.textContent = "Reset Controls";
        resetButton.style.marginTop = "8px";

        // Custom Modal UI
        const modalOverlay = document.createElement("div");
        modalOverlay.className = "nwcompat-modal-overlay";
        document.body.appendChild(modalOverlay);

        const modal = document.createElement("div");
        modal.className = "nwcompat-modal";
        modalOverlay.appendChild(modal);

        const modalTitle = document.createElement("div");
        modalTitle.className = "nwcompat-modal-title";
        modalTitle.textContent = "Reset Controls";
        modal.appendChild(modalTitle);

        const modalText = document.createElement("div");
        modalText.className = "nwcompat-modal-text";
        modalText.textContent = "Are you sure you want to reset all controls to their default positions and size?";
        modal.appendChild(modalText);

        const modalButtons = document.createElement("div");
        modalButtons.className = "nwcompat-modal-buttons";
        modal.appendChild(modalButtons);

        const cancelBtn = document.createElement("button");
        cancelBtn.className = "nwcompat-modal-btn-cancel";
        cancelBtn.textContent = "Cancel";
        modalButtons.appendChild(cancelBtn);

        const confirmBtn = document.createElement("button");
        confirmBtn.className = "nwcompat-modal-btn-confirm";
        confirmBtn.textContent = "Reset";
        modalButtons.appendChild(confirmBtn);

        const showModal = () => modalOverlay.classList.add("active");
        const hideModal = () => modalOverlay.classList.remove("active");

        cancelBtn.addEventListener("click", hideModal);
        modalOverlay.addEventListener("click", (e) => {
            if (e.target === modalOverlay) hideModal();
        });

        resetButton.addEventListener("click", showModal);

        confirmBtn.addEventListener("click", () => {
            hideModal();

            const defaults = {
                "pad-left": { x: 16, y: 64 },
                "pad-right": { x: 16, y: 64 },
                "trigger-left": { x: 24, y: 8 },
                "trigger-right": { x: 24, y: 8 },
            };

            nwcompat.savedData.gamepad.buttonSize = 56;
            nwcompat.savedData.gamepad.buttons = {};
            nwcompat.saveData();

            sizeSlider.value = 56;
            gamepadRoot.style.setProperty("--nwcompat-gamepad-button-size", "56px");

            const { Draggable } = require("virtual-gamepad");
            for (const draggable of Draggable.draggables) {
                const id = draggable.el.id;
                if (defaults[id]) {
                    draggable.options.inset = { ...defaults[id] };
                    draggable.updateStyle();
                }
            }
        });

        gamepadEditor.appendChild(resetButton);

        Input._editControls = function () {
            Draggable.inEditMode = true;
            gamepadRoot.classList.add("edit");
        };

        [
            "_onMouseDown",
            "_onMouseMove",
            "_onMouseUp",
            "_onWheel",
            "_onTouchStart",
            "_onTouchMove",
            "_onTouchEnd",
            "_onTouchCancel",
            "_onPointerDown",
        ].forEach((functionName) => {
            const oFunction = TouchInput[functionName];
            TouchInput[functionName] = function () {
                if (this._touchInputEnabled && !Draggable.inEditMode) oFunction.call(this, ...arguments);
            };
        });

        TouchInput._touchInputEnabled = nwcompat.savedData.gamepad.touchEnabled;

        TouchInput._toggleTouchInput = function () {
            this._touchInputEnabled = !this._touchInputEnabled;
            nwcompat.savedData.gamepad.touchEnabled = this._touchInputEnabled;
            nwcompat.saveData();
        };

        const makeWrapper = (id) => {
            const wrapper = document.createElement("div");
            wrapper.id = id;
            wrapper.className = "pad-wrap";

            gamepadRoot.appendChild(wrapper);
            return wrapper;
        };

        const makePad = (id, anchor, buttonOptions) => {
            const savedControlData = nwcompat.savedData.gamepad.buttons[id];
            const inset = savedControlData ? savedControlData.inset : { x: 16, y: 64 };

            const wrapper = makeWrapper(id);
            const draggable = new Draggable(wrapper, { anchor, inset });
            const pad = new Pad(wrapper, {
                buttons: buttonOptions,
                style: "round",
            });

            return [draggable, pad];
        };

        const makeTrigger = (id, anchor, label, index) => {
            const savedControlData = nwcompat.savedData.gamepad.buttons[id];
            const inset = savedControlData ? savedControlData.inset : { x: 24, y: 8 };

            const wrapper = makeWrapper(id);
            const draggable = new Draggable(wrapper, { anchor, inset });
            const button = new Button(wrapper, {
                label,
                index,
                style: "square",
            });

            return [draggable, button];
        };

        const dpadButtons = {
            up: { index: 12, label: "" },
            down: { index: 13, label: "" },
            left: { index: 14, label: "" },
            right: { index: 15, label: "" },
        };

        makePad("pad-left", { x: "left", y: "bottom" }, dpadButtons);
        makePad("pad-right", { x: "right", y: "bottom" }, targetLayout.buttons);

        makeTrigger("trigger-left", { x: "left", y: "top" }, "LB", 4);
        makeTrigger("trigger-right", { x: "right", y: "top" }, "RB", 5);
    },
});
