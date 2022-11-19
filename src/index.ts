import * as path from 'path';
import * as fs from 'fs/promises';
import * as fss from 'fs';

import { Config } from './types';

import isValidFilename from 'valid-filename';

class Cashola {

    private ignoreCashola = process.env.IGNORE_CASHOLA === 'true';
    private storageDir = '.cashola';
    private keyToFileMap: Record<string, string> = {};

    private async save(key: string, obj: object) {
        const str = JSON.stringify(obj);
        try {
            await fs.writeFile(this.keyToFileMap[key], str);
        } catch (err) {
            if (err.code === 'ENOENT') {
                await fs.mkdir(this.storageDir, { recursive: true });
                return fs.writeFile(this.keyToFileMap[key], str);
            }
        }
    }

    private saveSync(key: string, obj: object) {
        const str = JSON.stringify(obj);
        try {
            fss.writeFileSync(this.keyToFileMap[key], str);
        } catch (err) {
            if (err.code === 'ENOENT') {
                fss.mkdirSync(this.storageDir, { recursive: true });
                fss.writeFileSync(this.keyToFileMap[key], str);
            }
        }
    }

    private async load(key: string) {
        const str = await fs.readFile(this.keyToFileMap[key], 'utf-8');
        return JSON.parse(str);
    }

    private loadSync(key: string) {
        const str = fss.readFileSync(this.keyToFileMap[key], 'utf-8');
        return JSON.parse(str);
    }

    private async safeLoad(key: string, obj: object) {
        const tmpObj = await this.load(key);
        this.checkSameType(obj, tmpObj, key);
        return tmpObj;
    }

    private safeLoadSync(key: string, obj: object) {
        const tmpObj = this.loadSync(key);
        this.checkSameType(obj, tmpObj, key);
        return tmpObj;
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

    private createFilePath(key: string) {
        return path.join(this.storageDir, `${key}.json`);
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
            throw new Error(`Invalid key: '${key}'. Must create a valid filename.`);
        }

        this.keyToFileMap[key] = this.createFilePath(key);

        // User has decided to disable package
        if (this.ignoreCashola) {
            return false;
        }

        return true;
    }

    private checkSameType(a: object, b: object, key: string) {
        if (
            !(Array.isArray(a) && Array.isArray(b))
            && !(!Array.isArray(a) && !Array.isArray(b))
        ) {
            const type = Array.isArray(b) ? 'array' : 'object';
            throw new Error(`Key '${key}' already holding an ${type
                }. Either clear storage or continue to use an ${type}.`);
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

        try {
            obj = await this.safeLoad(key, obj);
        } catch (err) {
            if (err.code === 'ENOENT') {
                await this.save(key, obj);
            }
        }

        return new Proxy<T | {}>(obj, this.getHandler(key));
    }

    rememberSync<T=Record<string, any>>(key: string): T;
    rememberSync<T extends object>(key: string, obj: T): T;
    rememberSync<T extends object>(key: string, obj: T | {} = {}) {
        if (!this.checkInput(key, obj)) {
            return obj;
        }

        try {
            obj = this.safeLoadSync(key, obj);
        } catch (err) {
            if (err.code === 'ENOENT') {
                this.saveSync(key, obj);
            }
        }

        return new Proxy<T | {}>(obj, this.getHandlerSync(key));
    }

    async rememberArray<T=Record<string, any>>(key: string): Promise<T>;
    async rememberArray<T extends Array<T>>(key: string, obj: T): Promise<T>;
    async rememberArray<T extends Array<T>>(key: string, obj: T | [] = []) {
        if (!this.checkInput(key, obj)) {
            return obj;
        }

        try {
            obj = await this.safeLoad(key, obj);
        } catch (err) {
            if (err.code === 'ENOENT') {
                await this.save(key, obj);
            }
        }

        return new Proxy<T | []>(obj, this.getHandler(key));
    }

    rememberArraySync<T=any[]>(key: string): T;
    rememberArraySync<T extends Array<any>>(key: string, obj: T): T;
    rememberArraySync<T extends Array<any>>(key: string, obj: T | [] = []) {
        if (!this.checkInput(key, obj)) {
            return obj;
        }

        try {
            obj = this.safeLoadSync(key, obj);
        } catch (err) {
            if (err.code === 'ENOENT') {
                this.saveSync(key, obj);
            }
        }

        return new Proxy<T | []>(obj, this.getHandlerSync(key));
    }

    clearSync(key: string) {
        const p = this.createFilePath(key);
        fss.rmSync(p);
    }

    clear(key: string) {
        const p = this.createFilePath(key);
        return fs.rm(p);
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
export const rememberArraySync = cashola.rememberArraySync.bind(cashola);
export const rememberArray = cashola.rememberArray.bind(cashola);
export const configure = cashola.configure.bind(cashola);
export const clearSync = cashola.clearSync.bind(cashola);
export const clear = cashola.clear.bind(cashola);
export const clearAllSync = cashola.clearAllSync.bind(cashola);
export const clearAll = cashola.clearAll.bind(cashola);
export const list = cashola.list.bind(cashola);
