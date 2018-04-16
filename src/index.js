import './index.css'


//let THREE = require('./vendor/three')
let THREE = require('three')
let OrbitControls = require('./vendor/OrbitControls')
let STLLoader = require('./vendor/STLLoader')

let canvas = document.getElementById('canvas')


// THREEjs globals
let camera, scene, renderer, controls

// Single object
let geometry, material, mesh


let obj // main 3d model
let bbWireframe


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

    var loader = new STLLoader()

    if (ev.dataTransfer.files.length === 0) {
        console.log('No files')
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
    scene.remove(obj)
    obj = new THREE.Mesh(geom, material)
    scene.add(obj)


    let bb = new THREE.Box3().setFromObject(obj)
    let radius = bb.max.clone().sub(bb.min).length() / 2
    let tmp = bb.max.clone().sub(bb.min)
    tmp.divideScalar(2)
    tmp.multiplyScalar(-1)
    tmp.sub(bb.min)
    //console.log(tmp)
    let length = tmp.length()
    tmp.normalize()
    obj.translateOnAxis(tmp, length)

    //console.log(bb)

    drawBoundingBox(bb)
    resetCamera(radius)
}

function drawBoundingBox(bb) {
    bb = bb.clone()
    bb.min.multiplyScalar(1.01)
    bb.max.multiplyScalar(1.01)
    scene.remove(bbWireframe)
    let d = bb.max.clone().sub(bb.min)
    let geom = new THREE.CubeGeometry(d.x, d.y, d.z)
    geom = new THREE.EdgesGeometry(geom)
    let mat = new THREE.LineBasicMaterial({
        color: 0xff0000,
        linewidth: 2,
    })
    bbWireframe = new THREE.LineSegments(geom, mat)
    scene.add(bbWireframe)
}

function resetCamera(length) {
    let pos = new THREE.Vector3(1, 1, 1).setLength(length * 3)
    console.log("camera pos: ", pos)
    camera.position.copy(pos)
    camera.lookAt(0, 0, 0)
}


function init() {
    scene = new THREE.Scene()
    material = new THREE.MeshNormalMaterial()
    renderer = new THREE.WebGLRenderer({canvas: canvas, antialias: true})
    renderer.setSize(window.innerWidth, window.innerHeight)
    document.body.appendChild(renderer.domElement)


    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10000)
    controls = new OrbitControls(camera)

    resetCamera(10)
    scene.add(new THREE.AxesHelper(50))
}

function animate() {

    requestAnimationFrame(animate)
    controls.update()
    renderer.render(scene, camera)

}