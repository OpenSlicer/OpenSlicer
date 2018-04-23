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



