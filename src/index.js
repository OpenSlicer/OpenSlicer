import './index.css'


//let THREE = require('./vendor/three')
let THREE = require('three')
let OrbitControls = require('./vendor/OrbitControls')
let STLLoader = require('./vendor/STLLoader')

let canvas = document.getElementById('canvas')


// THREEjs globals
let camera, scene, renderer, controls
let camLight = new THREE.DirectionalLight(0xffffff, 0.75)


// Single object
let material


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


function onObjectLoaded(geom) {
    let group = new THREE.Group()
    scene.add(group)

    let obj = new THREE.Mesh(geom, material)
    group.add(obj)


    let bb = new THREE.Box3().setFromObject(obj)
    let radius = bb.max.clone().sub(bb.min).length() / 2
    let tmp = bb.max.clone().sub(bb.min)
    tmp.divideScalar(2)
    tmp.multiplyScalar(-1)
    tmp.sub(bb.min)
    let bbY = bb.getSize(new THREE.Vector3(0, 0, 0)).y / 2
    tmp.add(new THREE.Vector3(0, bbY, 0))

    let length = tmp.length()
    tmp.normalize()

    let bbb = boundingBox(bb)
    group.add(bbb)
    obj.translateOnAxis(tmp, length)

    bbb.translateOnAxis(new THREE.Vector3(0, 1, 0), bbY)

    resetCamera(radius)
    return group
}

function boundingBox(bb) {
    bb = bb.clone()
    let d = bb.max.clone().sub(bb.min)
    let geom = new THREE.CubeGeometry(d.x, d.y, d.z)
    geom = new THREE.EdgesGeometry(geom)
    let mat = new THREE.LineBasicMaterial({
        color: 0xff0000,
        linewidth: 2,
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


function updateLights() {
    let showLight = function showLight(x, y, z, i) {
        let l = new THREE.DirectionalLight(0xffffff, i)
        scene.add(l)
        l.position.set(x, y, z)
    }
}


function init() {
    scene = new THREE.Scene()
    material = new THREE.MeshPhongMaterial()
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true
    })
    renderer.setSize(window.innerWidth, window.innerHeight)
    document.body.appendChild(renderer.domElement)


    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10000)
    controls = new OrbitControls(camera)

    scene.background = new THREE.Texture

    resetCamera(10)
    updateLights()

    scene.add(camLight)

    scene.add(new THREE.AxesHelper(500))
    showGround()
}

function animate() {
    requestAnimationFrame(animate)
    controls.update()
    camLight.position.copy(camera.position)

    renderer.render(scene, camera)

}