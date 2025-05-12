# Getting Started with ParaView Catalyst

## Prerequisites

Building ParaView Catalyst will require the following libraries/tools:
- [CMake](https://cmake.org/download/) - for managing the build process used by both Catalyst and ParaView
- [NumPy](https://numpy.org) - used by Catalyst when dealing with Python wrapping
- [MPI](https://www.open-mpi.org)
- [Ninja](https://ninja-build.org) - build system tool.  Not required but highly recommended.
- [TBB](https://www.intel.com/content/www/us/en/developer/tools/oneapi/onetbb.html#gs.kmqn38) - Threaded Building Blocks Library (Recommended)
- Python 3.x

Note to Mac developers: All of the above software is available using Homebrew.

## Building Catalyst

The first step is to build the Catalyst library that will provide the means of representing the data that can then be processed by various consumer implementations such as ParaView Catalyst.  This is also the library that you will be using within your code so that you can pass the relevant information to the various Catalyst implementations.

You can find the basic build instructions for Catalyst [here](https://catalyst-in-situ.readthedocs.io/en/latest/build_and_install.html).

You can use the following commands  to configure and build Catalyst with MPI and Python Wrapping which we will need for the ParaView Catalyst Examples:

```bash
mkdir [name of Catalyst Build Directory]
cd  [name of Catalyst Build Directory]
ccmake -G Ninja -DCATALYST_USE_MPI=ON -DCATALYST_WRAP_PYTHON=ON [path to the Catalyst Source Directory]
cmake --build .
```

__Note:__ `-G Ninja` assumes that you have the [Ninja build system](https://ninja-build.org).

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

The path to the example is  `$PVSOURCE/Examples/Catalyst2/CxxFullExample`.  This example uses data in the form of an unstructured mesh of hexahedra.

To build the example, do the following:

```bash
mkdir cxxFullExampleBuild
cd cxxFullExampleBuild
cmake -G Ninja -DCMAKE_PREFIX_PATH=$CATALYSTBUILD $PVSOURCE/Examples/Catalyst2/CxxFullExample
cmake --build .
```

What you have built is a trivial data generator that creates a zero-copy representation of its data in Catalyst.  Now to run the example you will first need to set some environment variables:

```bash
export CATALYST_IMPLEMENTATION_PATHS=$PVBUILD/lib/catalyst
export CATALYST_IMPLEMENTATION_NAME=paraview
export PYTHONPATH=$CATALYSTBUILD/lib/python3.13/site-packages:$PYTHONPATH
```

__Note:__ The above assumes that we are using Python 3.13. Change the last export command to reflect the version of Python you used.

To run the example type the following:

```bash
./bin/CxxFullExample $PVSOURCE/Examples/Catalyst2/CxxFullExample/catalyst_pipeline.py
```

What you should see is basic information outputted from ParaView processing the different time steps from the data generator.  The python file specified in the command line contains the post-processing pipeline you wish to use when processing an update (caused by calling Catalyst::Adaptor::Execute).
Taking a Closer Look
Lets examine the files used in this example.

### CatalystAdaptor.h

When you want to use any Catalyst you typically need to call three main Catalyst functions:

- __catalyst_initialize__ - this function must be called once to initialize Catalyst using the supplied metadata
- __catalyst_finalize__ - this function must be called once to finalize Catalyst
- __catalyst_execute__ - this function is called for every timestep as the simulation advances

The `CatalystAdaptor.h` file provides functions that wrap the above functions to help with properly setting the necessary metadata.  For example, the CatalystAdaptor::Execute method properly sets up the Catalyst node hierarchy based on the simulation data.

### FEDataStructures.h, .cxx

This class defines the data structures used to represent a hexahedral  mesh with velocity and pressure fields.

### FEDriver.cxx

This is the main program of the example and is analogous to the simulation.  It sets up the mesh and fields for 10 timesteps and makes the appropriate calls to the CatalystAdaptor.

### catalyst_pipeline.py

This defines a simple ParaView pipeline that is used to process the FEDriver data each time CatalystAdapter::Execute is called.
Changing the Catalyst Script

Now lets see what happens if all we do is change the specified script to generate images based on the data being generated.  To do this, simply change the execution line to be:

```bash
./bin/CxxFullExample $PVSOURCE/Examples/Catalyst2/CxxFullExample/catalyst_pipeline_with_rendering.py
```

Now instead of simply showing output on the screen, it has generated images for each time step and placed them in datasets sub-directory of the example’s build directory.  Combining these images together results in the following short video comprising of 5 time-steps.

<figure>
    <video control autoplay>
        <source src="/assets/images/guide/concepts/CxxFullRendering.mov" alt="Cxx Example Video">
    </video>
    <figcaption>The resulting animation from running the CxxFullExample using the catalyst_pipeline_with_rendering script.</figcaption>
</figure>

But what if you wanted ParaView Catalyst to extract information from the simulation to be processed further using ParaView?  There is a third script provided in this example that generates VTK information instead.

```bash
./bin/CxxFullExample $PVSOURCE/Examples/Catalyst2/CxxFullExample/gridwriter.yaml
```

Now instead of producing images, this script will now generate VTK multi-block (.vtm) files of the extracted time-steps that can then be read back into ParaView.

|![Image](/assets/images/guide/concepts/gridWriterExample.png)|
|:--:|
|Result of using the gridwriter input file and loading the generated files into ParaView.|


