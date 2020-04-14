export interface ZanarkandFFXIVOptions {
    /** Sets the IPC version to Global/CN/KR. */
    region?: string;
    /** Sets the port for the IPC connection between this application and Node.js. */
    port?: number;
    /** Specifies a network device by IP, to capture traffic on. */
    networkDevice?: string;
    /** Enables the developer mode, enabling raw data output. */
    isDev?: boolean;
}
