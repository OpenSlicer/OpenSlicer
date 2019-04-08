const EventEmitter = require('events')
const util = require("./util")


class Config extends EventEmitter {
    constructor() {
        super()


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
        this.epsilon = 1e-10 // in mm
    }
}

module.exports = Config