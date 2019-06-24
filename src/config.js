const util = require("./util")


class Config {
    constructor(options = {}) {
        this.emitter = options.emitter

        this.fileName = "OpenSlicer"


        this.loadUrl = util.getQueryParam('loadUrl') || ""

        // print settings
        this.currentLayerNumber = 0
        this.layerHeight = 0.2
        this.nozzleDiameter = 0.4
        this.filamentDiameter = 1.75
        this.extruderTemp = 240
        this.bedTemp = 80
        this.infillAngle = 45 // TODO implement this

        // speeds
        this.layerChangeSpeed = 12000
        this.solidSpeed = 1800

        // debugging/view options
        this.axesHelper = true
        this.wireframe = false
        this.viewObject = true
        this.viewPerimeters = true
        this.viewSolid = true
        this.viewInfill = true

        // transformations
        this.rotation = {x: 0, y: 0, z: 0}
        this.scale = {x: 1, y: 1, z: 1}
        this.translation = {x: 0, z: 0}

        // misc

        // precision all STL objects will be rounded to. In decimal places of mm
        this.precisionDecimals = 10
        this.precision = Number('1e-' + this.precisionDecimals)
        this.epsilon = this.precision / 100

        // settings in the GUI settings panel
        this.infillPercentage = 10 // default 10
        this.numPerimeters = 3 // default 10
        this.numTopBottomLayers = 3 // default 10



        // internal use constants
        // we use clipperMultiplier because clipper-lib only works with ints
        this.clipperMultiplier = 100000

        // internal use variables
        this.numLayers = 0
    }
}

module.exports = Config