// the new stuff
import ObjectLoader from './objectloader'
import Viewer from './viewer'

const objectLoader = new ObjectLoader()
const viewer = new Viewer({canvas: document.getElementById('canvas')})


function main() {
    objectLoader.on('objectLoaded', function (obj) {
        console.log("main: object loaded", obj)
        viewer.showObject(obj)
    })

}

main()


// the old stuff
import './index.css'
import dat from 'dat.gui'
let Timer = require('./timer')
let util = require('./util')
let THREE = require('three')


let gui = new dat.GUI({
    width: 400,
})
let controllers = {}
let options = {
    // controlled by menu
    loadUrl: util.getQueryParam('loadUrl') || "", // to load a STL from a link
    currentLayerNumber: 0,
    layerHeight: 0.2,
    nozzleSize: 0.4,
    contours: true,
    extrusionLines: true,
    axesHelper: false,
    wireframe: false,
    normals: false,
    points: false,

    rotation: {x: 0, y: 0, z: 0},
    scale: {x: 1, y: 1, z: 1},

    // internal
    epsilon: 1e-10, // in mm

}
let numLayers = 0
let canvas = document.getElementById('canvas')
let camera, scene, renderer, controls
let mainObj
let wireframeObj
let normalsHelper
let mainGeom
let timer
let objectHeight
let axesHelper

let currentLayer

let originalGeom
let objMatrix

// When true, we will slice as fast as possible
let autoSlice = false
let autoSliceTimer


function loadMenu() {

    let general = gui.addFolder('General')
    general.add({
        loadFile: () => {
            document.getElementById('fileinput').click()
        }
    }, 'loadFile').name('Load file')
    general.add(options, 'loadUrl').name("Url")
    general.add({
        loadUrl: util.loadUrl,
    }, 'loadUrl').name('Load url')
    controllers.currentLayerNumber = general.add(options, 'currentLayerNumber', 0, 10000, 1).onChange(slice).name('Current Layer')
    general.add(options, 'layerHeight', 0.06, 0.3, 0.01).onChange(() => {
        controllers.currentLayerNumber.setValue(0)
        computeObjectHeight()
        slice()
    }).name('Layer Height')

    general.add(options, 'nozzleSize', 0, 2, 0.1).onChange(slice).name('Nozzle diameter')

    let transformations = gui.addFolder('Transformations')
    let rotation = transformations.addFolder('Rotation')
    rotation.add(options.rotation, 'x').onChange()
    rotation.add(options.rotation, 'y').onChange()
    rotation.add(options.rotation, 'z').onChange()

    let scale = transformations.addFolder('Scale')
    scale.add(options.scale, 'x').onChange()
    scale.add(options.scale, 'y').onChange()
    scale.add(options.scale, 'z').onChange()

    let debug = gui.addFolder('Debugging Options')
    debug.add(options, 'contours').onChange()
    debug.add(options, 'extrusionLines').onChange()
    debug.add(options, 'points').onChange()

    debug.add(options, 'axesHelper').onChange()
    debug.add(options, 'wireframe').onChange()
    debug.add(options, 'normals').onChange()

    general.open()
    scale.open()
    rotation.open()
}

loadMenu()




function computeObjectHeight() {
    mainGeom.computeBoundingBox()
    objectHeight = mainGeom.boundingBox.max.y - mainGeom.boundingBox.min.y
    numLayers = Math.floor(objectHeight / options.layerHeight) - 1
    controllers.currentLayerNumber.max(numLayers)
    controllers.currentLayerNumber.updateDisplay()
}



// Slices a single layer of the mesh
function slice() {
    if (mainObj === undefined) return
    if (currentLayer !== undefined) {
        scene.remove(currentLayer)
    }

    currentLayer = new THREE.Group()
    scene.add(currentLayer)

    ensureNoCoplanarVertices()
    computeLayerTriangles()
    computeContours()
    computeLayerLines()

    updateDebugVisibility()
}


