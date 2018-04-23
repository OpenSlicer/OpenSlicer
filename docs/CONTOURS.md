# Generating contours

To print an object we need to process it by layers, which are intersection of a horizontal plane with the input mesh.
The result will be a surface (a set of closed polygons with optional closed holes).

## Plane-Mesh intersection

Our mesh is represented as an unstructured set of triangles.
We will intersect our plane with each triangle individually to obtain all the points where the plane intersects the mesh.

<img width="347" alt="screen shot 2018-04-23 at 20 48 11" src="https://user-images.githubusercontent.com/4309591/39146723-dcf875d8-4737-11e8-994d-81ed17c98438.png">


