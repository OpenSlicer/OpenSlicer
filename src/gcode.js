// See the following link for documentation on gcode
// http://marlinfw.org/docs/gcode/M900.html


const util = require("./util.js")


class Gcode {

    constructor(options = {}) {
        this.config = options.config

        this.gcode = ''
    }

    /**
     * Options:
     * extruderTemp: in C
     * bedTemp: in C (0 to disable)
     */
    header(o = {}) {
        this.gcode += `
; Sliced by OpenSlicer v0.9
; This is an experimental GCODE file, 
; should NOT be run on a 3D printer and may break anything,
; you are hereby warned
;
M73 P0 R42 ; set print progress
M73 Q0 S43
M201 X1000 Y1000 Z1000 E5000 ; sets maximum accelerations, mm/sec^2
M203 X200 Y200 Z12 E120 ; sets maximum feedrates, mm/sec
M204 P1250 R1250 T1250 ; sets acceleration (P, T) and retract acceleration (R), mm/sec^2
M205 X8.00 Y8.00 Z0.40 E1.50 ; sets the jerk limits, mm/sec
M205 S0 T0 ; sets the minimum extruding and travel feed rate, mm/sec
M107
; M115 U3.7.1 ; tell printer latest fw version
M83  ; extruder relative mode
M104 S${this.config.extruderTemp} ; set extruder temp
M140 S${this.config.bedTemp} ; set bed temp
M190 S${this.config.bedTemp} ; wait for bed temp
M109 S${this.config.extruderTemp} ; wait for extruder temp
G28 W ; home all without mesh bed level
G80 ; mesh bed leveling
G1 Y-3.0 F1000.0 ; go outside print area
G92 E0.0
G1 X60.0 E9.0  F1000.0 ; intro line
M73 Q0 S42
M73 P0 R42
G1 X100.0 E12.5  F1000.0 ; intro line
G92 E0.0
M221 S95
M900 K45; Filament gcode
G21 ; set units to millimeters
G90 ; use absolute coordinates
M83 ; use relative distances for extrusion
`
        return this
    }

    /**
     * Options:
     * extruderTemp: in C
     * bedTemp: in C (0 to disable)
     */
    footer(o = {}) {
        this.gcode += `
G4 ; wait
M221 S100
M104 S0 ; turn off temperature
M140 S0 ; turn off heatbed
M107 ; turn off fan
; TODO  Move print head up
G1 X0 Y200; home X axis
M84 ; disable motors
`
        return this
    }


    /**
     * Options:
     * z: z in mm of the current layer
     */
    layerChange(o = {}) {
        this.gcode += `

; BEFORE_LAYER_CHANGE
; z=${o.z}
G92 E0.0 ; reset extruder position to 0
; TODO: Add retraction
G1 Z${o.z} F12000.000
;AFTER_LAYER_CHANGE
; z=${o.z}
`
        return this
    }

    /**
     * Options:
     * x,y : coordinates to move to
     */
    travelTo(o = {}) {
        let x = o.x.toFixed(3)
        let y = o.y.toFixed(3)
        this.gcode += `
G1 F1800
G1 X${x} Y${y}
`
        return this
    }

    /**
     * Options:
     * x,y : coordinates to move to
     * e: amount in mm of filament to extrude
     */
    extrudeTo(o = {}) {
        o.x = o.x.toFixed(3)
        o.y = o.y.toFixed(3)
        let dst = Math.sqrt(o.x * o.x + o.y * o.y)
        let lineVol = this.config.nozzleDiameter * this.config.layerHeight * dst
        let filArea = Math.PI * Math.pow(this.config.filamentDiameter / 2, 2)
        let e = (lineVol / filArea).toFixed(3)

        this.gcode += `
G1 F${o.s}
G1 X${o.x} Y${o.y} E${e}
`
        return this
    }

    /**
     * Useful for retraction and filament changes
     * Options:
     * e: amount in negative mm of filament to extrude (negative to retract)
     */
    extrude(o = {}) {
        this.gcode += `
G1 E${e} F${this.config.layerChangeSpeed}
`
        return this
    }

    download(name) {
        util.download(name, this.gcode)
    }

}
module.exports = Gcode