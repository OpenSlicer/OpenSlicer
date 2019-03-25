const THREE = require('three')
const OrbitControls = require('./vendor/OrbitControls')


const Viewer = class {

    constructor(options = {}) {
        console.log("Viewer constructor, options =", options)
        if (!options.canvas) throw new Error("Canvas element is mandatory")

        // class variables
        this.canvas = options.canvas
        this.scene = new THREE.Scene()
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true
        })
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10000)
        this.controls = new OrbitControls(this.camera, this.canvas)
        this.camLight = new THREE.DirectionalLight(0xffffff, 0.75)
        this.axesHelper = new THREE.AxesHelper(500)
        // group that contains main object, wireframehelper, etc
        this.data = {}
        // end class variables



        this.renderer.setSize(window.innerWidth, window.innerHeight)
        document.body.appendChild(this.renderer.domElement)
        this.scene.background = new THREE.Texture
        this.resetCamera(30)
        this.scene.add(this.camLight)
        this.scene.add(this.axesHelper)
        //showGround()
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight
            this.camera.updateProjectionMatrix()
            this.renderer.setSize(window.innerWidth, window.innerHeight)
        }, false)

        this.animate()
    }

    resetCamera(length, center) {
        let pos = new THREE.Vector3(1, 1, 1).setLength(length)
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
        const self = this;
        requestAnimationFrame((function () {
            self.animate()
        }))
        this.controls.update()
        this.camLight.position.copy(this.camera.position)
        this.renderer.render(this.scene, this.camera)
    }


    isObjectShowing() {
        return this.data.group !== undefined
    }
    cleanup() {
        this.scene.remove(this.data.group)
        this.data = {}
    }

    showObject(obj) {
        console.log("viewer loading obj:", obj)
        if (this.isObjectShowing()) this.cleanup()

        this.data.geom = new THREE.Geometry().fromBufferGeometry(obj)
        // this.data.geom.applyMatrix(getMatrix())

        let bboxToCenter = function(o) {
            o.computeBoundingBox()
            let minX = o.boundingBox.min.x
            let minY = o.boundingBox.min.y
            let minZ = o.boundingBox.min.z
            let m = new THREE.Matrix4()
            m = m.premultiply(new THREE.Matrix4().makeTranslation(-minX, -minY, -minZ))
            return m
        }
        this.data.geom.applyMatrix(bboxToCenter(this.data.geom))


        this.data.group = new THREE.Group()
        this.data.obj = new THREE.Mesh(this.data.geom, new THREE.MeshPhongMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.5,
        }))
        this.data.group.add(this.data.obj)
        this.scene.add(this.data.group)

        // wireframeObj = new THREE.Mesh(this.data.geom, new THREE.MeshBasicMaterial({
        //     color: 0x000000,
        //     transparent: true,
        //     wireframe: true,
        //     opacity: 0.8,
        // }))


        // group.add(wireframeObj)

        // let bb = new THREE.Box3().setFromObject(mainObj)
        // normalsHelper = new THREE.FaceNormalsHelper(mainObj, bb.getSize(new THREE.Vector3()).length() / 20, 0x0000ff, 1)
        // group.add(normalsHelper)
        //
        this.data.geom.computeBoundingSphere()
        // computeObjectHeight()
        this.resetCamera(this.data.geom.boundingSphere.radius * 5, this.data.geom.boundingSphere.center)


        //slice()
    }



}

module.exports = Viewer

