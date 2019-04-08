const dat = require('dat.gui')
const EventEmitter = require('events')
const util = require("./util")

class GUI extends EventEmitter {
    constructor(config) {
        super()
        this.config = config
        this.initOptions()

        this.gui = new dat.GUI({
            width: 300
        })

        this.loadMenu()
    }

    initOptions() {
        this.config.loadUrl = util.getQueryParam('loadUrl') || ""
        this.config.currentLayerNumber = 0
        this.config.layerHeight = 0.2
        this.config.nozzleSize = 0.4
        this.config.contours = true
        this.config.extrusionLines = true
        this.config.axesHelper = false
        this.config.wireframe = false
        this.config.normals = false
        this.config.points = false

        this.config.rotation = {x: 0, y: 0, z: 0}
        this.config.scale = {x: 1, y: 1, z: 1}

        this.epsilon = 1e-10 // in mm
    }

    loadMenu() {
        let general = this.gui.addFolder('General')
        general.add({
            loadFile: () => {
                document.getElementById('fileinput').click()
            }
        }, 'loadFile').name('Load file')
        general.add(this.config, 'loadUrl').name("Url")
        general.add({
            loadUrl: util.loadUrl,
        }, 'loadUrl').name('Load url')
        general.add(this.config, 'currentLayerNumber', 0, 10000, 1).name('Current Layer')
        general.add(this.config, 'layerHeight', 0.06, 0.3, 0.01).onChange(() => {
            controllers.currentLayerNumber.setValue(0)
        }).name('Layer Height')

        general.add(this.config, 'nozzleSize', 0, 2, 0.1).name('Nozzle diameter')

        let transformations = this.gui.addFolder('Transformations')
        let rotation = transformations.addFolder('Rotation')
        rotation.add(this.config.rotation, 'x').onChange(()=>{this.config.emit('matrixChange')})
        rotation.add(this.config.rotation, 'y').onChange(()=>{this.config.emit('matrixChange')})
        rotation.add(this.config.rotation, 'z').onChange(()=>{this.config.emit('matrixChange')})

        let scale = transformations.addFolder('Scale')
        scale.add(this.config.scale, 'x').onChange(()=>{this.config.emit('matrixChange')})
        scale.add(this.config.scale, 'y').onChange(()=>{this.config.emit('matrixChange')})
        scale.add(this.config.scale, 'z').onChange(()=>{this.config.emit('matrixChange')})

        let debug = this.gui.addFolder('Debugging Options')
        debug.add(this.config, 'contours')
        debug.add(this.config, 'extrusionLines')
        debug.add(this.config, 'points')

        debug.add(this.config, 'axesHelper')
        debug.add(this.config, 'wireframe')
        debug.add(this.config, 'normals')

        general.open()
        scale.open()
        rotation.open()
    }


}


module.exports = GUI
