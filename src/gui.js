const dat = require('dat.gui')
const EventEmitter = require('events')
const util = require("./util")
const $ = require('jquery')

class GUI extends EventEmitter {
    constructor(options = {}) {
        super()
        this.config = options.config
        this.emitter = options.emitter

        this.loadNavBar()
        this.loadLayerSelect()
        this.loadKeyboardShortcuts()
    }

    loadKeyboardShortcuts() {
        let shortcuts = {
            "alt-o": () => $('#nav-open-file').trigger('click'),
            "alt-e": () => $('#nav-btn-gcode').trigger('click'),
            "alt-c": () => $('#nav-reset-camera').trigger('click'),
            "alt-w": () => $('#nav-view-wireframe').trigger('click'),
            "alt-a": () => $('#nav-view-axes').trigger('click'),
            "alt-i": () => $('#nav-view-infill').trigger('click'),
            "alt-v": () => $('#nav-view-object').trigger('click'),
            "alt-p": () => $('#nav-view-perimeters').trigger('click'),
            "alt-s": () => $('#nav-btn-slice').trigger('click'),
        }


        $(document).on('keyup', function (e) {
            e = e.originalEvent
            let key = String.fromCharCode(e.which).toLowerCase()
            if (e.altKey && shortcuts['alt-' + key])
                shortcuts['alt-' + key]()
            if (e.ctrlKey && shortcuts['ctrl-' + key])
                shortcuts['ctrl-' + key]()
        })

    }

    loadNavBar() {

        $('.form-no-reload').on('submit', function (e) {
            e.preventDefault()
        })

        // init checkbox behavior
        $('.custom-control.custom-checkbox').on('click', function (e) {
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

        this.bindMenuText('settings-layer-height', (v) => {
            this.config.layerHeight = v
            this.emitter.emit('readyForSlice')
        })
        this.bindMenuText('settings-nozzle-temp', (v) => {
            this.config.nozzleTemp = v
            this.emitter.emit('readyForSlice')
        })
        this.bindMenuText('settings-bed-temp', (v) => {
            this.config.bedTemp = v
            this.emitter.emit('readyForSlice')
        })
        this.bindMenuText('settings-speed', (v) => {
            this.config.speed = v
            this.emitter.emit('readyForSlice')
        })
        this.bindMenuText('settings-filament-diameter', (v) => {
            this.config.filamentDiameter = v
            this.emitter.emit('readyForSlice')
        })
        this.bindMenuText('settings-infill-pct', (v) => {
            this.config.infillPercentage = v
            this.emitter.emit('readyForSlice')
        })
        this.bindMenuText('settings-top-bottom-layers', (v) => {
            this.config.numTopBottomLayers = v
            this.emitter.emit('readyForSlice')
        })
        this.bindMenuText('settings-num-perims', (v) => {
            this.config.numPerimeters = v
            this.emitter.emit('readyForSlice')
        })
    }

    bindMenuText(id, cb) {
        $('#' + id).on('change', function () {
            let val = $(this).val()
            if (cb) cb(val)
        })
    }

    bindMenuCheckbox(id, cb) {
        $('#' + id).on('change', function () {
            let val = $(this).prop('checked')
            if (cb) cb(val)
        })
    }

    bindMenuButton(id, cb) {
        $('#' + id).on('click', function () {
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
