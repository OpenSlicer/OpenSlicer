// the new stuff
import ObjectLoader from './objectloader'
import Viewer from './viewer'
import GUI from './gui'


let options = {}
const objectLoader = new ObjectLoader()
const viewer = new Viewer({canvas: document.getElementById('canvas')})
const gui = new GUI(options)


function main() {
    objectLoader.on('objectLoaded', function (obj) {
        console.log("main: object loaded", obj)
        viewer.showObject(obj)
    })

}

main()









