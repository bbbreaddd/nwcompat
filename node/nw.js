class NwWindow extends EventTarget {
    constructor() {
        super();
        this.isFullscreen = true;
    }

    get x() {
        return window.screenX;
    }

    get y() {
        return window.screenY;
    }

    enterFullscreen() { }
    leaveFullscreen() { }

    showDevTools() { }
    closeDevTools() { }
    isDevToolsOpen() {
        return false;
    }

    moveTo() { }
    focus() { }
    close() {
        window.close();
    }

    on(eventName, callback) {
        this.addEventListener(eventName, callback);
    }
}

const nwWindow = new NwWindow();

module.exports = {
    App: {
        argv: [`--${nwcompat.nativeInfo.key}`],
        quit: () => window.close(),
    },
    Screen: {
        Init: () => { },
        on: () => { },
    },
    Window: {
        get: () => nwWindow,
    },
    Shell: {
        openExternal: (url) => { },
    },
    Menu: class {
        constructor() {
            this.createMacBuiltin = () => { };
        }
    },
};
