const dat = require('dat.gui')
const EventEmitter = require('events')
const util = require("./util")

class GUI extends EventEmitter {
    constructor(config) {
        super()
        this.config = config
        this.gui = new dat.GUI({
            width: 300
        })

        this.loadMenu()
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
        debug.add(this.config, 'axesHelper').onChange(()=>{this.config.emit('debugChange')})
        debug.add(this.config, 'wireframe').onChange(()=>{this.config.emit('debugChange')})

        general.open()
        scale.open()
        rotation.open()
    }


}


module.exports = GUI
