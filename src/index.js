import './index.css'
import dat from 'dat.gui'

let THREE = require('three')
let OrbitControls = require('./vendor/OrbitControls')
let STLLoader = require('./vendor/STLLoader')
let Timer = require('./timer')

let gui = new dat.GUI({
    width: 400,
})
let controllers = {}
let options = {
    // controlled by menu
    loadUrl: getQueryParam('loadUrl') || "", // to load a STL from a link
    currentLayerNumber: 0,
    layerHeight: 0.2,
    nozzleSize: 0.4,
    contours: true,
    extrusionLines: true,
    axesHelper: true,
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
let camLight = new THREE.DirectionalLight(0xffffff, 0.75)
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
    general.add(options, 'loadUrl').onChange(() => {
        loadUrl()
    })
    controllers.currentLayerNumber = general.add(options, 'currentLayerNumber', 0, 10000, 1).onChange(slice).name('Current Layer')
    general.add(options, 'layerHeight', 0.06, 0.3, 0.01).onChange(() => {
        controllers.currentLayerNumber.setValue(0)
        computeObjectHeight()
        slice()
    }).name('Layer Height')

    general.add(options, 'nozzleSize', 0, 2, 0.1).onChange(slice).name('Nozzle diameter')

    let transformations = gui.addFolder('Transformations')
    let rotation = transformations.addFolder('Rotation')
    rotation.add(options.rotation, 'x').onChange(onObjectLoaded)
    rotation.add(options.rotation, 'y').onChange(onObjectLoaded)
    rotation.add(options.rotation, 'z').onChange(onObjectLoaded)

    let scale = transformations.addFolder('Scale')
    scale.add(options.scale, 'x').onChange(onObjectLoaded)
    scale.add(options.scale, 'y').onChange(onObjectLoaded)
    scale.add(options.scale, 'z').onChange(onObjectLoaded)

    let debug = gui.addFolder('Debugging Options')
    debug.add(options, 'contours').onChange(slice)
    debug.add(options, 'extrusionLines').onChange(slice)
    debug.add(options, 'points').onChange(slice)

    debug.add(options, 'axesHelper').onChange(updateDebugVisibility)
    debug.add(options, 'wireframe').onChange(updateDebugVisibility)
    debug.add(options, 'normals').onChange(updateDebugVisibility)

    general.open()
    scale.open()
    rotation.open()
}

function updateDebugVisibility() {
    mainObj.visible = !options.wireframe
    wireframeObj.visible = options.wireframe
    normalsHelper.visible = options.normals
    axesHelper.visible = options.axesHelper

    if (currentLayer.extrusionLines) currentLayer.extrusionLines.visible = options.extrusionLines
    if (currentLayer.points) currentLayer.points.visible = options.points
    if (currentLayer.contourLines) currentLayer.contourLines.visible = options.contours

    if (currentLayer.extrusionLines) currentLayer.extrusionLines.material.linewidth = (options.nozzleSize * 10) ^ 2 * 0.9
    //console.log("line width:", 0.9 * options.nozzleSize * 10)
    if (currentLayer.extrusionLines) currentLayer.extrusionLines.material.needsUpdate = true
}

loadMenu()


init()
animate()

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
}, false)


document.addEventListener('dragover', ev => {
    ev.preventDefault()
})

document.addEventListener('drop', (ev) => {
    ev.stopPropagation()
    ev.preventDefault()

    loadSTL(ev.dataTransfer.files)
}, false)


document.getElementById('fileinput').addEventListener('change', (ev) => {
    console.log('ev', ev)
    loadSTL(ev.target.files)
})

function loadSTL(files) {
    let loader = new STLLoader()
    if (files.length === 0) {
        return
    }
    let file = files[0]
    let reader = new FileReader()
    reader.addEventListener('load', ev => {
        let buffer = ev.target.result
        originalGeom = loader.parse(buffer)
        onObjectLoaded()
    }, false)
    reader.readAsArrayBuffer(file)
}


function computeObjectHeight() {
    objectHeight = new THREE.Box3().setFromObject(mainObj).getSize(new THREE.Vector3()).y
    numLayers = Math.floor(objectHeight / options.layerHeight) - 1
    controllers.currentLayerNumber.max(numLayers)
    controllers.currentLayerNumber.updateDisplay()
}
function onObjectLoaded() {
    if (mainObj) cleanup()

    mainGeom = new THREE.Geometry().fromBufferGeometry(originalGeom)
    mainGeom.applyMatrix(getMatrix())


    let group = new THREE.Group()
    scene.add(group)
    mainObj = new THREE.Mesh(mainGeom, new THREE.MeshPhongMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.5,
    }))

    wireframeObj = new THREE.Mesh(mainGeom, new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        wireframe: true,
        opacity: 0.8,
    }))


    group.add(wireframeObj)
    group.add(mainObj)

    let bb = new THREE.Box3().setFromObject(mainObj)
    normalsHelper = new THREE.FaceNormalsHelper(mainObj, bb.getSize(new THREE.Vector3()).length() / 20, 0x0000ff, 1)
    group.add(normalsHelper)

    computeObjectHeight()
    resetCamera(bb.max.clone().sub(bb.min).length() / 2)


    slice()
}

