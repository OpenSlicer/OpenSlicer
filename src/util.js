let THREE = require('three')
let Timer = require('./timer')


function binarySearch(ar, el, compare_fn) {
    let m = 0
    let n = ar.length - 1
    while (m <= n) {
        let k = (n + m) >> 1
        let cmp = compare_fn(el, ar[k])
        if (cmp > 0) {
            m = k + 1
        } else if (cmp < 0) {
            n = k - 1
        } else {
            return k
        }
    }
    return -m - 1
}

// compares two THREE.Vector3 returning them in smallest X-Y-Z order
function cmpPoint(p1, p2) {
    if (p1.x !== p2.x) return p1.x - p2.x
    if (p1.y !== p2.y) return p1.y - p2.y
    return p1.z - p2.z
}

function cmpCanonicalSegment(l1, l2) {
    let a = cmpPoint(l1.start, l2.start)
    if (a !== 0) return a
    return cmpPoint(l1.end, l2.end)
}

function canonicalizeSegment(s) {
    if (cmpPoint(s.start, s.end) > 0) {
        [s.start, s.end] = [s.end, s.start]
    }
}

function cmpTriangle(t1, t2) {
    let t1s = [t1.a, t1.b, t1.c].sort(cmpSegment)
    let t2s = [t2.a, t2.b, t2.c].sort(cmpSegment)
    for (let i = 0; i < 3; i++) {
        let x = cmpSegment(t1s[i], t2s[i])
        if (x) return x
    }
    return 0
}

function loadUrl() {
    const url = options.loadUrl

    let loader = new STLLoader()

    fetch(url, {})
        .then(response => response.arrayBuffer())
        .then(buf => {
            originalGeom = loader.parse(buf)
            onObjectLoaded()

        })

}

function getQueryParam(param) {
    return new URLSearchParams(window.location.search).get(param)
}

function download(filename, content) {
    let blob = new Blob([content], {
        type: 'text/plain'
    })
    const a = document.createElement('a')
    document.body.appendChild(a)
    const url = window.URL.createObjectURL(blob)
    a.href = url
    a.download = filename
    a.click()
    setTimeout(() => {
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
    }, 0)
}

module.exports = {
    binarySearch: binarySearch,
    cmpPoint: cmpPoint,
    cmpCanonicalSegment: cmpCanonicalSegment,
    cmpTriangle: cmpTriangle,
    canonicalizeSegment: canonicalizeSegment,
    getQueryParam: getQueryParam,
    loadUrl: loadUrl,
    download: download,
}