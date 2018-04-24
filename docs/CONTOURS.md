# Generating contours

To print an object we need to process it by layers, which are intersection of a horizontal plane with the input mesh.
The result will be a surface (a set of closed polygons with optional closed holes).

## Plane-Mesh intersection

Our mesh is represented as an unstructured set of triangles.
We will intersect our plane with each triangle individually to obtain all the points where the plane intersects the mesh.
To intersect a plane with a triangle we just intersect it with each of its sides and remove duplicate results.

<img width="350" alt="screen shot 2018-04-23 at 20 48 11" src="https://user-images.githubusercontent.com/4309591/39146723-dcf875d8-4737-11e8-994d-81ed17c98438.png">

When intersecting a plane with a triangle we can get the following results:

- No intersection
- Vertex intersection
- Segment intersection
- Triangle is coplanar (horizontal)

If there is no intersection or a single vertex intersection we will ignore it. If the triangle is coplanar we will also ignore it (more on this later).

The intersection that produces a **segment** has three cases:

<img width="150" alt="a" src="https://user-images.githubusercontent.com/4309591/39151155-ad97fde2-4744-11e8-847c-7f75e352b6ff.png"><img width="150" alt="b" src="https://user-images.githubusercontent.com/4309591/39151156-adb3101e-4744-11e8-93c1-188778fca1b2.png"><img width="150" alt="c" src="https://user-images.githubusercontent.com/4309591/39151157-add23ee4-4744-11e8-978e-eb0a2e4646c8.png">

If we keep the intersection segment of each triangle in the mesh, we will get the following result:

<img width="350" alt="cube" src="https://user-images.githubusercontent.com/4309591/39151607-0001e1fa-4746-11e8-82bc-1519868c6e4c.png">

Let's consider a bit more complex geometry, the difference of two cuboids, and let's intersect it at its top:

<img width="349" alt="cubes" src="https://user-images.githubusercontent.com/4309591/39152919-1ac54b72-474a-11e8-8cfc-f485ca9e8f13.png">

This also shows why we ignore coplanar faces. All edges that we want in the contour will also be part of a non-coplanar triangle. (The edges of the triangle that we don't want in the resulting contour are exactly the edges that are shared with another coplanar triangle).

There is a problem with this approach, however. Not always all of these segments will be part of the contour we want:

<img width="700" alt="problem" src="https://user-images.githubusercontent.com/4309591/39153565-cb176d1a-474b-11e8-949f-c847661bd4be.png">

In the mesh on the left the intersection is actually the full square. How can we solve this? Let's ask Bolzano. And let's solve this in 2D first and generalize for 3D later.

If we want to slice this object we will at some point need to intersect the contour polygons with lines.
Let's consider two very simple polygons:

<img width="709" alt="screen shot 2018-04-23 at 23 51 28" src="https://user-images.githubusercontent.com/4309591/39155198-47313606-4751-11e8-937a-7ea4a5e9c488.png">

Our objective here is to determine the intersection points (or, in case of a colinear segment, both of its vertices).
With them we can then label the line with inside or outside segments.
To do this we simply sort the intersection points and mark segments between odd and even vertices as "inside".
We can see that for the green line there will be no problems.
The **blue line**, in the left polygon, starting at the top, when it intersects the vertex we know that it will go from outside to inside because it has a segment on each side of it (that is, the cross product of the line with each of the segments have opposite direction). Next it will intersect another vertex, this time going from inside to outside of the shape. It will cross the polygon once more.

The **red line** has some more trouble to it, since it contains a section where it is colinear with a segment. We consider colinear segments to always be part of the polygon. Since we're on the edge of a polygon, one side will be inside and the other will be outside. We can easily see which side is in by looking at the other segment that starts at the same vertex. For example, with our red line we are entering the polygon on the leftmost vertex, and the other segment goes to the right of our red line, so the polygon's inside will be on the right. It is impossible to be on the left of the segment because we would already be inside. When we arrive at our end vertex, since we know which side is inside, we can know whether we continue in the polygon or not.

Notice how we did not need the normals of the polygon's segments. The same is true when we generalize to 3D. Going back to our cuboids from before, we can see that in the left one, when we intersect the plane and arrive at one of the faces of the outer contour, we will find that non-coplanar faces on the contour go down, so volume of the model is below the plane. (We can also know this because the normals of the faces points up). On the inner loop the faces go up, so we are still in the model, and the inner loop can be completely removed.

All of this will work nicely with single or multiple non-intersecting valid 2-manifolds (and even with some non-manifolds, but those are beyond the scope of this document).




