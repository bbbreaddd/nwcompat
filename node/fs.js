const decoder = new TextDecoder();
const encoder = new TextEncoder();

const fs = {
    readFile(path, callback) {
        if (!callback) return;

        new Promise((resolve, reject) => {
            try {
                resolve(fs.readFileSync(path));
            } catch (e) {
                reject(e);
            }
        })
            .then((data) => callback(null, data))
            .catch((e) => {
                // HACK: GTP_OmoriFixes Permanent_Manager.load throws it and it works in node because it is in another ~~thread~~/idk i forgor
                if (path.includes("CUTSCENE.json")) {
                    console.warn("[nwcompat:fs] Suppressed readFile error for CUTSCENE.json:", e);
                    callback();
                } else callback(e);
            });
    },

    readFileSync(path, options) {
        const data = nwcompat.fsReadFile(path);

        if (data == null) {
            throw `ENOENT: no such file or directory, open '${path}'`;
        }

        const buffer = Buffer.from(data, "base64");
        const encoding = typeof options === "string" ? options : options?.encoding;

        if (!encoding) return buffer;
        if (encoding === "utf8" || encoding === "utf-8" || encoding === "ascii") return decoder.decode(buffer);
        return buffer;
    },

    writeFile(path, data, callback) {
        try {
            fs.writeFileSync(path, data);
            if (callback) {
                Promise.resolve().then(() => callback(null));
            }
        } catch (e) {
            if (callback) {
                Promise.resolve().then(() => callback(e));
            } else {
                throw e;
            }
        }
    },

    writeFileSync(path, data, options) {
        if (typeof data === "number") data = String(data);

        let buffer;
        const encoding = typeof options === "string" ? options : options?.encoding;

        if (typeof data === "string") {
            if (encoding === "base64") {
                buffer = Buffer.from(data, "base64");
            } else {
                buffer = Buffer.from(encoder.encode(data));
            }
        } else {
            // It's a Buffer, Uint8Array, etc.
            buffer = Buffer.from(data);
        }

        nwcompat.fsWriteFile(path, buffer.toString("base64"));
    },

    readdir(path, callback) {
        if (!callback) return;

        Promise.resolve()
            .then(() => fs.readdirSync(path))
            .then((data) => callback(null, data))
            .catch((e) => callback(e));
    },

    readdirSync(path) {
        const result = nwcompat.fsReadDir(path);
        if (!result) return [];
        return result.split("\n").filter(Boolean).sort();
    },

    mkdir(path, callback) {
        if (!callback) return;

        Promise.resolve()
            .then(() => fs.mkdirSync(path))
            .then((data) => callback(null, data))
            .catch((e) => callback(e));
    },

    mkdirSync(path) {
        nwcompat.fsMkDir(path);
    },

    unlinkSync(path) {
        nwcompat.fsUnlink(path);
    },

    stat(path, callback) {
        if (!callback) return;

        new Promise((resolve, reject) => {
            try {
                resolve(fs.statSync(path));
            } catch (e) {
                reject(e);
            }
        })
            .then((data) => callback(null, data))
            .catch((e) => callback(e));
    },

    statSync(path) {
        const stat = nwcompat.fsStat(path);
        if (stat == -1) {
            throw `ENOENT: no such file or directory, stat '${path}'`;
        } else {
            return {
                isFile: () => stat == 1,
                isDirectory: () => stat == 2,
            };
        }
    },

    existsSync(path) {
        try {
            fs.statSync(path);
            return true;
        } catch (e) {
            return false;
        }
    },

    rename(oldPath, newPath, callback) {
        if (callback) {
            Promise.resolve()
                .then(() => fs.renameSync(oldPath, newPath))
                .then((data) => callback(null, data))
                .catch((e) => callback(e));
        }
    },

    renameSync(oldPath, newPath) {
        nwcompat.fsRename(oldPath, newPath);
    },

    // Stubs
    openSync() { },
    writeSync() { },
};

module.exports = fs;
