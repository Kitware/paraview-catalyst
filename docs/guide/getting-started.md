# Getting Started with ParaView Catalyst

## Prerequisites

Building ParaView Catalyst will require the following libraries/tools:
- [CMake](https://cmake.org/download/) 3.13 or later - for managing the build process used by both Catalyst and ParaView
- [NumPy](https://numpy.org) - used by Catalyst when dealing with Python wrapping
- [MPI](https://www.open-mpi.org)
- [Ninja](https://ninja-build.org) - build system tool.  Not required but highly recommended.
- [TBB](https://www.intel.com/content/www/us/en/developer/tools/oneapi/onetbb.html#gs.kmqn38) - Threaded Building Blocks Library (Recommended)
- Python 3.x

Note to Mac developers: All of the above software is available using Homebrew.

## Building Catalyst

The first step is to build the Catalyst library that will provide the means of representing the data that can then be processed by various consumer implementations such as ParaView Catalyst.  This is also the library that you will be using within your code so that you can pass the relevant information to the various Catalyst implementations.

To checkout the Catalyst source you can use the following git command:

```bash
git clone https://gitlab.kitware.com/paraview/catalyst.git
```

You can use the following commands  to configure and build Catalyst with MPI and Python Wrapping which we will need for the ParaView Catalyst Examples:

```bash
# The following exports are used for convenience
export CATALYSTSRC=[the path to where you checked-out Catalyst's source]
export CATALYSTBUILD=[the path to the Catalyst build directory]

cmake -S $CATALYSTSRC -B $CATALYSTBUILD -G Ninja -DCATALYST_USE_MPI=ON -DCATALYST_WRAP_PYTHON=ON
cmake --build $CATALYSTBUILD
```

__Note:__ `-G Ninja` assumes that you have the [Ninja build system](https://ninja-build.org).  Also you can choose to build Catalyst without MPI support by setting ``-DCATALYST_USE_MPI=OFF`` and without Python wrappings by setting ``-DCATALYST_WRAP_PYTHON = OFF``

You can find additional build instructions for Catalyst [here](https://catalyst-in-situ.readthedocs.io/en/latest/build_and_install.html).


## Building ParaView Catalyst

The next step is to build the ParaView Catalyst implementation.  The first step is to download ParaView’s source code.  You can access it either  from [ParaView’s download page](https://www.paraview.org/download/) or by checking out the code from [ParaView’s gitlab repository](https://gitlab.kitware.com/paraview/paraview).

__Note:__ If you are using the download page make sure you are downloading the source files and not one of the pre-compiled versions of ParaView.

Next we need to create a build directory for ParaView,  configure it for ParaView Catalyst, and build it using the following commands:

```bash
mkdir [name of ParaView Build Directory]
cd  [name of ParaView Build Directory]
ccmake -G Ninja -DPARAVIEW_USE_PYTHON=ON -DPARAVIEW_USE_MPI=ON -DVTKSMP_IMPLEMENTATION_TYPE=TBB -DCMAKE_BUILD_TYPE=Release -DPARAVIEW_ENABLE_CATALYST=ON -DPARAVIEW_BUILD_QT_GUI=OFF -Dcatalyst_DIR=[path to Catalyst Build Directory]  [path to the ParaView Source Directory]
cmake --build .
```

## Building An Example

OK, so you now have all of the pieces built required to interface with your simulation code and to use ParaView’s post-processing power so let's verify this with an example in the ParaView source directory.  For brevity lets define the following environment variables:

```bash
export PVSOURCE=[the path to the ParaView source code]
export PVBUILD=[the path to the ParaView build directory]
export CATALYSTBUILD=[the path to the Catalyst build directory]
```

__Note:__ These variables are not used by the example, but are used for convenience.

You can access the Catalyst Examples source code by doing the following:
```bash
git clone https://gitlab.kitware.com/catalyst-examples.git
cd catalyst-examples/ParaView
```

The source for the example we will be using is in the `CxxUnstructuredGrid` directory.  This example generates data in the form of an unstructured mesh of hexahedra.

To build the example, do the following:

```bash
mkdir cxxFullExampleBuild
cd cxxFullExampleBuild
cmake -G Ninja -DCMAKE_PREFIX_PATH=$CATALYSTBUILD -DParaView_DIR=$PVBUILD -DParaView_CATALYST_DIR=$PVBUILD/lib/catalyst ../CxxUnstructuredGrid
cmake --build .
```

What you have built is a trivial data generator that creates a zero-copy representation of its data in Catalyst.  It has also created six example input files that can be used to try out different ways of using ParaView Catalyst.  Three of them are in JSON format and three are in YAML format.  Each file creates node in the Conduit graph that is then used to used to initialize Catalyst.

### Running a Simple Pipeline

Lets start with running a simple pipeline that simply inspects the data being passed to the ParaView Catalyst implementation from the data generator.  First lets look at the *catalyst_pipeline.json* that was created when you built the example.

```json
{
	"catalyst": {
     	"scripts": {
         	"script": {
             	"filename": "/Users/bob.obara/Projects/Kitware/CatalystExamples/ParaView/CxxUnstructuredGrid/catalyst_pipeline.py"
              }
          },
          "python_path" : "/Users/bob.obara/Projects/Kitware/Builds/Catalyst_XC16.2_CM3.31.6/lib/cmake/catalyst-2.0/../../../lib/python3.13/site-packages"
 	},
    "catalyst_load": {
    	"implementation": "paraview",
        "search_paths": {
        	"paraview": "/Users/bob.obara/Projects/Kitware/Builds/ParaView_noQt_XC16.2_CM3.31.6/lib/catalyst"
         }
    }
}
```

The file describes the structure of two Conduit nodes:

* catalyst node which specifies the following:
  * Name of the Catalyst Python script that should be applied to the data being sent from the simulation/data generator(which is located in the catalyst-examples/ParaView/CxxUnstructuredGrid source directory).
  * Python path for wrapped libraries for Catalyst itself.  Note that this is only needed if your Python script calls Catalyst functions with this script does call.
* catalyst_load node which specifies the following:
  * Catalyst implementation to be used - this specifies the Catalyst back-end to be used.  In this case we are using the ParaView Catalyst back-end.
  * Search Path - for the specified back-end you need to indicate where the shared libraries are located.

Here is a corresponding YAML version of the file that specifies the exact same information:

```yaml
  catalyst:
    scripts:
      script:
        # Filename refers to the ParaView Catalyst Pipeline to be used
        filename: "/Users/bob.obara/Projects/Kitware/CatalystExamples/ParaView/CxxUnstructuredGrid/catalyst_pipeline.py"
    # This should be set where Catalyst's Python wrappers are located
    python_path: "/Users/bob.obara/Projects/Kitware/Builds/Catalyst_XC16.2_CM3.31.6/lib/cmake/catalyst-2.0/../../../lib/python3.13/site-packages"

  catalyst_load:
    implementation: paraview
    search_paths:
      # This should be set to the directory where the ParaView Catalyst Libraries are located
      paraview: "/Users/bob.obara/Projects/Kitware/Builds/ParaView_noQt_XC16.2_CM3.31.6/lib/catalyst"

```

Now lets run the example with this input file:

```bash
./bin/CxxUnstructuredGrid catalyst_pipeline.json
```

__Note:__  You can also pass in the catalyst_pipeline.yaml instead.

What you should see is basic information outputted from ParaView processing the different time steps from the data generator.  Below is the output for the first timestep.

```
-----------------------------------
executing (cycle=0, time=0.0)
bounds: (0.0, 69.0, 0.0, 64.9, 0.0, 55.9)
velocity-magnitude-range: (0.0, 0.0)
pressure-range: (1.0, 1.0)
node=
catalyst:
  state:
    timestep: 0
    time: 0.0
    multiblock: 1
  channels:
    grid:
      type: "mesh"
      data:
        coordsets:
          coords:
            type: "explicit"
            values:
              x: [0.0, 0.0, 0.0, ..., 69.0, 69.0]
              y: [0.0, 0.0, 0.0, ..., 64.9, 64.9]
              z: [0.0, 1.3, 2.6, ..., 54.6, 55.9]
        topologies:
          mesh:
            type: "unstructured"
            coordset: "coords"
            elements:
              shape: "hex"
              connectivity: [0, 2640, 2684, ..., 184799, 182159]
        fields:
          velocity:
            association: "vertex"
            topology: "mesh"
            volume_dependent: "false"
            values:
              x: [0.0, 0.0, 0.0, ..., 0.0, 0.0]
              y: [0.0, 0.0, 0.0, ..., 0.0, 0.0]
              z: [0.0, 0.0, 0.0, ..., 0.0, 0.0]
          pressure:
            association: "element"
            topology: "mesh"
            volume_dependent: "false"
            values: [1.0, 1.0, 1.0, ..., 1.0, 1.0]

```

### Taking a Closer Look
Lets examine the files used in this example.

#### CatalystAdaptor.h

When you want to use any Catalyst you typically need to call three main Catalyst functions:

- __catalyst_initialize__ - this function must be called once to initialize Catalyst using the supplied metadata
- __catalyst_finalize__ - this function must be called once to finalize Catalyst
- __catalyst_execute__ - this function is called for every timestep as the simulation advances

The `CatalystAdaptor.h` file provides functions that wrap the above functions to help with properly setting the necessary metadata.  For example, the CatalystAdaptor::Execute method properly sets up the Catalyst node hierarchy based on the simulation data.

#### FEDataStructures.h, .cxx

This class defines the data structures used to represent a hexahedral  mesh with velocity and pressure fields.

#### FEDriver.cxx

This is the main program of the example and is analogous to the simulation.  It sets up the mesh and fields for 10 timesteps and makes the appropriate calls to the CatalystAdaptor.

#### catalyst_pipeline.py

This defines a simple ParaView pipeline that is used to process the FEDriver data each time CatalystAdapter::Execute is called.

## Changing the Catalyst Script

Now lets see what happens if all we do is change the specified script to generate images based on the data being generated.  To do this, simply change the execution line to be:

```bash
./bin/CxxUnstructuredGrid catalyst_pipeline_with_rendering.json
```

Now instead of simply showing output on the screen, it has generated images for each time step and placed them in datasets sub-directory of the example’s build directory.  Combining these images together results in the following short video comprising of 5 time-steps.

__Note:__ If you compare this input file with the one used previously you will notice that the only difference is the Python script being used.  All of the rest of the information is the same.

<figure>
    <video controls autoplay>
        <source src="/assets/images/guide/concepts/CxxFullRendering.mov" alt="Cxx Example Video">
    </video>
    <figcaption>The resulting animation from running the CxxFullExample using the catalyst_pipeline_with_rendering script.</figcaption>
</figure>

## Generating Information for Additional Post-Processing
But what if you wanted ParaView Catalyst to extract information from the simulation to be processed further using ParaView?  There is a third input file created in this example that generates VTK information instead.  As in the previous case, the only difference between the previous input files is the Python script being used.

```bash
./bin/CxxUnstructuredGrid gridwriter.json
```

Now instead of producing images, this script will now generate VTK multi-block (.vtm) files of the extracted time-steps that can then be read back into ParaView.

|![Image](/assets/images/guide/concepts/gridWriterExample.png)|
|:--:|
|Result of using the gridwriter input file and loading the generated files into ParaView.|


