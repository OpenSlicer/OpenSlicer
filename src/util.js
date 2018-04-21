let THREE = require('three')


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
function compareVector3(p1, p2) {
    if (p1.x !== p2.x) return p1.x - p2.x
    if (p1.y !== p2.y) return p1.y - p2.y
    if (p1.z !== p2.z) return p1.z - p2.z
    return 0
}

function compareLine3(l1, l2) {
    let start = compareVector3(l1.start, l2.start)
    if (start !== 0) return start
    return compareVector3(l1.end, l2.end)
}

function segment3Equals(l1, l2) {
    return l1.equals(l2) || new THREE.Line3(l1.end, l1.start).equals(l2)
}


module.exports = {
    binarySearch: binarySearch,
    compareVector3: compareVector3,
    compareLine3: compareLine3,
    segment3Equals: segment3Equals,
}