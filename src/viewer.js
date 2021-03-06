const THREE = require('three')
const OrbitControls = require('./vendor/OrbitControls')


const Viewer = class {

    constructor(options = {}) {
        console.log("Viewer constructor, options =", options)
        if (!options.canvas) throw new Error("Canvas element is mandatory")

        this.config = options.config
        this.slicer = options.slicer
        this.emitter = options.emitter

        this.emitter.on('matrixChange', () => this.onMatrixChange())
        this.emitter.on('viewChange', () => this.updateVisibilityConfig())
        this.emitter.on('resetCamera', () => this.resetCamera())
        this.emitter.on('currentLayerChange', (layerNumber) => this.showLayer(layerNumber))

        // this.emitter.on('layerPerimetersFinished',
        //     () => this.updateLinesGroup('perimeters', this.slicer.perimeters[this.slicer.layer], 0xff0000))
        // this.emitter.on('layerSolidFinished',
        //     () => this.updateLinesGroup('solid', this.slicer.solid[this.slicer.layer], 0xffff00))

        this.emitter.on('showPoint', (v) => {
            let dotGeometry = new THREE.Geometry()
            dotGeometry.vertices.push(v)
            let dotMaterial = new THREE.PointsMaterial({size: 3, sizeAttenuation: false})
            let dot = new THREE.Points(dotGeometry, dotMaterial)
            this.scene.add(dot)
        })

        this.emitter.on('showPlane', (p, s = 100) => {
            this.scene.add(new THREE.PlaneHelper(p, s, 0xffff00))
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

        this.addPointLight(50, 200, -100)
        this.addPointLight(-0, 200, 200)
        this.addPointLight(200, 300, 250)

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
        const size = this.config.bedSize
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
        let pos = new THREE.Vector3(1, 0.3, 1).setLength(400)
        this.controls.object.position.set(pos.x, pos.y, pos.z)
        this.controls.update()
        if (center === undefined) {
            this.controls.target.set(this.config.bedSize / 2, 0, this.config.bedSize / 2)
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


        this.config.numLayers = Math.floor(this.data.geom.boundingBox.max.y / this.config.layerHeight)
        this.emitter.emit('numLayersChanged', this.config.numLayers)
    }

    renderObject() {
        let startTime = new Date().getTime()

        if (this.isObjectRendered()) this.cleanupObject()
        //this.data.geom = new THREE.Geometry().fromBufferGeometry(this.obj)
        this.data.geom = this.slicer.prepareGeometry(this.obj)
        console.log("RenderObject time A", new Date().getTime() - startTime, "ms")


        let bboxToCenter = (o) => {
            o.computeBoundingBox()
            let minX = o.boundingBox.min.x
            let minY = o.boundingBox.min.y
            let minZ = o.boundingBox.min.z
            let m = new THREE.Matrix4()
            m = m.premultiply(new THREE.Matrix4().makeTranslation(-minX, -minY, -minZ))
            m = m.premultiply(new THREE.Matrix4().makeTranslation(this.config.bedSize / 2, 0, this.config.bedSize / 2))
            let half = o.boundingBox.max.clone().sub(o.boundingBox.min)
            m = m.premultiply(new THREE.Matrix4().makeTranslation(-half.x / 2, 0, -half.z / 2))
            return m
        }
        console.log("RenderObject time B", new Date().getTime() - startTime, "ms")

        // Matrix calculation
        let m = new THREE.Matrix4()
        m = m.premultiply(new THREE.Matrix4().makeScale(this.config.scale.x, this.config.scale.y, this.config.scale.z))
        m = m.premultiply(new THREE.Matrix4().makeRotationX(this.config.rotation.x / 180 * Math.PI))
        m = m.premultiply(new THREE.Matrix4().makeRotationY(this.config.rotation.y / 180 * Math.PI))
        m = m.premultiply(new THREE.Matrix4().makeRotationZ(this.config.rotation.z / 180 * Math.PI))
        this.data.geom.applyMatrix(m)

        console.log("RenderObject time C", new Date().getTime() - startTime, "ms")

        m = bboxToCenter(this.data.geom)
        m = m.premultiply(new THREE.Matrix4().makeTranslation(this.config.translation.x, 0, this.config.translation.z))
        this.data.geom.applyMatrix(m)

        console.log("RenderObject time D", new Date().getTime() - startTime, "ms")

        this.data.group = new THREE.Group()
        this.data.obj = new THREE.Mesh(this.data.geom, new THREE.MeshPhongMaterial({
            color: 0x2194ce,
            specular: 0x111111,
            side: THREE.DoubleSide,
            shininess: 10,
        }))
        this.data.group.add(this.data.obj)
        this.scene.add(this.data.group)

        console.log("RenderObject time E", new Date().getTime() - startTime, "ms")

        this.data.mirror = this.data.group.clone()
        this.data.mirror.scale.y = -1
        this.scene.add(this.data.mirror)

        this.data.geom.computeBoundingSphere()


        console.log("RenderObject time F", new Date().getTime() - startTime, "ms")

        // update visibility of wireframe, etc
        this.updateVisibilityConfig()

        console.log("RenderObject time", new Date().getTime() - startTime, "ms")
        this.emitter.emit('readyForSlice')
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

    updateVisibilityConfig() {
        if (!this.isObjectRendered()) return

        this.data.mirror.visible = !this.config.wireframe && this.config.viewObject
        this.data.obj.visible = this.config.viewObject
        this.data.obj.material.wireframe = !!this.config.wireframe
        this.axesHelper.visible = !!this.config.axesHelper


        if (this.data.infill) this.data.infill.visible = !!this.config.viewSolid
        if (this.data.perimeters) this.data.perimeters.visible = !!this.config.viewPerimeters
    }

    showLayer(n) {
        //this.updateLinesGroup('perimetersOld', this.slicer.perimeters[n], 0xff0000)
        this.updateLinesGroupW('perimeters', this.slicer.perimeters[n], 0xff0000)
        this.updateLinesGroupW('solid', this.slicer.infill[n], 0xffff00)
        this.updateVisibilityConfig()
    }

    updateLinesGroupW(obj, segs, color, randomizeColors = false) {
        if (!this.isObjectRendered()) return
        //console.log("Updating lines group", obj)

        let geom = new THREE.Geometry()
        if (this.data[obj]) {
            this.data.group.remove(this.data[obj])
            //geom.colors = this.data[obj].geometry.colors
            //geom.vertices = this.data[obj].geometry.vertices
        }
        if (!segs || !segs.length) return
        this.data[obj] = new THREE.Group()


        //console.log('drawing', segs.length, 'lines')
        for (let segment of segs) {
            let material = new THREE.MeshBasicMaterial({
                color: randomizeColors ? new THREE.Color(Math.random(), Math.random(), Math.random()) : color,
            })
            let len = segment.start.distanceTo(segment.end)

            let vec = segment.end.clone(new THREE.Vector3()).sub(segment.start)

            let geometry = new THREE.BoxGeometry(this.config.nozzleDiameter, this.config.layerHeight, len)
            geometry.translate(0, 0, len / 2)
            geometry.rotateY(Math.atan2(vec.x, vec.z))
            let mesh = new THREE.Mesh(geometry, material)
            geometry.translate(segment.start.x, segment.start.y, segment.start.z)
            this.data[obj].add(mesh)
        }

        this.data.group.add(this.data[obj])
    }

    // updateLinesGroupOld(obj, segs, color, randomizeColors = false) {
    //     if (!this.isObjectRendered()) return
    //     console.log("Updating lines group", obj)
    //
    //     let geom = new THREE.Geometry()
    //     if (this.data[obj]) {
    //         this.data.group.remove(this.data[obj])
    //         //geom.colors = this.data[obj].geometry.colors
    //         //geom.vertices = this.data[obj].geometry.vertices
    //     }
    //
    //     let material = new THREE.LineBasicMaterial({
    //         color: randomizeColors ? 0xfffffff : color,
    //     })
    //     if (randomizeColors) {
    //         material.vertexColors = THREE.VertexColors
    //     }
    //
    //     if (!segs || !segs.length) return
    //     console.log('drawing', segs.length, 'lines')
    //     for (let segment of segs) {
    //         let c = new THREE.Color(Math.random(), Math.random(), Math.random())
    //         geom.colors.push(c)
    //         geom.colors.push(c)
    //         geom.vertices.push(segment.start)
    //         geom.vertices.push(segment.end)
    //     }
    //
    //
    //     this.data[obj] = new THREE.LineSegments(geom, material)
    //     this.data.group.add(this.data[obj])
    // }


}

module.exports = Viewer

