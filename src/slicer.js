const THREE = require('three')


class Slicer {

    constructor(options = {}) {
        this.config = options.config
        this.emitter = options.emitter


        this.emitter.on('currentLayerChange', (layerNumber) => this.sliceAt(layerNumber))
    }


    prepareGeometry(obj) {
        this.obj = obj
        let geom = new THREE.Geometry().fromBufferGeometry(this.obj)
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

    sliceAt(layer) {
        if (!this.geom) throw new Error("No geometry prepared")
        let h = layer * this.config.layerHeight + this.config.epsilon

        //this.geom.computeBoundingBox()
        //let maxY = this.geom.boundingBox.max.y
        //console.log("maxY", maxY, "layer", layer, "h=", h, "epsilon", this.config.epsilon)

        this.segments = []

        let plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -h)
        console.log("geometry", this.geom)

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
                this.segments.push(new THREE.Line3(intersectionVertices[0], intersectionVertices[1]))
            }
        }
        this.emitter.emit('layerSliceFinished')
    }

}

module.exports = Slicer