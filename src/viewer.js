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
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 5000)
        this.controls = new OrbitControls(this.camera, this.canvas)
        this.controls.maxPolarAngle = Math.PI/2;

        this.camLight = new THREE.DirectionalLight(0xffffff, 0.75)
        this.axesHelper = new THREE.AxesHelper(125)
        // group that contains main object, wireframehelper, etc
        this.data = {}
        // end class variables

        this.scene.background = new THREE.Color(0xeeeeee)

        this.scene.add(new THREE.AmbientLight(0x000000))

        // add some lights
        this.addPointLight(0, 200, 0)
        this.addPointLight(100, 200, 100)
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
        let pointLight = new THREE.PointLight(0xffffff, 1.5, 0)
        pointLight.position.set(x, y, z)
        this.scene.add(pointLight)

        let sphereSize = 10
        let pointLightHelper = new THREE.PointLightHelper(pointLight, sphereSize, 0xff0000)
        this.scene.add(pointLightHelper)
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
        const self = this
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
        this.scene.remove(this.data.mirror)
        this.data = {}
    }

    showObject(obj) {
        console.log("viewer loading obj:", obj)
        if (this.isObjectShowing()) this.cleanup()

        this.data.geom = new THREE.Geometry().fromBufferGeometry(obj)
        // this.data.geom.applyMatrix(getMatrix())

        let bboxToCenter = function (o) {
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

    // updateVisibility(options) {
    // mainObj.visible = !options.wireframe
    // wireframeObj.visible = options.wireframe
    // normalsHelper.visible = options.normals
    // axesHelper.visible = options.axesHelper
    //
    // if (currentLayer.extrusionLines) currentLayer.extrusionLines.visible = options.extrusionLines
    // if (currentLayer.points) currentLayer.points.visible = options.points
    // if (currentLayer.contourLines) currentLayer.contourLines.visible = options.contours
    //
    // if (currentLayer.extrusionLines) currentLayer.extrusionLines.material.linewidth = (options.nozzleSize * 10) ^ 2 * 0.9
    // //console.log("line width:", 0.9 * options.nozzleSize * 10)
    // if (currentLayer.extrusionLines) currentLayer.extrusionLines.material.needsUpdate = true
    // }

    // function getMatrix() {
    //     let m = new THREE.Matrix4()
    //
    //     m = m.premultiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2))
    //     m = m.premultiply(new THREE.Matrix4().makeRotationX(options.rotation.x / 180 * Math.PI))
    //     m = m.premultiply(new THREE.Matrix4().makeRotationY(options.rotation.y / 180 * Math.PI))
    //     m = m.premultiply(new THREE.Matrix4().makeRotationZ(options.rotation.z / 180 * Math.PI))
    //     m = m.premultiply(new THREE.Matrix4().makeScale(options.scale.x, options.scale.y, options.scale.z))
    //
    //     return m
    // }


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


}

module.exports = Viewer

