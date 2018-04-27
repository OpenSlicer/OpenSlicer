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


function is2Manifold(geom) {
    let t = new Timer()
    let segs = []
    let vs = []


    geom.faces.forEach((f) => {
        let t = new THREE.Triangle(geom.vertices[f.a], geom.vertices[f.b], geom.vertices[f.c])
        // If two segments are equal this triangle is not even a triangle
        // If the triangle is degenerate it is not a valid 2-manifold
        if (t.getArea() === 0) {
            console.log("degenerate face:", t)
            return false
        }


        vs.push(t.a)
        vs.push(t.b)
        vs.push(t.c)

        segs.push(new THREE.Line3(t.a, t.b))
        segs.push(new THREE.Line3(t.b, t.c))
        segs.push(new THREE.Line3(t.c, t.a))

    })
    t.tick("foreach")

    segs.forEach(canonicalizeSegment)

    segs = segs.sort(cmpCanonicalSegment).filter((x, i, a) => i === 0 || cmpCanonicalSegment(a[i - 1], x) !== 0)
    t.tick("segs sort")
    vs = vs.sort(cmpPoint).filter((x, i, a) => i === 0 || cmpPoint(a[i - 1], x) !== 0)
    t.tick("vs sort")
    let euler = vs.length + geom.faces.length - segs.length
    console.log("vs", vs.length, "faces", geom.faces.length, "segs", segs.length, "euler:", euler)
    return euler === 2
}


module.exports = {
    binarySearch: binarySearch,
    cmpPoint: cmpPoint,
    cmpCanonicalSegment: cmpCanonicalSegment,
    cmpTriangle: cmpTriangle,
    is2Manifold: is2Manifold,
    canonicalizeSegment: canonicalizeSegment,
}