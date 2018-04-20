import './index.css'
import dat from 'dat.gui'

let THREE = require('three')
let OrbitControls = require('./vendor/OrbitControls')
let STLLoader = require('./vendor/STLLoader')
let Timer = require('./timer')

let gui = new dat.GUI()
let controllers = {}
let options = {
    currentLayerNumber: 0,
    layerHeight: 0.2,
    nozzleSize: 0.4,
    showLayerTriangles: false,
    showLayerSegments: true,
    showLayerLines: true,
    axesHelper: true,
}
let numLayers = 0
let canvas = document.getElementById('canvas')
let camera, scene, renderer, controls
let camLight = new THREE.DirectionalLight(0xffffff, 0.75)
let mainObj
let mainGeom
let timer
let objectHeight
let axesHelper


let currentLayer


function loadMenu() {
    controllers.currentLayerNumber = gui.add(options, 'currentLayerNumber', 0, 10000, 1).onChange(() => {
        slice()
    })
    controllers.layerHeight = gui.add(options, 'layerHeight', 0.06, 10, 0.1).onChange(() => {
        computeObjectHeight()
        slice()
    })
    controllers.nozzleSize = gui.add(options, 'nozzleSize', 0, 2, 0.1).onChange(() => {
        slice()
    })
    controllers.showLayerTriangles = gui.add(options, 'showLayerTriangles').onChange(() => {
        slice()
    })
    controllers.showLayerSegments = gui.add(options, 'showLayerSegments').onChange(() => {
        slice()
    })
    controllers.showLayerLines = gui.add(options, 'showLayerLines').onChange(() => {
        slice()
    })
    controllers.axesHelper = gui.add(options, 'axesHelper').onChange((v) => {
        axesHelper.visible = v
    })
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

document.addEventListener('drop', loadSTL, false)

function loadSTL(ev) {
    ev.stopPropagation()
    ev.preventDefault()

    let loader = new STLLoader()


    if (ev.dataTransfer.files.length === 0) {
        return
    }
    let file = ev.dataTransfer.files[0]
    let reader = new FileReader()
    reader.addEventListener('load', ev => {
        let buffer = ev.target.result
        let geom = loader.parse(buffer)

        onObjectLoaded(geom)
    }, false)
    reader.readAsArrayBuffer(file)
}


function computeObjectHeight() {
    objectHeight = new THREE.Box3().setFromObject(mainObj).getSize(new THREE.Vector3()).y
    numLayers = Math.floor(objectHeight / options.layerHeight)
    console.log("NumLayers", numLayers)
    controllers.currentLayerNumber.max(numLayers)
    controllers.currentLayerNumber.updateDisplay()
}


function onObjectLoaded(geom) {
    geom.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI / 2))
    geom.applyMatrix(new THREE.Matrix4().makeTranslation(0, -1e-12, 0))

    let group = new THREE.Group()
    scene.add(group)
    let mat = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.4,
    })
    let obj = new THREE.Mesh(geom, mat)
    group.add(obj)

    let bb = new THREE.Box3().setFromObject(obj)
    let radius = bb.max.clone().sub(bb.min).length() / 2
    let tmp = bb.max.clone().sub(bb.min)
    tmp.divideScalar(2)
    tmp.multiplyScalar(-1)
    tmp.sub(bb.min)
    let bbY = bb.getSize(new THREE.Vector3(0, 0, 0)).y / 2
    tmp.add(new THREE.Vector3(0, bbY, 0))


    let bbb = boundingBox(bb, 0x0000ff, 0.2)
    group.add(bbb)
    obj.geometry.applyMatrix(new THREE.Matrix4().makeTranslation(tmp.x, tmp.y, tmp.z))
    bbb.translateOnAxis(new THREE.Vector3(0, 1, 0), bbY)

    resetCamera(radius)

    mainObj = obj
    computeObjectHeight()

    mainGeom = new THREE.Geometry().fromBufferGeometry(mainObj.geometry)


    slice()
}

function slice() {
    if (mainObj === undefined) return
    if (currentLayer !== undefined) {
        scene.remove(currentLayer)
    }

    currentLayer = new THREE.Group()
    scene.add(currentLayer)

    computeLayerTriangles(options.showLayerTriangles)
    computeLayerSegments(options.showLayerSegments)
    computeLayerLines(options.showLayerLines)
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

    scene.remove(currentLayer.layerTrianglesObject)

    timer.tick("Clone")
    //let g = mainGeom
    timer.tick("Geometry clone")

    let h = options.currentLayerNumber * options.layerHeight
    currentLayer.intersectionPlane = makePlane(h)
    //currentLayer.add(currentLayer.intersectionPlane)

    let lineIntersects = (a, b) => (a > h && h > b) || (b > h && h > a)
    let keepFace = (f) => {
        let l = [mainGeom.vertices[f.a].y, mainGeom.vertices[f.b].y, mainGeom.vertices[f.c].y]
        if (l[0] === l[1] && l[1] === l[2] && l[2] === h) return true
        return lineIntersects(l[0], l[1]) + lineIntersects(l[1], l[2]) + lineIntersects(l[2], l[0])
    }
    let g2 = new THREE.Geometry()
    g2.vertices = mainGeom.vertices
    timer.tick("Before filter")
    g2.faces = mainGeom.faces.filter(keepFace)
    timer.tick("After filter")

    currentLayer.layerTrianglesObject = new THREE.Mesh(g2, mat)

    if (show)
        currentLayer.add(currentLayer.layerTrianglesObject)
}


