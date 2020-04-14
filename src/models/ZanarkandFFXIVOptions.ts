export interface ZanarkandFFXIVOptions {
    /** Sets the IPC version to Global/CN/KR. Default: Global */
    region?: string

    /** Sets the port for the IPC connection between this application and Node.js. Default: 13346 */
    port?: number

    /** Specifies a network device by IP, to capture traffic on. Default: "" */
    networkDevice?: string

    /** Enables the developer mode, enabling raw data output. Default: false */
    isDev?: boolean

    /** Sets the logger for the class. Default: () => {} */
    logger?: (line: string) => void

    /** Sets the executable path. Default: ZanarkandWrapper/ZanarkandWrapperJSON.exe */
    exePath?: string
}