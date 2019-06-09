const dat = require('dat.gui')
const EventEmitter = require('events')
const util = require("./util")
const $ = require('jquery')

class GUI extends EventEmitter {
    constructor(config) {
        super()
        this.config = config
        // this.gui = new dat.GUI({
        //     width: 300
        // })

        //this.loadMenu()
        this.loadBottomButtons()

        this.loadLayerSelect()
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
        rotation.add(this.config.rotation, 'x').onChange(() => {
            this.config.emit('matrixChange')
        })
        rotation.add(this.config.rotation, 'y').onChange(() => {
            this.config.emit('matrixChange')
        })
        rotation.add(this.config.rotation, 'z').onChange(() => {
            this.config.emit('matrixChange')
        })

        let scale = transformations.addFolder('Scale')
        scale.add(this.config.scale, 'x').onChange(() => {
            this.config.emit('matrixChange')
        })
        scale.add(this.config.scale, 'y').onChange(() => {
            this.config.emit('matrixChange')
        })
        scale.add(this.config.scale, 'z').onChange(() => {
            this.config.emit('matrixChange')
        })

        let translation = transformations.addFolder('Translation')
        translation.add(this.config.translation, 'x').onChange(() => {
            this.config.emit('matrixChange')
        })
        translation.add(this.config.translation, 'z').onChange(() => {
            this.config.emit('matrixChange')
        })

        let debug = this.gui.addFolder('Debugging Options')
        debug.add(this.config, 'axesHelper').onChange(() => {
            this.config.emit('debugChange')
        })
        debug.add(this.config, 'wireframe').onChange(() => {
            this.config.emit('debugChange')
        })

        general.open()
        scale.open()
        rotation.open()
    }

    loadBottomButtons() {
        $('#nav-open-file').on('click', function () {
            document.getElementById('fileinput').click()
        })

        $('#nav-slice').on('click', function () {
        })

        this.bindMenuButton('nav-reset-camera', () => this.config.emit('resetCamera'))
        this.bindMenuText('transform-rot-x', (v) => {
            this.config.rotation.x = v
            this.config.emit('matrixChange')
        })
        this.bindMenuText('transform-rot-y', (v) => {
            this.config.rotation.y = v
            this.config.emit('matrixChange')
        })
        this.bindMenuText('transform-rot-z', (v) => {
            this.config.rotation.z = v
            this.config.emit('matrixChange')
        })
        this.bindMenuText('transform-transl-x', (v) => {
            this.config.translation.x = v
            this.config.emit('matrixChange')
        })
        this.bindMenuText('transform-transl-y', (v) => {
            this.config.translation.y = v
            this.config.emit('matrixChange')
        })
        this.bindMenuText('transform-transl-z', (v) => {
            this.config.translation.z = v
            this.config.emit('matrixChange')
        })
        this.bindMenuText('transform-scale-x', (v) => {
            this.config.scale.x = v
            this.config.emit('matrixChange')
        })
        this.bindMenuText('transform-scale-y', (v) => {
            this.config.scale.y = v
            this.config.emit('matrixChange')
        })
        this.bindMenuText('transform-scale-z', (v) => {
            this.config.scale.z = v
            this.config.emit('matrixChange')
        })
    }

    bindMenuText(id, cb) {
        $('#' + id).on('change', function () {
            let val = $(this).val()
            console.log('menuText:', id, "val:", val)
            if (cb) cb(val)
        })
    }

    bindMenuButton(id, cb) {
        $('#' + id).on('click', function () {
            console.log('menuButton:', id, "clicked")
            if (cb) cb()
        })
    }


    loadLayerSelect() {
        $(window).on('resize', () => {
            let lsc = $('#layer-select-container')
            lsc.width(($(window).height() - 60*3))

        })
    }
}


module.exports = GUI
