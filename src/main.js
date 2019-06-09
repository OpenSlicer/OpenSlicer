// the new stuff
import ObjectLoader from './objectloader'
import Viewer from './viewer'
import Config from './config'
import Slicer from './slicer'
import GUI from './gui'


const objectLoader = new ObjectLoader()
const config = new Config()

const slicer = new Slicer({
    config: config,
})

const viewer = new Viewer({
    canvas: document.getElementById('canvas'),
    config: config,
    slicer: slicer,
})
const gui = new GUI(config)


function main() {
    objectLoader.on('objectLoaded', function (obj) {
        console.log("main: object loaded", obj)
        viewer.loadObject(obj)
    })

}

main()









