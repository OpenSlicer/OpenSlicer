import './index.css'
import dat from 'dat.gui'

let gui = new dat.GUI()
let menu = {}
let options = {
    height: 0,
}

function loadMenu() {
    menu.intersectionController = gui.add(options, 'height', 0, 100).onChange(() => {
        showTest()
    })
}


loadMenu()


//let THREE = require('./vendor/three')
let THREE = require('three')
let OrbitControls = require('./vendor/OrbitControls')
let STLLoader = require('./vendor/STLLoader')

let canvas = document.getElementById('canvas')


// THREEjs globals
let camera, scene, renderer, controls
let camLight = new THREE.DirectionalLight(0xffffff, 0.75)

let intersectionPlane
let intersectionObj
let mainObj
let sliceGroup

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

function showTest() {
    let obj = mainObj
    let mat = new THREE.MeshPhongMaterial({
        color: 0x0000ff,
        wireframe: true,
        linewidth: 1,
    })
    scene.remove(intersectionObj)

    intersectionObj = obj.clone()
    let g = new THREE.Geometry().fromBufferGeometry(intersectionObj.geometry)

    let h = options.height
    scene.remove(intersectionPlane)
    intersectionPlane = makePlane(h)

    let lineIntersects = (a, b) => (a > h && h > b) || (b > h && h > a)
    let keepFace = (f) => {
        let l = [g.vertices[f.a].y, g.vertices[f.b].y, g.vertices[f.c].y]
        if (l[0] == l[1] && l[1] == l[2] && l[2] == h) return true
        return lineIntersects(l[0], l[1]) || lineIntersects(l[1], l[2]) || lineIntersects(l[2], l[0])
    }

    g.faces = g.faces.filter(keepFace)
    g.faces.needsUpdate = true

    intersectionObj.geometry = g

    //console.log(g)
    intersectionObj.material = mat
    intersectionObj.material.needsUpdate = true
    //scene.add(intersectionObj)

    showTest2()
}


function showTest2() {
    const mat = new THREE.LineBasicMaterial({
        color: 0xff0000,
        linewidth: 3,

    })

    scene.remove(sliceGroup)
    sliceGroup = new THREE.Group()

    let makeLine = (l) => {
        let geom = new THREE.Geometry()
        geom.vertices.push(l.start)
        geom.vertices.push(l.end)
        sliceGroup.add(new THREE.Line(geom, mat))
    }
    let g = intersectionObj.geometry
    let h = options.height

    let isHorizontalFace = (vs) => vs[0].y === vs[1].y && vs[1].y === vs[2].y
    let lineIntersects = (a, b) => (a > h && h > b) || (b > h && h > a)

    let out = []
    // geom
    g.faces.forEach((f) => {
        let vs = [g.vertices[f.a], g.vertices[f.b], g.vertices[f.c]]
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
            ls.forEach((l) => {
                if (lineIntersects(l.start.y, l.end.y))
                    ils.push(l)

            })

            let vAt = (l) => l.at((h - l.start.y) / (l.end.y - l.start.y), new THREE.Vector3())
            out.push(new THREE.Line3(vAt(ils[0]), vAt(ils[1])))
        }

    })

    out.forEach((l) => makeLine(l))
    //console.log(sliceGroup)
    scene.add(sliceGroup)
}


function onObjectLoaded(geom) {
    geom.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI / 2))

    let group = new THREE.Group()
    scene.add(group)
    let mat = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.2,
        //wireframe: true,
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

    let size = bb.getSize(new THREE.Vector3())
    menu.intersectionController.max(size.y)

    let bbb = boundingBox(bb)
    group.add(bbb)
    obj.geometry.applyMatrix(new THREE.Matrix4().makeTranslation(tmp.x, tmp.y, tmp.z))
    //obj.translateOnAxis(tmp, length)
    bbb.translateOnAxis(new THREE.Vector3(0, 1, 0), bbY)

    resetCamera(radius)

    mainObj = obj
    showTest()
}

function boundingBox(bb) {
    bb = bb.clone()
    let d = bb.max.clone().sub(bb.min)
    let geom = new THREE.CubeGeometry(d.x, d.y, d.z)
    geom = new THREE.EdgesGeometry(geom)
    let mat = new THREE.LineBasicMaterial({
        color: 0x0000ff,
        linewidth: 2,
        transparent: true,
        opacity: 0.2,
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

    scene.add(new THREE.AxesHelper(500))
    //showGround()
}

function animate() {
    requestAnimationFrame(animate)
    controls.update()
    camLight.position.copy(camera.position)
    renderer.render(scene, camera)
}