// we avoid a lot of problems by ensuring that no vertices touch the slicing plane
function ensureNoCoplanarVertices() {
    let h = getCurrentLayerHeight()
    for (let i = 0; i < mainGeom.vertices.length; i++) {
        let v = mainGeom.vertices[i]
        if (v.y === h) v.y += options.epsilon
        mainGeom.vertices[i] = v
    }
}


function computeLayerTriangles(show) {
    timer = new Timer()
    let obj = mainObj
    let mat = new THREE.MeshBasicMaterial({
        color: 0x0000ff,
        wireframe: true,
        transparent: true,
        opacity: 0.2,
    })

    let h = getCurrentLayerHeight()
    currentLayer.intersectionPlane = makePlane(h)

    let lineIntersects = (a, b) => (a > h && h > b) || (b > h && h > a)
    let keepFace = (f) => {
        let l = [mainGeom.vertices[f.a].y, mainGeom.vertices[f.b].y, mainGeom.vertices[f.c].y]
        let keepLine = (a, b) => l[a] === l[b] && l[a] === h
        if (keepLine(0, 1) || keepLine(1, 2) || keepLine(2, 0)) {
            return true
        }
        if (l[0] === l[1] && l[1] === l[2] && l[2] === h) {
            return true
        }
        return lineIntersects(l[0], l[1]) + lineIntersects(l[1], l[2]) + lineIntersects(l[2], l[0])
    }
    let g2 = new THREE.Geometry()
    g2.vertices = mainGeom.vertices
    g2.faces = mainGeom.faces.filter(keepFace)

    currentLayer.layerTrianglesObject = new THREE.Mesh(g2, mat)

    if (show)
        currentLayer.add(currentLayer.layerTrianglesObject)
}

function computeContours() {
    currentLayer.segments = []
    let geom = new THREE.Geometry()
    let makeLine = (l) => {
        //if (options.contours) {
        geom.vertices.push(l.start)
        geom.vertices.push(l.end)
        //}
        currentLayer.segments.push(l)
    }
    let triangles = currentLayer.layerTrianglesObject.geometry
    let h = getCurrentLayerHeight()

    let isHorizontalFace = (vs) => vs[0].y === vs[1].y && vs[1].y === vs[2].y
    let lineIntersects = (a, b) => (a > h && h > b) || (b > h && h > a)
    let lineContained = (l) => l.start.y === l.end.y && l.end.y === h
    let vAt = (l) => l.at((h - l.start.y) / (l.end.y - l.start.y), new THREE.Vector3())

    let out = []

    triangles.faces.forEach((f, index) => {
        let vs = [triangles.vertices[f.a], triangles.vertices[f.b], triangles.vertices[f.c]]
        let ls = [
            new THREE.Line3(vs[0], vs[1]),
            new THREE.Line3(vs[1], vs[2]),
            new THREE.Line3(vs[2], vs[0]),
        ]
        if (isHorizontalFace(vs)) {
            // we skip them, as there will be another triangle touching the plane with 2 points
            return
        }
        let ils = []
        ls.forEach((l, i) => {
            if (lineIntersects(l.start.y, l.end.y))
                ils.push(i)
        })
        if (ils.length === 2) {
            out.push(new THREE.Line3(vAt(ls[ils[0]]), vAt(ls[ils[1]])))
        } else if (ils.length === 1) {
            vs.forEach((v) => {
                if (v.y === h)
                    out.push(new THREE.Line3(vAt(ls[ils[0]]), v))
            })
        } else {
            ls.forEach((l) => {
                if (lineContained(l)) {
                    out.push(l)
                }
            })
        }
    })


    if (options.contours || options.extrusionLines) {
        out.forEach((l) => makeLine(l))
    }

    currentLayer.contourLines = new THREE.LineSegments(geom, new THREE.LineBasicMaterial({
        color: 0xff0000,
        linewidth: 6,
    }))

    if (options.contours) {
        currentLayer.add(currentLayer.contourLines)
    }

    if (options.points) {
        currentLayer.points = new THREE.Points(geom, new THREE.PointsMaterial({
            color: 0xffff00,
            size: 0.5,
        }))
        currentLayer.add(currentLayer.points)
    }
}

