# Using ParaView Catalyst in Rotorcraft Simulations

Rotorcraft simulations—such as those modeling helicopters—are among the most challenging in computational fluid dynamics (CFD) due to their inherently unsteady, vortex-dominated flow environments. As rotor blades rotate, they interact with their own wakes, leading to highly cyclic behavior that complicates both analysis and setup. Analysts must contend with additional nonlinearities such as reverse flow, compressibility effects, yawed inflow, and persistent flow separation. These complexities make it especially difficult to specify accurate initial conditions, often requiring multiple blade revolutions before transient effects decay and meaningful results can be extracted.

<figure>
    <video control loop autoplay>
        <source src="/assets/images/usecase/gallery/rotatingwithplane.mp4" alt="Rotorcraft Video 1">
    </video>
    <figcaption></figcaption>
</figure>

Worsening the challenge is the sheer size and duration of these simulations, which makes traditional post hoc analysis increasingly impractical. On HPC systems, the disparity between compute performance and I/O bandwidth becomes a major bottleneck. Loading terabytes of data from disk for post-processing isn’t just slow—it’s often infeasible.

<figure>
    <video control loop autoplay>
        <source src="/assets/images/usecase/gallery/rotatingwithplane2.mp4" alt="Rotorcraft Video 2">
    </video>
    <figcaption></figcaption>
</figure>

To address this, simulation frameworks like HELIOS are integrating in situ computation with ParaView Catalyst. By embedding visualization and analysis directly into the simulation loop, Catalyst eliminates the need to write out full datasets, enabling developers and analysts to inspect critical variables at every timestep—without costly I/O or storage overhead. This approach not only maximizes HPC resource efficiency but also opens the door to real-time steering, rapid validation, and smarter diagnostics during long-running simulations.