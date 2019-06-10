const util = require("./util")


class Config {
    constructor(options = {}) {
        this.emitter = options.emitter


        this.loadUrl = util.getQueryParam('loadUrl') || ""

        // print settings
        this.currentLayerNumber = 0
        this.layerHeight = 0.2
        this.nozzleSize = 0.4

        // debugging options
        this.axesHelper = true
        this.wireframe = false

        // transformations
        this.rotation = {x: 0, y: 0, z: 0}
        this.scale = {x: 1, y: 1, z: 1}
        this.translation = {x: 0, z: 0}

        // misc

        // precision all STL objects will be rounded to. In decimal places of mm
        this.precisionDecimals = 10
        this.precision = Number('1e-' + this.precisionDecimals)
        this.epsilon = this.precision / 100
    }
}

module.exports = Config