// the new stuff
import ObjectLoader from './objectloader'
import Viewer from './viewer'
import Config from './config'
import Slicer from './slicer'
import GUI from './gui'
import EventEmitter from 'events'


const emitter = new EventEmitter()

const objectLoader = new ObjectLoader({
    emitter: emitter,
})

const config = new Config({
    emitter: emitter,
})

const slicer = new Slicer({
    config: config,
    emitter: emitter,
})

const viewer = new Viewer({
    canvas: document.getElementById('canvas'),
    slicer: slicer,
    config: config,
    emitter: emitter
})

const gui = new GUI({
    config: config,
    emitter: emitter,
})


function main() {
    emitter.on('objectLoaded', function (obj) {
        console.log("main: object loaded", obj)
        viewer.loadObject(obj)
    })

}

main()









