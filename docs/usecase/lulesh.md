# Using ParaView Catalyst in Hydrodynamics Simulations

The Livermore Unstructured Lagrangian Explicit Shock Hydrodynamics (LULESH) code serves as a benchmark for hydrocodes like ALE3D, modeling shock physics using discretized hydrodynamic equations over unstructured meshes. It captures the essential computational patterns and challenges involved in simulating shock wave propagation and high-strain-rate material behavior.

<figure>
  <video control loop autoplay>
    <source src="/assets/images/usecase/gallery/lulesh.mp4" alt="Lulesh Simulation">
  </video>
  <figcaption>ParaViewCatalyst coupled with LULESH 
for the  Simulation of a Sedov blast problem via known analytic solutions on a 50x50x50 domain.
The blast originates from one of the corners of the domain and expands radially.
The above figure is colored by the pressure as reported by LULESH on each of the cells.</figcaption>
</figure>

Rather than relying on traditional structured grids, LULESH employs an unstructured hexahedral mesh, using indirection arrays to manage mesh topology and element connectivity. This design choice mirrors real-world production codes and introduces the kind of memory access patterns, data dependencies, and parallelism challenges that simulation developers routinely face in high-performance computing environments.

To handle visualization at scale, LULESH integrates ParaView Catalyst for in situ analysis, enabling developers to observe the evolution of shock fronts, material boundaries, and deformation patterns as the simulation runs—without the performance hit of writing massive datasets to disk. This real-time feedback loop is particularly valuable for performance tuning, algorithm validation, and debugging of complex simulation workflows.

You can find more information about this effort [here](https://asc.llnl.gov/codes/proxy-apps/lulesh).
