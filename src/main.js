// the new stuff
import ObjectLoader from './objectloader'
import Viewer from './viewer'
import Config from './config'
import GUI from './gui'


let options = {}
const objectLoader = new ObjectLoader()
const config = new Config()
const viewer = new Viewer({canvas: document.getElementById('canvas'), config: config})
const gui = new GUI(config)


function main() {
    objectLoader.on('objectLoaded', function (obj) {
        console.log("main: object loaded", obj)
        viewer.loadObject(obj)
    })

}

main()









