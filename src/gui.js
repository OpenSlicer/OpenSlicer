const dat = require('dat.gui')
const EventEmitter = require('events')
const util = require("./util")

class GUI extends EventEmitter {
    constructor(options) {
        super()
        this.options = options
        this.initOptions()

        this.gui = new dat.GUI({
            width: 300
        })

        this.loadMenu()
    }

    initOptions() {
        this.options.loadUrl = util.getQueryParam('loadUrl') || ""
        this.options.currentLayerNumber = 0
        this.options.layerHeight = 0.2
        this.options.nozzleSize = 0.4
        this.options.contours = true
        this.options.extrusionLines = true
        this.options.axesHelper = false
        this.options.wireframe = false
        this.options.normals = false
        this.options.points = false

        this.options.rotation = {x: 0, y: 0, z: 0}
        this.options.scale = {x: 1, y: 1, z: 1}

        this.epsilon = 1e-10 // in mm
    }

    loadMenu() {
        let general = this.gui.addFolder('General')
        general.add({
            loadFile: () => {
                document.getElementById('fileinput').click()
            }
        }, 'loadFile').name('Load file')
        general.add(this.options, 'loadUrl').name("Url")
        general.add({
            loadUrl: util.loadUrl,
        }, 'loadUrl').name('Load url')
        general.add(this.options, 'currentLayerNumber', 0, 10000, 1).name('Current Layer')
        general.add(this.options, 'layerHeight', 0.06, 0.3, 0.01).onChange(() => {
            controllers.currentLayerNumber.setValue(0)
        }).name('Layer Height')

        general.add(this.options, 'nozzleSize', 0, 2, 0.1).name('Nozzle diameter')

        let transformations = this.gui.addFolder('Transformations')
        let rotation = transformations.addFolder('Rotation')
        rotation.add(this.options.rotation, 'x')
        rotation.add(this.options.rotation, 'y')
        rotation.add(this.options.rotation, 'z')

        let scale = transformations.addFolder('Scale')
        scale.add(this.options.scale, 'x')
        scale.add(this.options.scale, 'y')
        scale.add(this.options.scale, 'z')

        let debug = this.gui.addFolder('Debugging Options')
        debug.add(this.options, 'contours')
        debug.add(this.options, 'extrusionLines')
        debug.add(this.options, 'points')

        debug.add(this.options, 'axesHelper')
        debug.add(this.options, 'wireframe')
        debug.add(this.options, 'normals')

        general.open()
        scale.open()
        rotation.open()
    }


}


module.exports = GUI
