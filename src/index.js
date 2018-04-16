import './index.css'


let THREE = require('./vendor/three')
let OrbitControls = require('./vendor/OrbitControls')
let STLLoader = require('./vendor/STLLoader')

let canvas = document.getElementById('canvas')


// THREEjs globals
let camera, scene, renderer, controls

// Single object
let geometry, material, mesh


let obj // main 3d model


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

document.addEventListener('drop', ev => {
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
        scene.remove(obj)
        obj = new THREE.Mesh(geom, material)
        scene.add(obj)
    }, false)
    reader.readAsArrayBuffer(file)
}, false)


function resetCamera() {
    camera.position.set(1, 1, 1)
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


    resetCamera()
}

function animate() {

    requestAnimationFrame(animate)
    controls.update()
    renderer.render(scene, camera)

}