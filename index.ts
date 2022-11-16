import * as path from 'path';
import * as fs from 'fs/promises';
import * as fss from 'fs';

import { Config } from './types';

import isValidFilename from 'valid-filename';

class Cashola {

    private ignoreCashola = process.env.IGNORE_CASHOLA === 'true';
    private storageDir = '.cashola';
    private keyToFileMap: Record<string, string> = {};

    private save(key: string, obj: object) {
        const str = JSON.stringify(obj);
        return fs.writeFile(this.keyToFileMap[key], str);
    }

    private saveSync(key: string, obj: object) {
        const str = JSON.stringify(obj);
        fss.writeFileSync(this.keyToFileMap[key], str);
    }

    private async load(key: string) {
        const str = await fs.readFile(this.keyToFileMap[key], 'utf-8');
        return JSON.parse(str);
    }

    private loadSync(key: string) {
        const str = fss.readFileSync(this.keyToFileMap[key], 'utf-8');
        return JSON.parse(str);
    }

    private async exists(key: string) {
        try {
            await fs.stat(this.keyToFileMap[key]);
        } catch (err) {
            if (err.code === 'ENOENT') {
                return false;
            }
        }

        return true;
    }

    private existsSync(key: string) {
        return fss.existsSync(this.keyToFileMap[key]);
    }

    private createStorageDir() {
        return fs.mkdir(this.storageDir, { recursive: true });
    }

    private createStorageDirSync() {
        return fss.mkdirSync(this.storageDir, { recursive: true });
    }

    private getHandler<T extends object>(key: string) {
        const handler: ProxyHandler<T> = {
            set: (obj: T, prop, value: any) => {
                // Apply prop and value to obj
                if (!Reflect.set(obj, prop, value)) {
                    return false;
                }

                void this.save(key, obj);
                return true;
            },
            // setPrototypeOf() {}
            // defineProperty() {}

        };

        return handler;
    }

    private getHandlerSync<T extends object>(key: string) {
        const handler: ProxyHandler<T> = {
            set: (obj: T, prop, value: any) => {
                // Apply prop and value to obj
                if (!Reflect.set(obj, prop, value)) {
                    return false;
                }

                this.saveSync(key, obj);
                return true;
            },
            // setPrototypeOf() {}
            // defineProperty() {}

        };

        return handler;
    }

    private checkInput(key: string, obj: object) {
        if (!(typeof obj === 'object')) {
            throw new Error(`Typeof object is '${typeof obj}', but must be 'object'.`);
        }

        // User has called 'remember' twice on the same key
        if (key in this.keyToFileMap) {
            throw new Error(`'${key}' already being remembered.`);
        }

        if (!isValidFilename(key)) {
            throw new Error(`Invalid key: '${key}'. Must be a valid filename.`);
        }

        // User has decided to disable package
        if (this.ignoreCashola) {
            return false;
        }

        this.keyToFileMap[key] = path.join(this.storageDir, `${key}.json`);

        return true;
    }

    private checkSameType(a: object, b: object, key: string) {
        if (
            !(Array.isArray(a) && Array.isArray(b))
            && !(!Array.isArray(a) && !Array.isArray(b))
        ) {
            const type = Array.isArray(b) ? 'array' : 'object';
            throw new Error(`Key '${key}' already holding ${type
                }. Either clear storage or continue to use ${type}.`);
        }
    }

    //

    configure(config: Config) {
        if (config.storageDir) {
            this.storageDir = config.storageDir;
        }
        if (config.ignoreCasholaEnvVar) {
            this.ignoreCashola = process.env[config.ignoreCasholaEnvVar] === 'true';
        }
        if (config.ignoreCashola === true) {
            this.ignoreCashola = true;
        }
    }

    async remember<T=Record<string, any>>(key: string): Promise<T>;
    async remember<T extends object>(key: string, obj: T): Promise<T>;
    async remember<T extends object>(key: string, obj: T | {} = {}) {
        if (!this.checkInput(key, obj)) {
            return obj;
        }

        await this.createStorageDir();
        if (await this.exists(key)) {
            const tmpObj = await this.load(key);
            this.checkSameType(obj, tmpObj, key);
            obj = tmpObj;
        } else {
            await this.save(key, obj);
        }

        return new Proxy<T | {}>(obj, this.getHandler(key));
    }

    rememberSync<T=Record<string, any>>(key: string): T;
    rememberSync<T extends object>(key: string, obj: T): T;
    rememberSync<T extends object>(key: string, obj: T | {} = {}) {
        if (!this.checkInput(key, obj)) {
            return obj;
        }

        this.createStorageDirSync();
        if (this.existsSync(key)) {
            const tmpObj = this.loadSync(key);
            this.checkSameType(obj, tmpObj, key);
            obj = tmpObj;
        } else {
            this.saveSync(key, obj);
        }

        return new Proxy<T | {}>(obj, this.getHandlerSync(key));
    }

    clearSync(key: string) {
        if (!(key in this.keyToFileMap)) {
            throw new Error(`Cannot find '${key}' in storage.`);
        }

        fss.rmSync(this.keyToFileMap[key]);
    }

    clear(key: string) {
        if (!(key in this.keyToFileMap)) {
            throw new Error(`Cannot find '${key}' in storage.`);
        }

        return fs.rm(this.keyToFileMap[key]);
    }

    clearAllSync() {
        fss.rmSync(this.storageDir, { recursive: true, force: true });
    }

    clearAll() {
        return fs.rm(this.storageDir, { recursive: true, force: true });
    }

    list() {
        return Object.keys(this.keyToFileMap);
    }
}

const cashola = new Cashola();
export const rememberSync = cashola.rememberSync.bind(cashola);
export const remember = cashola.remember.bind(cashola);
export const configure = cashola.configure.bind(cashola);
export const clearSync = cashola.clearSync.bind(cashola);
export const clear = cashola.clear.bind(cashola);
export const clearAllSync = cashola.clearAllSync.bind(cashola);
export const clearAll = cashola.clearAll.bind(cashola);
export const list = cashola.list.bind(cashola);
