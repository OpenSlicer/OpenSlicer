const THREE = require('three')
const Gcode = require('./gcode')


class Slicer {

    constructor(options = {}) {
        this.config = options.config
        this.emitter = options.emitter


        this.emitter.on('slice', () => this.slice())
        this.emitter.on('generateGcode', () => this.generateGcode())
        this.emitter.on('sliceLayer', (l, n = true) => this.sliceLayer(l, n))
        //this.emitter.on('currentLayerChange', (layerNumber) => this.sliceLayer( true))
    }


    prepareGeometry(obj) {
        this.obj = obj
        this.perimeters = []
        this.solid = []

        let startTime = new Date().getTime()
        let geom = new THREE.Geometry().fromBufferGeometry(this.obj)
        console.log("Converting time:", new Date().getTime() - startTime, "ms")
        // Round all vertices to our finest resolution
        for (let i = 0; i < geom.vertices.length; i++) {
            geom.vertices[i].x = Number(geom.vertices[i].x).toFixed(this.config.precisionDecimals)
            geom.vertices[i].y = Number(geom.vertices[i].y).toFixed(this.config.precisionDecimals)
            geom.vertices[i].z = Number(geom.vertices[i].z).toFixed(this.config.precisionDecimals)
        }

        this.geom = geom

        if (!this.validate2manifold()) {
            console.log("Warning: Object is not a valid 2-manifold")
        }

        return geom
    }

    // see https://github.com/slic3r/Slic3r/blob/5d7711f31978afa5fac476e7afe80d9e8b61dcd2/xs/src/libslic3r/TriangleMesh.cpp
    // Returns true if the object is a valid 2-manifold, false otherwise
    validate2manifold() {
        if (!this.geom) throw new Error("No geometry prepared")

        // in order to have an orientable closed surface, we need an even Euler characteristic.

        // TODO this check is left for the end, as it will only display a warning to the user
        // the user will still be able to run the slicer normally, even with a non manifold. Behavior in this
        // case is undefined

        return true

    }

    slice() {
        let startTime = new Date().getTime()

        for (let i = 0; i < this.config.numLayers; i++) {
            this.sliceLayer(i, false)
        }
        console.log("Total slicing time:", new Date().getTime() - startTime, "ms")

        this.emitter.emit('sliceFinish')

    }

    sliceLayer(layer, notify = true) {
        this.layer = layer
        if (!this.geom) throw new Error("No geometry prepared")
        let h = this.layer * this.config.layerHeight + this.config.epsilon
        console.log(h)

        //this.geom.computeBoundingBox()
        //let maxY = this.geom.boundingBox.max.y
        //console.log("maxY", maxY, "layer", layer, "h=", h, "epsilon", this.config.epsilon)

        this.perimeters[this.layer] = []
        let currentLayerVertices = []

        let plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -h)

        let line = new THREE.Line3()
        let target = new THREE.Vector3()
        let res
        let intersectionVertices
        for (let face of this.geom.faces) {
            intersectionVertices = []

            // a - b
            line.start = this.geom.vertices[face.a]
            line.end = this.geom.vertices[face.b]
            res = plane.intersectLine(line, target)
            if (res !== undefined) {
                let seg = new THREE.Vector3()
                seg.copy(target)
                intersectionVertices.push(seg)
            }
            // b - c
            line.start = this.geom.vertices[face.b]
            line.end = this.geom.vertices[face.c]
            res = plane.intersectLine(line, target)
            if (res !== undefined) {
                let seg = new THREE.Vector3()
                seg.copy(target)
                intersectionVertices.push(seg)
            }
            // c - a
            line.start = this.geom.vertices[face.c]
            line.end = this.geom.vertices[face.a]
            res = plane.intersectLine(line, target)
            if (res !== undefined) {
                let v = new THREE.Vector3()
                v.copy(target)
                intersectionVertices.push(v)
            }
            if (intersectionVertices.length === 2) {
                this.perimeters[this.layer].push(new THREE.Line3(intersectionVertices[0], intersectionVertices[1]))
                currentLayerVertices.push(intersectionVertices[0])
                currentLayerVertices.push(intersectionVertices[1])
            }
        }

