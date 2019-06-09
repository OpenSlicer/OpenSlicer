const THREE = require('three')
const OrbitControls = require('./vendor/OrbitControls')
const $ = require('jquery')


const Viewer = class {

    constructor(options = {}) {
        console.log("Viewer constructor, options =", options)
        if (!options.canvas) throw new Error("Canvas element is mandatory")

        this.config = options.config
        this.slicer = options.slicer

        this.config.on('matrixChange', () => {
            this.onMatrixChange()
        })
        this.config.on('debugChange', () => {
            this.onDebugChange()
        })

        this.config.on('resetCamera', () => {
            this.resetCamera()
        })

        // class variables
        this.canvas = options.canvas
        this.scene = new THREE.Scene()
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true
        })
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 5000)
        this.controls = new OrbitControls(this.camera, this.canvas)
        this.controls.maxPolarAngle = Math.PI / 2

        this.camLight = new THREE.DirectionalLight(0xffffff, 0.75)
        this.axesHelper = new THREE.AxesHelper(125)
        // group that contains main object, wireframehelper, etc
        this.data = {}
        // end class variables

        this.scene.background = new THREE.Color(0xeeeeee)

        this.scene.add(new THREE.AmbientLight(0x000000))

        // add some lights
        this.addPointLight(50, 200, -100)
        this.addPointLight(-0, 200, 200)
        this.addPointLight(-100, -200, -100)

        this.renderer.setSize(window.innerWidth, window.innerHeight)
        document.body.appendChild(this.renderer.domElement)
        this.resetCamera(30)
        this.scene.add(this.camLight)
        this.scene.add(this.axesHelper)
        //showGround()
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight
            this.camera.updateProjectionMatrix()
            this.renderer.setSize(window.innerWidth, window.innerHeight)
        }, false)


        this.testAddFloor()
        this.makePlane(-0.5)
        this.animate()
    }

    testAddFloor() {
        const size = 300
        const grid = new THREE.GridHelper(size, 80, 0xffffff, 0xffffff)
        grid.position.y -= 0.1
        grid.position.x += size / 2
        grid.position.z += size / 2
        this.scene.add(grid)

    }

    addPointLight(x, y, z) {
        let pointLight = new THREE.PointLight(0xffffff, .7, 0)
        pointLight.position.set(x, y, z)
        this.scene.add(pointLight)

        let sphereSize = 10
        let pointLightHelper = new THREE.PointLightHelper(pointLight, sphereSize, 0xff0000)
        this.scene.add(pointLightHelper)
    }

    resetCamera(length, center) {
        if (!length && !this.isObjectRendered())
            return
        if (!length) {
            length = this.data.geom.boundingSphere.radius * 5
            center = this.data.geom.boundingSphere.center
        }
        let pos = new THREE.Vector3(1, 1, 1).setLength(length || 30)
        this.controls.object.position.set(pos.x, pos.y, pos.z)
        this.controls.update()
        if (center === undefined) {
            this.controls.target.set(0, 0, 0)
        } else {
            this.controls.target.copy(center)
        }
        this.controls.update()
    }


    animate() {
        const self = this
        requestAnimationFrame((function () {
            self.animate()
        }))
        this.controls.update()
        this.camLight.position.copy(this.camera.position)
        this.renderer.render(this.scene, this.camera)
    }


    isObjectRendered() {
        return this.data.group !== undefined
    }

    cleanupObject() {
        this.scene.remove(this.data.group)
        this.scene.remove(this.data.mirror)
        this.data = {}
    }

    loadObject(obj) {
        console.log("viewer loading obj:", obj)
        this.obj = obj

        this.renderObject()
        this.resetCamera(this.data.geom.boundingSphere.radius * 5, this.data.geom.boundingSphere.center)

        let lsc = $('#layer-select-container')
        lsc.width(($(window).height() - $('nav').height()*5))
        lsc.hide().show(500)

        let numLayers = Math.floor(this.data.geom.boundingBox.max.y /  this.config.layerHeight)

        console.log("layer height = ", this.config.layerHeight, "object height =", this.data.geom.boundingBox.max.y, "numLayers", numLayers)
        lsc.attr('max', numLayers)
    }

    renderObject() {
        if (this.isObjectRendered()) this.cleanupObject()
        //this.data.geom = new THREE.Geometry().fromBufferGeometry(this.obj)
        this.data.geom = this.slicer.prepareGeometry(this.obj)


        let bboxToCenter = function (o) {
            o.computeBoundingBox()
            let minX = o.boundingBox.min.x
            let minY = o.boundingBox.min.y
            let minZ = o.boundingBox.min.z
            let m = new THREE.Matrix4()
            m = m.premultiply(new THREE.Matrix4().makeTranslation(-minX, -minY, -minZ))
            return m
        }
        // Matrix calculation
        let m = new THREE.Matrix4()
        m = m.premultiply(new THREE.Matrix4().makeScale(this.config.scale.x, this.config.scale.y, this.config.scale.z))
        m = m.premultiply(new THREE.Matrix4().makeRotationX(this.config.rotation.x / 180 * Math.PI))
        m = m.premultiply(new THREE.Matrix4().makeRotationY(this.config.rotation.y / 180 * Math.PI))
        m = m.premultiply(new THREE.Matrix4().makeRotationZ(this.config.rotation.z / 180 * Math.PI))
        this.data.geom.applyMatrix(m)

        m = bboxToCenter(this.data.geom)
        m = m.premultiply(new THREE.Matrix4().makeTranslation(this.config.translation.x, 0, this.config.translation.z))
        this.data.geom.applyMatrix(m)


        this.data.group = new THREE.Group()
        this.data.obj = new THREE.Mesh(this.data.geom, new THREE.MeshPhongMaterial({
            color: 0x2194ce,
            specular: 0x111111,
            side: THREE.DoubleSide,
            shininess: 10,
        }))
        this.data.group.add(this.data.obj)
        this.scene.add(this.data.group)

        this.data.mirror = this.data.group.clone()
        this.data.mirror.scale.y = -1
        this.scene.add(this.data.mirror)

        this.data.geom.computeBoundingSphere()


        // update visibility of wireframe, etc
        this.onDebugChange()
    }


    makePlane(h, color) {
        const size = 30000

        let obj = new THREE.Mesh(
            new THREE.PlaneGeometry(size, size),
            new THREE.MeshBasicMaterial({
                color: color || 0xcccccc,
                transparent: true,
                opacity: 0.5,
                depthWrite: false,
                //side: THREE.DoubleSide,
            }))
        obj.translateY(-h)

        obj.rotateX(-Math.PI / 2)

        this.scene.add(obj)
    }


    onMatrixChange() {
        if (!this.isObjectRendered()) return
        // we are changing the rotation or scale, we will bake this in the final vertices, so we need to re-render
        // the object
        this.renderObject()
    }

    onDebugChange() {
        if (!this.isObjectRendered()) return

        this.data.mirror.visible = !this.config.wireframe
        this.data.obj.material.wireframe = !!this.config.wireframe
        this.axesHelper.visible = !!this.config.axesHelper
    }
}

module.exports = Viewer

