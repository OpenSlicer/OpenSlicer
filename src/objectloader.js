const EventEmitter = require('events')
const STLLoader = require('./vendor/STLLoader')


let ObjectLoader = class extends EventEmitter {

    constructor(options = {}) {
        super()

        console.log("objectLoader constructor, options = ", options)

        document.addEventListener('dragover', ev => {
            ev.preventDefault()
        })

        document.addEventListener('drop', (ev) => {
            ev.stopPropagation()
            ev.preventDefault()

            this.loadSTL(ev.dataTransfer.files)
        }, false)

        document.getElementById('fileinput').addEventListener('change', (ev) => {
            console.log('ev', ev)
            this.loadSTL(ev.target.files)
        })
    }


    loadSTL(files) {
        let loader = new STLLoader()
        if (files.length === 0) {
            return
        }
        let file = files[0]
        let reader = new FileReader()
        reader.addEventListener('load', ev => {
            let buffer = ev.target.result
            let geom = loader.parse(buffer)
            this.emit('objectLoaded', geom)

        }, false)
        reader.readAsArrayBuffer(file)
    }


}


module.exports = ObjectLoader