        //  sort vectors
        currentLayerVertices.sort((u, v) => {
            if (u.x !== v.x) return u.x - v.x
            if (u.y !== v.y) return u.y - v.y
            return u.z - v.z
        })
        // check if each point exists an even number of times
        for (let i = 0; i < currentLayerVertices.length - 1; i += 2) {
            if (!currentLayerVertices[i].equals(currentLayerVertices[i + 1])) {
                console.warn("Intersection is not a closed path", currentLayerVertices, i, i+1)
                break
            }
        }


        if (notify) this.emitter.emit('layerPerimetersFinished')
        //this.getLayerLinesFromPerimeters(notify)
    }

    getLayerLinesFromPerimeters(notify = true) {
        if (!this.geom) throw new Error("No geometry prepared")
        if (!this.perimeters[this.layer]) throw new Error("No perimeters prepared")

        this.solid[this.layer] = []

        let axis = this.layer % 2 === 0 ? 'x' : 'z'
        let otherAxis = this.layer % 2 === 0 ? 'z' : 'x'

        let floorN = (x, n) => Math.floor(x / n) * n
        let d = this.config.nozzleDiameter

        let min = floorN(this.geom.boundingBox.min[axis] - d * 2, d)
        let max = floorN(this.geom.boundingBox.max[axis] + d * 2, d)

        let vs
        let target = new THREE.Vector3()

        //console.log("min max", min, max)
        for (let pos = min; pos < max; pos += d) {
            //console.log("plane pos", pos, axis)
            let plane = new THREE.Plane(new THREE.Vector3(axis === 'x' ? -1 : 0, 0, axis === 'z' ? -1 : 0), pos)
            //plane.constant = pos

            vs = []
            for (let seg of this.perimeters[this.layer]) {
                let res = plane.intersectLine(seg, target)
                if (res !== undefined) {
                    let p = new THREE.Vector3()
                    p.copy(target)
                    vs.push(p)
                }
            }
            // end of each plane, we have to make segments out of this
            vs.sort((a, b) => a[otherAxis] - b[otherAxis])
            if (vs.length > 0) {
                //vs.forEach(p => this.emitter.emit('showPoint', p))
                if (vs.length % 2 !== 0) console.warn("odd number of intersections")
                else {
                    for (let i = 0; i < vs.length; i += 2) {
                        this.solid[this.layer].push(new THREE.Line3(vs[i], vs[i + 1]))
                    }
                }
                //console.log(vs)
            }
        }
        if (notify) this.emitter.emit('layerSolidFinished')
    }

    generateGcode() {
        let gcode = new Gcode({
            config: this.config
        })
        gcode.header()

        let offset = 30
        for (let i = 1; i < this.config.numLayers; i++) {
            let h = this.config.layerHeight * i + 0.2 // initial layer height
            gcode.layerChange({z: h})

            // PERIMETERS
            let j = 0
            // for (let line of this.perimeters[i]) {
            //     if (j%2===0) {
            //         gcode.travelTo({x: line.start.x + offset, y: line.start.z + offset})
            //         gcode.extrudeTo({x: line.end.x + offset, y: line.end.z + offset})
            //     } else {
            //         gcode.travelTo({x: line.end.x + offset, y: line.end.z + offset})
            //         gcode.extrudeTo({x: line.start.x + offset, y: line.start.z + offset})
            //     }
            //     j++
            // }

            // SOLID INFILL
            j = 0
            for (let line of this.solid[i]) {
                if (j % 2 === 0) {
                    gcode.travelTo({x: line.start.x + offset, y: line.start.z + offset})
                    gcode.extrudeTo({x: line.end.x + offset, y: line.end.z + offset, s: this.config.solidSpeed})
                } else {
                    gcode.travelTo({x: line.end.x + offset, y: line.end.z + offset})
                    gcode.extrudeTo({x: line.start.x + offset, y: line.start.z + offset, s: this.config.solidSpeed})
                }
                j++
            }
        }


        gcode.footer()
        console.log("gcode", gcode.gcode)
        let name = this.config.filename.split('.').slice(0, -1).join('.')
        gcode.download(name + '.gcode')
        this.gcode = gcode
        return gcode
    }

}

module.exports = Slicer