function computeLayerSegments(show) {
    currentLayer.segments = []
    let geom = new THREE.Geometry()
    let makeLine = (l) => {
        geom.vertices.push(l.start)
        geom.vertices.push(l.end)
        currentLayer.segments.push(l)
    }
    let triangles = currentLayer.layerTrianglesObject.geometry
    let h = options.currentLayerNumber * options.layerHeight

    let isHorizontalFace = (vs) => vs[0].y === vs[1].y && vs[1].y === vs[2].y
    let lineIntersects = (a, b) => (a > h && h > b) || (b > h && h > a)

    let out = []
    triangles.faces.forEach((f) => {
        let vs = [triangles.vertices[f.a], triangles.vertices[f.b], triangles.vertices[f.c]]
        let ls = [
            new THREE.Line3(vs[0], vs[1]),
            new THREE.Line3(vs[1], vs[2]),
            new THREE.Line3(vs[2], vs[0]),
        ]
        if (isHorizontalFace(vs)) {
            ls.forEach((l) => {
                for (let i = 0; i < out.length; i++) {
                    if (!out[i].equals(l) &&
                        !out[i].equals(new THREE.Line3(l.end, l.start))) {
                        continue
                    }
                    out.splice(i, 1)
                    return
                }
                out.push(l)
            })
        } else { // face intersects plane
            let ils = []
            ls.forEach((l, i) => {
                if (lineIntersects(l.start.y, l.end.y))
                    ils.push(i)
            })
            let vAt = (l) => l.at((h - l.start.y) / (l.end.y - l.start.y), new THREE.Vector3())
            if (ils.length === 2) {
                out.push(new THREE.Line3(vAt(ls[ils[0]]), vAt(ls[ils[1]])))
            } else if (ils.length === 1) {
                vs.forEach((v) => {
                    if (v.y === h)
                        out.push(new THREE.Line3(vAt(ls[ils[0]]), v))
                })
            } else {
                throw "Invalid ils length: " + ils.length
            }

        }

    })

    out.forEach((l) => makeLine(l))

    currentLayer.contourLines = new THREE.LineSegments(geom, new THREE.LineBasicMaterial({
        color: 0xff0000,
    }))


    if (options.showLayerSegments) {
        currentLayer.add(currentLayer.contourLines)

        currentLayer.boundingSquare = new THREE.BoxHelper(currentLayer.contourLines, 0x22ff22)
        currentLayer.add(currentLayer.boundingSquare)
    }
}

function computeLayerLines() {
    scene.remove(currentLayer.lines)
    let contours = currentLayer.contourLines.geometry
    let geom = new THREE.Geometry()
    let h = options.currentLayerNumber * options.layerHeight

    let makeLine = (l) => {
        geom.vertices.push(l.start)
        geom.vertices.push(l.end)
    }

    let bb = new THREE.Box3().setFromObject(currentLayer.contourLines)

    let minz = bb.min.z
    let maxz = bb.max.z

    let firstX = Math.ceil(bb.min.x / options.nozzleSize) * options.nozzleSize


    for (let x = firstX; x < bb.max.x; x += options.nozzleSize) {
        let vAt = (l) => l.at((x - l.start.x) / (l.end.x - l.start.x), new THREE.Vector3())
        //let line = new THREE.Line3(new THREE.Vector3(x, h, minz), new THREE.Vector3(x, h, maxz))
        let is = []
        let lineIntersects = (a , b) => (a >= x && x >= b) || (b > x && x > a)
        currentLayer.segments.forEach((s) => {
            // if intersect
            if(lineIntersects(s.start.x,s.end.x)) is.push(s)
    })
        let ordp = []
        for(let i =0; i<is.length;i+=1) ordp.push(vAt(is[i]))
        ordp.sort((a, b) => a.z - b.z)
        for(let i =0; i<is.length;i=i+2)makeLine(new THREE.Line3(ordp[i],ordp[i+1]))
        //makeLine(line)
    }


    // intersect with lines

    currentLayer.lines = new THREE.LineSegments(geom, new THREE.LineBasicMaterial({
        color: 0x3949AB,
    }))
    currentLayer.add(currentLayer.lines)
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
}

function animate() {
    requestAnimationFrame(animate)
    controls.update()
    camLight.position.copy(camera.position)
    renderer.render(scene, camera)
}

