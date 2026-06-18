# What is ParaView Catalyst?

ParaView Catalyst lets you run visualization and analysis pipelines inside your simulation while it's running, instead of writing data to disk and post-processing later. Your simulation passes its mesh and field data to Catalyst at each timestep. Catalyst hands that data to a ParaView-based backend that runs whatever analysis you've configured (rendering images, extracting features, computing statistics, writing reduced datasets) then returns control to your simulation.

## The Five API Calls

Your simulation interacts with Catalyst through five C functions (with C++, Python, and Fortran wrappers):

- **`catalyst_initialize`**: Load pipeline scripts and configure the backend. Called once at startup.
- **`catalyst_execute`**: Pass mesh and field data for one timestep. Called every iteration (or as often as you choose).
- **`catalyst_results`**: Read back values produced by the pipeline (e.g., corrected fields for closed-loop workflows). Called after execute when the simulation needs output from the analysis.
- **`catalyst_finalize`**: Shut down Catalyst and free resources. Called once at the end.
- **`catalyst_about`**: Query version and capability information.

Each function takes a [Conduit](https://llnl-conduit.readthedocs.io/en/latest/) node as its argument.

## How Data Flows

Your simulation owns its data. The adaptor describes the memory layout to Catalyst using a Conduit node, typically with `set_external`, which passes pointers without copying. Catalyst routes that description to the ParaView backend, which builds VTK data objects from the pointers and runs the pipeline. Results (images, meshes, statistics, or field corrections) are produced without the simulation ever writing full timestep data to disk.

![Catalyst Solution](/assets/images/guide/concepts/concept-solution.png)

## Conduit and Mesh Blueprint

[Conduit](https://llnl-conduit.readthedocs.io/en/latest/) is the data description layer, developed by Lawrence Livermore National Laboratory. It provides a lightweight hierarchical container, essentially a runtime JSON structure that can hold pointers to your simulation's existing arrays. You don't copy data into Conduit; you describe where it already lives in memory.

[Mesh Blueprint](https://llnl-conduit.readthedocs.io/en/latest/blueprint_mesh.html) is the schema that both sides agree on. It defines conventions for representing coordinate sets, topologies (structured, unstructured, polyhedral), and fields. When your adaptor writes `mesh["topologies/mesh/type"] = "unstructured"`, the ParaView backend knows exactly how to interpret the connectivity array that follows.

## Channels

A channel is a named data port. Most simulations use a single channel (e.g., "grid"), but you can define multiple channels to separate different mesh regions. For example, a "volume" channel for the full 3D field and a "surface" channel for boundary data. Each channel carries its own Conduit node with its own coordinate set, topology, and fields.

## The Runtime Loading Model

Your simulation links against `libcatalyst` at build time, a small stub library with no ParaView dependency. At runtime, `catalyst_initialize` loads the actual backend (e.g., `libcatalyst-paraview.so`) via dynamic loading, based on environment variables or Conduit node metadata. This means your simulation binary has no compile-time dependency on ParaView, and you can swap backends or run without one entirely, without rebuilding.

## Pipeline Scripts

The analysis to run at each timestep is defined in Python scripts that implement `catalyst_execute(info)`. You point Catalyst to these scripts at initialize time, either through the Conduit node or via command-line arguments in your adaptor. The scripts use the full ParaView Python API, so anything you can do interactively in ParaView, you can do in a Catalyst pipeline script.

You can write scripts by hand or generate them from the ParaView GUI using **File → Save Catalyst State**, which captures your current pipeline and extractors as a ready-to-use Catalyst script.

## Why In Situ?

In conventional post-processing, the simulation writes timestep data to disk so that visualization tools can process it after the run completes. This creates two problems: I/O is orders of magnitude slower than computation, and the resulting files are large enough that users typically save only a fraction of the timesteps they'd like to analyze.

![I/O Bottleneck](/assets/images/guide/concepts/concept-bottleneck.png)

The in situ approach removes the bottleneck by performing analysis on data that is already in memory. The simulation still produces outputs (images, reduced datasets, extracted features) but these are far smaller than full timestep dumps. More timesteps can be analyzed in less time.

![I/O Solution](/assets/images/guide/concepts/concept-io.png)

<figure>
    <video control loop autoplay>
        <source src="/assets/images/guide/concepts/CatalystBallVideo1.mp4" alt="Rolling Ball Simulation">
    </video>
    <figcaption>Comparing traditional post-processing (left) to in situ visualization using ParaView Catalyst (right).</figcaption>
</figure>
