const THREE = require('three')


class Slicer {

    constructor(config) {
        this.config = config
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

        if (!this.validate2manifold()) {
            console.log("Warning: Object is not a valid 2-manifold")
        }

        return geom
    }

    // see https://github.com/slic3r/Slic3r/blob/5d7711f31978afa5fac476e7afe80d9e8b61dcd2/xs/src/libslic3r/TriangleMesh.cpp
    // Returns true if the object is a valid 2-manifold, false otherwise
    validate2manifold() {
        if (!this.obj) throw new Error("No object loaded")

        // in order to have an orientable closed surface, we need an even Euler characteristic.

        // TODO this check is left for the end, as it will only display a warning to the user
        // the user will still be able to run the slicer normally, even with a non manifold. Behavior in this
        // case is undefined

        return true;

    }

    slice() {


    }


    sliceAt(height) {
        if (!this.obj) throw new Error("No object loaded")

        let segments = cut(height)
        let poly = polygonize()

    }

    // Cuts this object at the specified height, returning an unordered
    // list of segments where the plane intersects all triangles in the STL
    // Duplicate segments are not removed
    cut(height) {


    }

}

module.exports = Slicer