function onObjectLoaded2() {
    if (mainObj) cleanup()

    let geom = originalGeom.clone()
    geom.applyMatrix(getMatrix())
    geom.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI / 2))

    let group = new THREE.Group()
    scene.add(group)
    let mat = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.5,
    })

    mainObj = new THREE.Mesh(geom, mat)
    wireframeObj = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        wireframe: true,
        opacity: 0.8,
    }))


    group.add(wireframeObj)
    group.add(mainObj)

    let bb = new THREE.Box3().setFromObject(mainObj)

    let radius = bb.max.clone().sub(bb.min).length() / 2
    let tmp = bb.max.clone().sub(bb.min)
    tmp.divideScalar(2)
    tmp.multiplyScalar(-1)
    tmp.sub(bb.min)
    let bbY = bb.getSize(new THREE.Vector3()).y / 2
    tmp.add(new THREE.Vector3(0, bbY, 0))


    let bbb = boundingBox(bb, 0x0000ff, 0.2)
    group.add(bbb)
    geom.applyMatrix(new THREE.Matrix4().makeTranslation(tmp.x, tmp.y, tmp.z))
    bbb.translateOnAxis(new THREE.Vector3(0, 1, 0), bbY)

    geom.needsUpdate = true
    resetCamera(radius)

    computeObjectHeight()

    mainGeom = new THREE.Geometry().fromBufferGeometry(geom)


    let tmpMesh = new THREE.Mesh(mainGeom, new THREE.MeshBasicMaterial())
    normalsHelper = new THREE.FaceNormalsHelper(tmpMesh, bb.getSize(new THREE.Vector3()).length() / 20, 0x0000ff, 1)
    group.add(normalsHelper)

    objMatrix = group.matrix.clone()

    slice()
}

function cleanup() {
    scene.remove(mainObj.parent)
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

function getMatrix() {
    let m = new THREE.Matrix4()
    m = m.premultiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2))
    m = m.premultiply(new THREE.Matrix4().makeRotationX(options.rotation.x / 180 * Math.PI))
    m = m.premultiply(new THREE.Matrix4().makeRotationY(options.rotation.y / 180 * Math.PI))
    m = m.premultiply(new THREE.Matrix4().makeRotationZ(options.rotation.z / 180 * Math.PI))
    m = m.premultiply(new THREE.Matrix4().makeScale(options.scale.x, options.scale.y, options.scale.z))
    return m
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

function resetCamera(length) {
    let pos = new THREE.Vector3(1, 1, 1).setLength(length * 3)
    camera.position.copy(pos)
    camera.lookAt(0, 0, 0)
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


function updateLights() {
    let showLight = function showLight(x, y, z, i) {
        let l = new THREE.DirectionalLight(0xffffff, i)
        scene.add(l)
        l.position.set(x, y, z)
    }
}


function init() {
    scene = new THREE.Scene()
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true
    })
    renderer.setSize(window.innerWidth, window.innerHeight)
    document.body.appendChild(renderer.domElement)


    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10000)
    controls = new OrbitControls(camera, canvas)

    scene.background = new THREE.Texture

    resetCamera(10)
    updateLights()

    scene.add(camLight)

    axesHelper = new THREE.AxesHelper(500)
    scene.add(axesHelper)
    //showGround()


    if (options.loadUrl !== "") {
        loadUrl()
    }
}

function startAutoSlice() {
    options.currentLayerNumber = 0
    autoSlice = true
}

startAutoSlice()

function onAutoSliceFinish() {

}

function animate() {
    requestAnimationFrame(animate)
    controls.update()
    camLight.position.copy(camera.position)
    renderer.render(scene, camera)

    if (autoSlice && mainObj) {
        if (options.currentLayerNumber === 0) {
            autoSliceTimer = new Timer()
        }
        slice()
        autoSliceTimer.tick("Layer " + options.currentLayerNumber)
        controllers.currentLayerNumber.setValue(options.currentLayerNumber + 1)
        if (options.currentLayerNumber >= numLayers) {
            autoSlice = false
            onAutoSliceFinish()
        }
    }
}

function loadUrl() {
    const url = options.loadUrl

    let loader = new STLLoader()

    fetch(url, {})
        .then(response => response.arrayBuffer())
        .then(buf => {
            originalGeom = loader.parse(buf)
            onObjectLoaded()

        })

}

function getQueryParam(param) {
    return new URLSearchParams(window.location.search).get(param)
}


