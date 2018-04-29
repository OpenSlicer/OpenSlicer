After generating [contours](CONTOURS.md), if we ever want to print infills or perimeters we will need to get some
semantics into our contour segments and store them as a polygon hierarchy that represents a Surface.
We will also need a way to determine whether or not a point lies inside a polygon, and an algorithm to get the difference of two Surfaces.


We will call a Shape a single polygon with optional Holes (also polygons).
We will call a Surface a collection of Shapes that do not intersect.
We will call a Polygon a list of consecutive segments that have their inside on the right.

To print the outer perimeter we can simply move all segments of all Shapes in order.
To print inner perimeters we can simply offset the outer perimeter by the size of the nozzle.
We can calculate the offset of the whole surface by simply moving all segments to the right and cutting them off where they intersect with the next line. Some care needs to be taken though, in cases where there are holes.

So let's get started with the actual generation of the polygons.

We can generate the polygons in linear time and space with a radix sort on both of their vertices.
At this point the degree of all vertices must be even, no edges or vertices are shared between polygons and segments cannot intersect eachother.

To get a polygon from the segments, we will consider a simple algorithm:

```
function polygons (V)
    // V are vertices sorted on min x value, min y
    // and contain coordinates and edge information
    result = []
    
    while V not empty:
        prev = V.pop() // gets the vertex with min x, y
        seg = closest_to_top_clockwise(v)
        next = other_vertex(seg, prev)
        V.remove(seg)
        poly = [prev, next]
        
        while next is not poly[0]:
            seg = rightmost_segment(prev, next)
            next = other_vertex(seg, next)
            V.remove(seg)
            prev = next
            poly.push(next)
            
        result.push(poly)
        
    return result
 ```
 
This will return all polygons as clockwise, but we want holes to be counterclockwise.
To find holes we will construct a hierarchy of polygons.
 
 

  
