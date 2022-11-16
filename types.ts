export type Config = {
    /**
     * Directory to use as storage  
     * Default: .cashola/  
     */
    storageDir?: string;

    /**
     * Name of environment variable used to ignore cashola  
     * Default: IGNORE_CASHOLA  
     * To use, set to true `IGNORE_CASHOLA=true node index.js`  
     */
    ignoreCasholaEnvVar?: string;

    /**
     * Boolean whether or not to ignore cashola  
     * Default: false  
     */
    ignoreCashola?: boolean;
}