function getCurrentLayerHeight() {
    let h = options.currentLayerNumber * options.layerHeight + options.layerHeight / 2
    return h
}

function computeLayerLines() {
    let geom = new THREE.Geometry()

    let makeLine = (l) => {
        geom.vertices.push(l.start)
        geom.vertices.push(l.end)
    }

    let [d1, d2] = options.currentLayerNumber % 2 ? ['x', 'z'] : ['z', 'x']

    let bb = new THREE.Box3().setFromObject(currentLayer.contourLines)

    let firstD = Math.ceil(bb.min[d1] / options.nozzleSize) * options.nozzleSize

    let segs = currentLayer.segments

    for (let x = firstD; x < bb.max[d1]; x += options.nozzleSize) {
        let vAt = (l) => l.at((x - l.start[d1]) / (l.end[d1] - l.start[d1]), new THREE.Vector3())
        let is = []
        let lineIntersects = (a, b) => (a >= x && x >= b) || (b >= x && x >= a)

        // process segments to ensure we don't intersect them at a point
        for (let i = 0; i < segs.length; i++) {
            if (segs[i].start[d1] === x) segs[i].start[d1] += options.epsilon * 3
            if (segs[i].end[d1] === x) segs[i].end[d1] += options.epsilon * 3
        }

        segs.forEach((s) => {
            if (lineIntersects(s.start[d1], s.end[d1])) is.push(s)
        })
        let ordp = []
        for (let i = 0; i < is.length; i += 1) ordp.push(vAt(is[i]))
        ordp.sort((a, b) => a[d2] - b[d2])
        for (let i = 0; i < is.length; i = i + 2) {
            if (i < ordp.length - 1) {
                if (ordp[i][d2] === ordp[i + 1][d2]) i += 1
                makeLine(new THREE.Line3(ordp[i], ordp[i + 1]))
            }
        }
    }
    currentLayer.extrusionLines = new THREE.LineSegments(geom, new THREE.LineBasicMaterial({
        color: 0x3949AB,
        linewidth: 1,
    }))

    if (options.extrusionLines) {
        currentLayer.add(currentLayer.extrusionLines)
    }
}


function boundingBox(bb, color, opacity) {
    bb = bb.clone()
    let d = bb.max.clone().sub(bb.min)
    let geom = new THREE.CubeGeometry(d.x, d.y, d.z)
    geom = new THREE.EdgesGeometry(geom)
    let mat = new THREE.LineBasicMaterial({
        color: color,
        linewidth: 2,
        transparent: true,
        opacity: opacity,
    })
    let bbWireframe = new THREE.LineSegments(geom, mat)
    return bbWireframe
}


function showGround() {
    scene.add(new THREE.GridHelper(500, 50))

    let obj = new THREE.Mesh(
        new THREE.PlaneGeometry(500, 500),
        new THREE.MeshBasicMaterial({
            color: 0x888888,
            transparent: true,
            opacity: 0.1,
            side: THREE.DoubleSide,
        }))
    obj.rotateX(Math.PI / 2)
    scene.add(obj)
}

function makePlane(h) {
    let obj = new THREE.Mesh(
        new THREE.PlaneGeometry(100, 100),
        new THREE.MeshBasicMaterial({
            color: 0x33dd33,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide,
        }))
    obj.translateY(h)
    obj.rotateX(Math.PI / 2)
    let helper = new THREE.GridHelper(100, 20)
    helper.rotateX(Math.PI / 2)

    //scene.add(obj)
    obj.add(helper)
    return obj
}






