const dat = require('dat.gui')
const EventEmitter = require('events')
const util = require("./util")
const $ = require('jquery')

class GUI extends EventEmitter {
    constructor(options = {}) {
        super()
        this.config = options.config
        this.emitter = options.emitter

        this.loadBottomButtons()
        this.loadLayerSelect()
    }

    loadBottomButtons() {
        // init checkbox behavior
        $('.custom-control.custom-checkbox').on('click', function (e) {
            console.log('click test')
            if (e.target !== this)
                return

            let cbox = $(this).find('input[type="checkbox"]')
            cbox.prop('checked', !cbox.prop('checked')).change()

        })

        $('#nav-open-file').on('click', function () {
            document.getElementById('fileinput').click()
        })



        let emitter = this.emitter
        $('#nav-btn-slice').on('click', () => {
            emitter.emit('slice')
        })
        $('#nav-btn-gcode').on('click', () => {
            emitter.emit('generateGcode')
        })

        $('#layer-select').on('input', function () {
            let val = $(this).val()
            emitter.emit('currentLayerChange', val)
        })

        this.emitter.on('readyForSlice', () => {
            let lsc = $('#layer-select-container')
            lsc.hide()
            $('#nav-btn-gcode').parent().hide()
            $('#nav-btn-slice').parent().show(500)
        })

        this.emitter.on('sliceFinish', () => {
            let lsc = $('#layer-select-container')
            lsc.width(($(window).height() - 60 * 3))
            lsc.show(500)
            let ls = $('#layer-select')
            ls.attr('max', this.config.numLayers - 1).val(1).trigger('input')

            $('#nav-btn-gcode').parent().show()
            $('#nav-btn-slice').parent().hide()

            $('#nav-view-wireframe').prop('checked', true).change()

        })

        this.bindMenuButton('nav-reset-camera', () => this.emitter.emit('resetCamera'))
        this.bindMenuCheckbox('nav-view-wireframe', (v) => {
            this.config.wireframe = v
            this.emitter.emit('viewChange')
        })
        this.bindMenuCheckbox('nav-view-object', (v) => {
            this.config.viewObject = v
            this.emitter.emit('viewChange')
        })
        this.bindMenuCheckbox('nav-view-axes', (v) => {
            this.config.axesHelper = v
            this.emitter.emit('viewChange')
        })
        this.bindMenuCheckbox('nav-view-perimeters', (v) => {
            this.config.viewPerimeters = v
            this.emitter.emit('viewChange')
        })
        this.bindMenuCheckbox('nav-view-infill', (v) => {
            this.config.viewInfill = v
            this.emitter.emit('viewChange')
        })
        this.bindMenuCheckbox('nav-view-solid', (v) => {
            this.config.viewSolid = v
            this.emitter.emit('viewChange')
        })

        this.bindMenuText('transform-rot-x', (v) => {
            this.config.rotation.x = v
            this.emitter.emit('matrixChange')
        })
        this.bindMenuText('transform-rot-y', (v) => {
            this.config.rotation.y = v
            this.emitter.emit('matrixChange')
        })
        this.bindMenuText('transform-rot-z', (v) => {
            this.config.rotation.z = v
            this.emitter.emit('matrixChange')
        })
        this.bindMenuText('transform-transl-x', (v) => {
            this.config.translation.x = v
            this.emitter.emit('matrixChange')
        })
        this.bindMenuText('transform-transl-y', (v) => {
            this.config.translation.y = v
            this.emitter.emit('matrixChange')
        })
        this.bindMenuText('transform-transl-z', (v) => {
            this.config.translation.z = v
            this.emitter.emit('matrixChange')
        })
        this.bindMenuText('transform-scale-x', (v) => {
            this.config.scale.x = v
            this.emitter.emit('matrixChange')
        })
        this.bindMenuText('transform-scale-y', (v) => {
            this.config.scale.y = v
            this.emitter.emit('matrixChange')
        })
        this.bindMenuText('transform-scale-z', (v) => {
            this.config.scale.z = v
            this.emitter.emit('matrixChange')
        })
    }

    bindMenuText(id, cb) {
        $('#' + id).on('change', function () {
            let val = $(this).val()
            console.log('menuText:', id, "val:", val)
            if (cb) cb(val)
        })
    }

    bindMenuCheckbox(id, cb) {
        $('#' + id).on('change', function () {
            let val = $(this).prop('checked')
            console.log('menuCheckbox:', id, "val:", val)
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
            lsc.width(($(window).height() - 60 * 3))

        })
    }
}


module.exports = GUI
