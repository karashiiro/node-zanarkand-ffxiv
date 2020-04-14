"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ZanarkandFFXIV = /** @class */ (function () {
    function ZanarkandFFXIV(options) {
        this.options = options;
        if (this.options) {
            if (this.options.isDev == null) {
                this.options.isDev = false;
            }
            if (this.options.networkDevice == null) {
                this.options.networkDevice = "";
            }
            if (this.options.port == null) {
                this.options.port = 13346;
            }
            if (this.options.region == null) {
                this.options.region = "Global";
            }
        }
    }
    return ZanarkandFFXIV;
}());
exports.ZanarkandFFXIV = ZanarkandFFXIV;
