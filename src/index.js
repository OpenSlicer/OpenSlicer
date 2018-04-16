import './index.css'


let THREE = require('./vendor/three')
let OrbitControls = require('./vendor/OrbitControls')


let canvas = document.getElementById('canvas')


// THREEjs globals
let camera, scene, renderer, controls

// Single object
let geometry, material, mesh


init()
animate()

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
}, false)

function resetCamera() {
    camera.position.set(1, 1, 1)
    camera.lookAt(0, 0, 0)
}


function init() {
    scene = new THREE.Scene()

    geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2)
    material = new THREE.MeshNormalMaterial()

    mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

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