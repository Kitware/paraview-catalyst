# Instrumenting Simulations with Catalyst

The first step in using ParaView Catalyst (or any Catalyst-based back-end) is the instrumentation of your simulation code.  This guide will walk you through the instrumentation process using [LULESH](https://asc.llnl.gov/codes/proxy-apps/lulesh) (Livermore Unstructured Lagrangian Explicit Shock Hydrodynamics) code that can be used for modeling shock physics using discretized hydrodynamic equations over unstructured meshes.

## Environment Setup
Before you begin, make sure you have installed the following on your system:
 - git
- [CMake](https://cmake.org/download/) 3.13 or later- for managing the build process used by both Catalyst and ParaView
- [Ninja](https://ninja-build.org) - build system tool.  Not required but highly recommended.  If you want to use make instead please make sure to do the following:
  - When configuring CMake, please omit any **-G Ninja** parameters.
  - When building, if the line starts with **ninja** please use **make** instead.
- [MPI](https://www.open-mpi.org) - optional. If you are building without MPI make sure any CMake configuration line for LULESH has **-DMPI=0** in stead of **-DMPI=1**.
 - A C++ compiler

## Compiling Catalyst
Get and Compile the catalyst library. This simulation will need to link to this library. Please see [here](getting-started.md#building-catalyst) for details.


## Understanding the simulation's data

Before we begin to modify the simulation, we first have to understand the data the simulation generates in terms of its structure.  In the case of LULESH, the geometric domain itself is a three dimensional structured grid that consists of sets of scalar and vector files applied to either nodes or elements as shown in the table below:

|Field Name  | Representation | Assignment |
|------------|----------------|------------|
| Energy (e)| scalar| element|
| Pressure (p)| scalar|element|
| Artificial Viscosity (q)| scalar | element|
| Relative Volume (v)| scalar | element |
| Sound Speed (ss)| scalar | element|
| Element Mass (elemMass) | scalar | element |
| Nodal Mass (nodalMass) | scalar | node |
| Velocity (velocity) | vector | node |
| Acceleration (acceleration) | vector | node |
| Force (force) | vector | node |

## The LULESH Tutorial

All of the source code referred to in this guide can be accessed by doing the following:
```bash
git clone https://gitlab.kitware.com/catalyst-examples.git
cd catalyst-examples/ParaView/Lulesh-tutorial
```
Here you will find modified versions of LULESH that reflect the changes being described here.  Each sub-directory has its own CMake file and should build on your machine.

## V0: Uninstrumented LULESH

Lets start by building a version of LULESH that has not been instrumented with Catalyst.  This version is located in the Version0 directory and can be built using the following:

```bash
cp -R Version0 myLulesh
cmake -G Ninja -S myLulesh -B myLulesh-build -DWITH_MPI=1
cmake --build myLulesh-build
cd myLulesh-build
./lulesh2.0 -h
```

::: tip NOTE

The above commands will copy the uninstrumented version of LULESH (Version0) into a new directory called myLulesh and create a directory called ``myLulesh-build`` in your catalyst-examples directory.

:::

LULESH uses a cubical domain. Let's run the simulation for a domain of size
10x10x10 (`-s 10`) for 30 iterations (`-i 30`) and show progress (`-p`),
```bash
./lulesh2.0 -s 10 -i 30 -p
Running problem size 10^3 per domain until completion
Num processors: 1
Total number of elements: 1000

...
cycle = 1, time = 6.042222e-05, dt=6.042222e-05
...
cycle = 30, time = 6.397380e-04, dt=2.685415e-05
Run completed:
   Problem size        =  10
   MPI tasks           =  1
   Iteration count     =  30
   Final Origin Energy =  1.174431e+05
   Testing Plane 0 of Energy Array on rank 0:
        MaxAbsDiff   = 1.091394e-11
        TotalAbsDiff = 1.206815e-11
        MaxRelDiff   = 5.469698e-14

Elapsed time         =      0.085 (s)
Grind time (us/z/c)  =  2.8304667 (per dom)  (  0.084914 overall)
FOM                  =  353.29863 (z/s)
```

::: tip NOTE

If you have compiled your code with MPI you can now run LULESH in parallel using ``mpiexec``.  The ``-np`` option allows you to set the number of processors to use.  In the case of LULESH the number **must be** a cubed value (1, 8, 27, ...).

:::

```bash
mpiexec -np 8 ./lulesh2.0 -s 10 -i 30 -p
Running problem size 10^3 per domain until completion
Num processors: 8
....
```

## V1: Basic Catalyst Instrumentation


Instrumenting catalyst requires at least 3 calls.

|![Image](/assets/images/guide/concepts/catalyst_functions.jpg)|
|:--:|
|The three main Catalyst functions a simulation must provide.|


Let's add a new file called `lulesh-catalyst.cc` that will hold these three methods and update our `CMakeLists.txt` file.

`lulesh-catalyst.cc:`
```cpp
#include <iostream>
void InitializeCatalyst()
{
  std::cerr << "InitializeCatalyst" << std::endl;
}

void ExecuteCatalyst()
{
  std::cerr << "ExecuteCatalyst" << std::endl;
}

void FinalizeCatalyst()
{
  std::cerr << "FinalizeCatalyst" << std::endl;
}
```
`lulesh-catalyst.h`
```cpp
#ifndef LULESH_CATALYST_H
#define LULESH_CATALYST_H
void InitializeCatalyst();
void ExecuteCatalyst();
void FinalizeCatalyst();
#endif
```


Updated `CMakeLists.txt`:

```diff
 set(LULESH_SOURCES
+  lulesh-catalyst.cc
   lulesh-comm.cc
   lulesh-init.cc
   lulesh-util.cc
```

### Where to call Catalyst
The next step is to determine  the proper locations in LULESH for these calls.
Lets start by including  `lulesh-catalyst.h` to `lulesh.h` so it is available to the simulation.

```diff
 #include <stdint.h>
 #include <vector>

+#include "lulesh-catalyst.h"
```

### Initializing Catalyst
For `InitializeCatalyst` we need to pick a spot early in the program execution.
Preferably this should be after  the initialization and argument parsing of the simulation.
This  will allow us to pass any extra arguments to catalyst's initialization.

`main()` is located around line 2650 of `lulesh.cc`

We will add `InitializeCatalyst` after the creation of the computational domain of the simulation.

```diff
    locDom = new Domain(numRanks, col, row, plane, opts.nx,
                        side, opts.numReg, opts.balance, opts.cost) ;

+   InitializeCatalyst();
```

### Finalizing Catalyst

Following the same approach we need to add `FinalizeCatalyst` at a spot late in
the simulation before the solver begins to free critical memory.  For symmetry
we add it right before the deletion of the `locDom` in `lulesh.cc`.


```diff
       VerifyAndWriteFinalOutput(elapsed_timeG, *locDom, opts.nx, numRanks);
    }

+   FinalizeCatalyst();
    delete locDom;
```


### Catalyst Execution

Finding the proper spot to call `ExecuteCatalyst`  depends heavily on the simulation. In general, you start by identifying the main loop of the simulation that advances the simulation time.

In this example, the simulation loop in around line 2745 of `lulesh.cc` file.

```diff
   while((locDom->time() < locDom->stoptime()) && (locDom->cycle() < opts.its)) {

      TimeIncrement(*locDom) ;
      LagrangeLeapFrog(*locDom) ;

      if ((opts.showProg != 0) && (opts.quiet == 0) && (myRank == 0)) {
         std::cout << "cycle = " << locDom->cycle()       << ", "
                   << std::scientific
                   << "time = " << double(locDom->time()) << ", "
                   << "dt="     << double(locDom->deltatime()) << "\n";
         std::cout.unsetf(std::ios_base::floatfield);
      }
+      ExecuteCatalyst();
   }
```

### Testing the first Catalyst Instrumentation
Re-compile the simulation and rerun using the same arguments.  In this version you should see the printouts we added in the Catalyst instrumentation routines showing up in LULESH's output as shown below.

Expected output:
```bash
$ ./lulesh2.0 -s 10 -i 30 -p
Running problem size 10^3 per domain until completion
Num processors: 1
Total number of elements: 1000

To run other sizes, use -s <integer>.
To run a fixed number of iterations, use -i <integer>.
To run a more or less balanced region set, use -b <integer>.
To change the relative costs of regions, use -c <integer>.
To print out progress, use -p
To write an output file for VisIt, use -v
See help (-h) for more options

InitializeCatalyst
cycle = 1, time = 6.042222e-05, dt=6.042222e-05
ExecuteCatalyst
...
cycle = 30, time = 6.397380e-04, dt=2.685415e-05
ExecuteCatalyst
Run completed:
   Problem size        =  10
   MPI tasks           =  1
   Iteration count     =  30
   Final Origin Energy =  1.174431e+05
   Testing Plane 0 of Energy Array on rank 0:
        MaxAbsDiff   = 1.091394e-11
        TotalAbsDiff = 1.206815e-11
        MaxRelDiff   = 5.469698e-14

Elapsed time         =      0.072 (s)
Grind time (us/z/c)  =  2.4161667 (per dom)  (  0.072485 overall)
FOM                  =  413.87873 (z/s)

FinalizeCatalyst
```

### One more change
Before we move on to the next topic, it is good practice to add a new build option that enables/disables the use of Catalyst allowing the Catalyst instrumentation optional w/r the simulation code.  First we should create 2 versions of the 3 main Catalyst functions.  The original set that we will be expanding with additional functionality in the next section, and the second set consisting on empty bodies which will be used when not using Catalyst.  We will use an *ifdef* condition to switch between the two at compile time.

#### `lulesh-catalyst.cc`:
```cpp
#ifdef VIZ_CATALYST
#include <iostream>
void InitializeCatalyst()
{
  std::cerr << "InitializeCatalyst" << std::endl;
}

void ExecuteCatalyst()
{
  std::cerr << "ExecuteCatalyst" << std::endl;
}

void FinalizeCatalyst()
{
  std::cerr << "FinalizeCatalyst" << std::endl;
}

#else
void InitializeCatalyst() {}

void ExecuteCatalyst() {}

void FinalizeCatalyst() {}
#endif
```

Next we will update the CMake file to allow the user to turn on/off the Catalyst support.
#### `CMakeLists.txt`
```diff
 project(LULESH CXX)
 option(WITH_MPI    "Build LULESH with MPI"          TRUE)
 option(WITH_OPENMP "Build LULESH with OpenMP"       TRUE)
 option(WITH_SILO   "Build LULESH with silo support" FALSE)
+option(WITH_CATALYST "Build LULESH with Catalyst enabled" FALSE)

 if (WITH_MPI)
   find_package(MPI REQUIRED)

...

 add_executable(${LULESH_EXEC} ${LULESH_SOURCES})
 target_link_libraries(${LULESH_EXEC} ${LULESH_EXTERNAL_LIBS})
+
+if(WITH_CATALYST)
+  target_compile_definitions(${LULESH_EXEC}
+    PRIVATE
+      VIZ_CATALYST=1)
+endif()
```

Now when we reconfigure LULESH would now use the following cmake command which will enable Catalyst support:
```bash
cmake -G Ninja -S myLulesh -B myLulesh-build -DWITH_CATALYST=1 -DWITH_MPI=1
```

 ::: tip NOTE

The code in your ``myLulesh`` directory should now look like the source in the ``Version1`` directory.

:::

## V2: Calling Catalyst Routines

So far we have thought about where Catalyst calls should be made in the simulation but we haven't actually called any of Catalyst's routines.  Here we will start filling in some of the details.

### Linking  to Catalyst library
Since we will next be making calls to the Catalyst library, let's modify LULESH's CMake file to link it with the catalyst library we build have already built above:

```diff
+if (WITH_CATALYST)
+  find_package(catalyst REQUIRED)
+endif()
+
 set(LULESH_SOURCES
   lulesh-catalyst.cc
   lulesh-comm.cc
...

 target_link_libraries(${LULESH_EXEC} ${LULESH_EXTERNAL_LIBS})

 if(WITH_CATALYST)
+ target_link_libraries(${LULESH_EXEC}
+   PRIVATE
+     catalyst::catalyst)
+
   target_compile_definitions(${LULESH_EXEC}
     PRIVATE
       VIZ_CATALYST=1)
```

If you are following the convention at the beginning of this guide where you exported **CATALYSTBUILD** to the Catalyst build directory, your new CMake configuration line will now be the following:

```bash
cmake -G Ninja -S myLulesh -B myLulesh-build -DWITH_CATALYST=1 -DWITH_MPI=1 \
      -DCMAKE_PREFIX_PATH=$CATALYSTBUILD
cmake --build myLulesh-build
```

### Implementing `InitializeCatalyst`
In this step, we will replace the placeholder implementation of this call with the actual code that ParaViewCatalyst needs.

`InitializeCatalyst` will call `catalyst_initialize` which has a single argument which is a conduit node and needs to adhere to [this](https://docs.paraview.org/en/latest/Catalyst/blueprints.html#protocol-initialize) protocol which has a resemblance to a JSON structure.

For this example we will pass only the script(s) and define everything else via environmental variables; therefore, we need to add an argument in the simulation's command line to pass the script(s).

 ::: tip NOTE

Though the majority of the time we are dealing with a single in situ script, it is good practice to allow the possibility of passing multiple scripts.

:::

Here are the required changes:


#### `lulesh.h`:
```diff
struct cmdLineOpts {
...
    Int_t viz; // -v
    Int_t cost; // -c
    Int_t balance; // -b
+#if VIZ_CATALYST
+   std::vector<std::string> scripts; // -x
+#endif
 };
 ```

#### `lulesh-util.cc`:
```diff
       printf(" -f <numfiles>   : Number of files to split viz dump into (def: (np+10)/9)\n");
       printf(" -p              : Print out progress\n");
       printf(" -v              : Output viz file (requires compiling with -DVIZ_MESH\n");
 +     printf(" -x <script>     : ParaView analysis script (requires compiling with -DVIZ_CATALYST)\n");
       printf(" -h              : This message\n");
       printf("\n\n");
    }
```
```cpp
void ParseCommandLineOptions(int argc, char *argv[],
...
             i++;
          }
          // new option
         /* -x */
         else if (strcmp(argv[i], "-x") == 0) {
#if VIZ_CATALYST
             opts->scripts.push_back(argv[i+1]);
#else
             ParseError("Use of -x requires compiling with Catalyst support.", myRank);
#endif
            i+=2;
         }
          /* -h */
          else if (strcmp(argv[i], "-h") == 0) {
             PrintCommandLineOptions(argv[0], myRank);
```

Next we update `InitializeCatalyst` definition to accept and process `cmdLineOpts` as an argument:

#### `lulesh-catalyst.h`:
```cpp
 #ifndef LULESH_CATALYST_H
 #define LULESH_CATALYST_H

 struct cmdLineOpts;
 void InitializeCatalyst(const cmdLineOpts& opts);
 void ExecuteCatalyst();
 void FinalizeCatalyst();
 #endif
 ```

#### `lulesh-catalyst.cc`:
```cpp
 #include "lulesh-catalyst.h"
 #ifdef VIZ_CATALYST

 #include <iostream>
 #include "lulesh.h"

#include <catalyst.hpp>
#include <catalyst_conduit.hpp>

 void InitializeCatalyst(const cmdLineOpts& opts)
  {
   conduit_cpp::Node node;
   for (size_t cc=0; cc < opts.scripts.size(); ++cc)
   {
     conduit_cpp::Node list_entry = node["catalyst/scripts/script_" + std::to_string(cc)].append();
     list_entry.set(opts.scripts[cc]);
   }

   catalyst_status err = catalyst_initialize(conduit_cpp::c_node(&node));
   if (err != catalyst_status_ok)
   {
     std::cerr << "Failed to initialize Catalyst: " << err << std::endl;
   }
 }
 #else
+void InitializeCatalyst(const cmdLineOpts& opts)
 ```

Let's examine the above changes in more detail.

```cpp
#include <catalyst.hpp>
#include <catalyst_conduit.hpp>
```
We will be using the C++ wrappings of Catalyst so we need to include these two files.

```cpp
  conduit_cpp::Node node;
```
This is the argument we will be passing to `catalyst_initialize`. Its API resembles closely that of a map/JSON structure.
For a description of the conduit API see [here](https://llnl-conduit.readthedocs.io/en/latest/tutorial_cpp.html)

The node structure  needs to adhere to the [initialize](https://docs.paraview.org/en/latest/Catalyst/blueprints.html#protocol-initialize) protocol of ParaViewCatalyst.

```cpp
 for (size_t cc=0; cc < opts.scripts.size(); ++cc)
  {
    node["catalyst/scripts/script_" + std::to_string(cc)] = opts.scripts[cc];
  }
```

For every provided script we create an entry under `catalyst/scripts`.

```cpp
  catalyst_status err = catalyst_initialize(conduit_cpp::c_node(&node));
  if (err != catalyst_status_ok)
  {
    std::cerr << "Failed to initialize Catalyst: " << err << std::endl;
  }
```
Finally, we pass the node to `catalyst_initialize` and check its return value.


The last step involves updating the calling site of `InitializeCatalyst`

#### `lulesh.cc`:
```diff
    locDom = new Domain(numRanks, col, row, plane, opts.nx,
                        side, opts.numReg, opts.balance, opts.cost) ;

-   InitializeCatalyst();
+   InitializeCatalyst(opts);
```

### Implementing `FinalizeCatalyst`
In this case since we don't have any additional processing to be done for finalizing catalyst so we will just pass an empty node.

#### `lulesh-catalyst.cc`:
```cpp
void FinalizeCatalyst()
{
  conduit_cpp::Node node;
  catalyst_status err = catalyst_finalize(conduit_cpp::c_node(&node));
  if (err != catalyst_status_ok)
  {
    std::cerr << "Failed to finalize Catalyst: " << err << std::endl;
  }
}
 ```

Make sure the code compiles with no issues.
 ::: tip NOTE

 At this point your code should now resemble the source in the ``Version2`` directory.

:::

## Compiling ParaView
All of the following versions will now involve using ParaView so we will need to build it. Please see [here](getting-started.md#building-paraview-catalyst) for details.

## V3: Passing Geometry

Now comes the interesting part where we need to pass simulation data through Catalyst to the in situ processing side. All information is passed to Catalyst via a Conduit node. As one might imagine the information represented in this node can varies significantly from simulation to simulation. In addition, the protocol/schema used to decipher the node's information will also depend on the Catalyst back-end being used. In our case, ParaView Catalyst will be performing the in situ processing. When it comes to the contents of the node, ParaView Catalyst assumes that the Blueprint Mesh [protocol](https://llnl-conduit.readthedocs.io/en/latest/blueprint_mesh.html) is used to describe the data.

For LULESH the data structure of interest is the class `Domain` declared around
line 152 of `lulesh.h`. At each iteration we want pass the coordinates,connectivity, point- and cell-data of this domain to ParaView Catalyst.

Since the arrays of interest are not exposed via any existing Domain methods, we will be
adding a new method `conduit_cpp::Node& node()` to Domain that returns a conduit node
that describes the domain.

### `lulesh.h`:
```cpp
 #include <vector>

#include "lulesh-catalyst.h"
// Add required header files
#ifdef VIZ_CATALYST
#include "catalyst.hpp"
#include "catalyst_conduit.hpp"
#endif


  class Domain {
  ...

// expose the conduit node to ExecuteCatalyst
#ifdef VIZ_CATALYST
  conduit_cpp::Node& node() { return m_node; }
#endif
   private:

// A new member to hold the conduit node
#ifdef VIZ_CATALYST
   conduit_cpp::Node m_node;
#endif
 } ;
 ```
As mentioned at the beginning of this guide, LULESH uses a axis-aligned structured mesh which corresponds to the
[structured-topology](https://llnl-conduit.readthedocs.io/en/latest/blueprint_mesh.html#structured-topology)
so we only need to pass the point coordinates and the dimensions of the domain
along each axis. The coordinates are held in the `m_x`,`m_y`,`m_z` arrays while
the size is given by the `nx` parameter of the `Domain` constructor.

Let's populate the `m_node` argument during the construction of the domain.
First, we pass information for the coordinates.  This follows the [Coordinate
Sets](https://llnl-conduit.readthedocs.io/en/latest/blueprint_mesh.html#coordinate-sets)
protocol:

`lulesh-init.cc`:
```cpp
    //set initial deltatime base on analytic CFL calculation
    deltatime() = (Real_t(.5)*cbrt(volo(0)))/sqrt(Real_t(2.0)*einit);

#ifdef VIZ_CATALYST
   this->m_node["coordsets/coords/type"] = "explicit";
   this->m_node["coordsets/coords/values/x"].set_external(m_x);
   this->m_node["coordsets/coords/values/y"].set_external(m_y);
   this->m_node["coordsets/coords/values/z"].set_external(m_z);
#endif
```
::: tip NOTE

Using `set_external` passes only a **reference** to ParaView Catalyst and thus
no copy of data will be performed when passing the data though Catalyst.

:::

For the connectivity (or Topology) we use the [Structured
Topology](https://llnl-conduit.readthedocs.io/en/latest/blueprint_mesh.html#structured-topology)
protocol.

`lulesh-init.cc`:
```cpp
   this->m_node["coordsets/coords/values/y"].set_external(m_y);
   this->m_node["coordsets/coords/values/z"].set_external(m_z);

   this->m_node["topologies/mesh/type"] = "structured";
   this->m_node["topologies/mesh/coordset"] =  "coords";
   this->m_node["topologies/mesh/elements/dims/i"] = nx;
   this->m_node["topologies/mesh/elements/dims/j"] = nx;
   this->m_node["topologies/mesh/elements/dims/k"] = nx;
 #endif
```


::: tip NOTE

Make sure to check other examples [here](https://gitlab.kitware.com/paraview/catalyst-examples/-/tree/master/Examples) where we create adaptors for different types of data.

:::


We are done with representing the geometry of the domain ! Let's move to updating
`ExecuteCatalyst` and write our first catalyst pipeline!

### Implementing `ExecuteCatalyst`:
Similar to `catalyst_initialize` , `catalyst_execute` expects a conduit node
that adheres to a specific protocol (which in our case is Blueprint Mesh) described
[here](https://docs.paraview.org/en/latest/Catalyst/blueprints.html#protocol-execute).
The purpose in this step is to pass information about the iteration step and
simulation time as well as the conduit representation of the domain we just
created.

First we will update the signature of `ExecuteCatalyst` to pass the domain by reference.

#### `lulesh-catalyst.h`:
```diff
 #ifndef LULESH_CATALYST_H
 #define LULESH_CATALYST_H
 struct cmdLineOpts;
+class Domain;
 void InitializeCatalyst(const cmdLineOpts& opts);
-void ExecuteCatalyst();
+void ExecuteCatalyst(Domain& localDomain);
 void FinalizeCatalyst();
 #endif
```
Now lets update the body of ExecuteCatalyst to send the domain's information to ParaView Catalyst.

#### `lulesh-catalyst.cc`
`lulesh-catalyst.cc`:
```cpp
 void ExecuteCatalyst(Domain& localDomain)
 {
  conduit_cpp::Node node;
  node["catalyst/state/cycle"] = localDomain.cycle();
  node["catalyst/state/time"] = localDomain.time();
  node["catalyst/channels/grid/type"] = "mesh";
  node["catalyst/channels/grid/data"] = localDomain.node();

  catalyst_status err = catalyst_execute(conduit_cpp::c_node(&node));
  if (err != catalyst_status_ok)
  {
    std::cerr << "Failed to execute Catalyst: " << err << std::endl;
  }
}
```
::: tip NOTE

Examine the last two assignments involving `node`. The path provided contains "catalyst/channels/grid".  It is very important to note that Catalyst can support multiple channels, each with a unique name.  The Catalyst back-end implementation (in our case ParaView Catalyst), will need be referring to these channels.  In our example, we are specifying one channel named **grid** and we will be referring to shortly.

:::

Since we changed the signature to ExecuteCatalyst, we also need to change the stubbed version (one we used when not using Catalyst):

```diff

-void ExecuteCatalyst()
+void ExecuteCatalyst(Domain&)
 {
 }
```

Now we update LULESH to call ExecuteCatalyst by passing in its domain.
#### `lulesh.cc`:
```diff
-      ExecuteCatalyst();
+      ExecuteCatalyst(*locDom);
    }
```
That's it! We are passing data to ParaView Catalyst! In the next step we will be saving
the data into a file which although it contradicts the idea of in situ, it
allows us to visually inspect the domain using ParaView.


### Creating a ParaView Catalyst script
Let's save the grid as a vtk file and visualize it using the ParaView application.
First, create a simple ParaView Catalyst script:

`script.py`:
```python
# Specify the Catalyst channel name
catalystChannel = "grid"

from paraview.simple import *
# Pipeline
data = TrivialProducer(registrationName=catalystChannel)
extractor = CreateExtractor('VTPD', data)

# Catalyst options
options = catalyst.Options()
options.ExtractsOutputDirectory = "./datasets/"
options.GlobalTrigger.Frequency = 1
```

Things to note:
- As previously mentioned,catalystChannel **must** match one of the entries under `catalyst/channels/*` of the conduit node we passed in `catalyst_execute`.
- Files will be written under `./datasets` in the current working directory.
- The data will be saved at every iteration as indicated by ``options.GlobalTrigger.Frequency = 1``.

Lets save the above script in your myLulesh directory. At this point you should rebuild your code!
```bash
cmake -G Ninja -S myLulesh -B myLulesh-build -DWITH_CATALYST=1 -DWITH_MPI=1 \
      -DCMAKE_PREFIX_PATH=$CATALYSTBUILD
cmake --build myLulesh-build
cd myLulesh-build
```

 ::: tip NOTE

 At this point your code (including your script) should now resemble the source in the ``Version3`` directory.

:::

To run the script:
```bash
export CATALYST_IMPLEMENTATION_NAME="paraview"
export CATALYST_IMPLEMENTATION_PATHS=<path to libcatalyst-paraview>
./lulesh2.0 -s 10 -i 30 -p -x ../myLulesh/script.py
```

Under the `datasets` directory you should now have a collection of 30
`grid_000XXX.vtpd` files which you can open in ParaView to validate the
adaptor.

|![Image](/assets/images/guide/instrumentingCatalyst/LuleshTutorialV3.png)|
|:--:|
|Loading the files generated by Catalyst showing the simulation geometry into ParaView.|


## V4: Passing Fields

Exporting the mesh data without the actual solution fields does not bring much value besides debugging.
So, let's see how pass nodal and cell data to ParaView.

The `Domain` class holds a number of arrays of interest like energy `m_e` and pressure `m_p` stored for each cell.
It also has scalar nodal arrays like `m_nodalMass` as well as vector quantities like velocity `m_xd,m_yd,m_zd` and
acceleration `m_xdd,m_ydd,m_zdd`.
When passing these arrays to catalyst we need to follow the
[fields](https://llnl-conduit.readthedocs.io/en/latest/blueprint_mesh.html#fields)
protocol of the Conduit Mesh Blueprint.

This is how this looks for the energy `m_e` array:

```cpp
conduit_cpp::Node node;
node["fields/energy/association"] = "element";
node["fields/energy/topology"] = "mesh";
node["fields/energy/values"].set_external(m_e);
```
The `association` entry indicates whether this is a nodal or element value.
`topology` is the name of the topology these values should be associated with.
This name should have been defined already under the `/topologies` leaf of the
conduit node. Indeed if you look back in step 7 you will notice we added all
entries under `/topologies/mesh`. Finally, we pass the array as an external
which mean that no copy will take place when passing the data to ParaView Catalyst.

Since we have many arrays of this type let's create two  helper methods.  The first will deal with scalars fields and the second will process vector fields.

### `lulesh-init.cc`:
```cpp
 #include <cstdlib>
 #include "lulesh.h"

#ifdef VIZ_CATALYST
namespace  {

void AddField(conduit_cpp::Node& node, const std::string& name, const std::string& association, std::vector<Real_t>& field)
{
  node["fields/" + name + "/association"] = association;
  node["fields/" + name + "/topology"] = "mesh";
  node["fields/" + name + "/values"].set_external(field);
}

void AddField(conduit_cpp::Node& node, const std::string& name, const std::string& association, std::vector<Real_t>& fieldX, std::vector<Real_t>& fieldY, std::vector<Real_t>& fieldZ)
{
  node["fields/" + name + "/association"] = association;
  node["fields/" + name + "/topology"] = "mesh";
  node["fields/" + name + "/values/u"].set_external(fieldX);
  node["fields/" + name + "/values/v"].set_external(fieldY);
  node["fields/" + name + "/values/w"].set_external(fieldZ);
}

}

#endif

 /////////////////////////////////////////////////////////////////////
 Domain::Domain(Int_t numRanks, Index_t colLoc,
                Index_t rowLoc, Index_t planeLoc,
...
   this->m_node["topologies/mesh/elements/dims/i"] = nx;
   this->m_node["topologies/mesh/elements/dims/j"] = nx;
   this->m_node["topologies/mesh/elements/dims/k"] = nx;

   // Adding Scalar Feilds
   AddField(this->m_node,"e","element",m_e);
   AddField(this->m_node,"p","element",m_p);
   AddField(this->m_node,"q","element",m_q);
   AddField(this->m_node,"v","element",m_v);
   AddField(this->m_node,"ss","element",m_ss);
   AddField(this->m_node,"elemMass","element",m_elemMass);
   AddField(this->m_node,"nodalMass","vertex",m_nodalMass);
   // Adding Vector Fields
   AddField(this->m_node,"velocity","vertex",m_xd,m_yd,m_zd);
   AddField(this->m_node,"acceleration","vertex",m_xdd,m_ydd,m_zdd);
   AddField(this->m_node,"force","vertex",m_fx,m_fy,m_fz);
 #endif

 } // End constructor
```

::: tip NOTE

For vector fields the pattern is similar but we need to pass each vector
component separately under a different leaf below `/values` named `u`,`v`,`w`
respectively.

:::

At this point you should rebuild and run your code!
```bash
cmake -G Ninja -S myLulesh -B myLulesh-build -DWITH_CATALYST=1 -DWITH_MPI=1 \
      -DCMAKE_PREFIX_PATH=$CATALYSTBUILD
cmake --build myLulesh-build
cd myLulesh-build
./lulesh2.0 -s 10 -i 30 -p -x ../myLulesh/script.py
```
 ::: tip NOTE

 At this point your code (including your script) should now resemble the source in the ``Version4`` directory.

:::

Rerunning the simulation and opening the file in ParaView you should be able to see the new arrays available.

|![Image](/assets/images/guide/instrumentingCatalyst/LuleshTutorialV4.png)|
|:--:|
|Loading the files generated by Catalyst showing the simulation geometry and fields into ParaView.  Here we are displaying the magnitude of the velocity for the last time-step.|

## V5: Removing Exports

One potential issue with our current implementation is the reliance on environment variables to tell Catalyst which back-end to use. This can be a nuisance since Catalyst users would need to remember to set them prior to running the simulation.  It can also be a hindrance when others try to use your instrumentation since they two need to remember to set these variables.  So in this last section we will remove the need of using these variables by changing the information being passed via the ``-x`` parameter.

Instead of passing the script, we are going to pass in a representation of the Conduit node for initializing Catalyst itself using YAML or JSON:

### input.json:
```json
{
    "catalyst": {
        "scripts": {
            "script0": "LOCATION OF YOUR PARAVIEW CATALYST SCRIPT"
            }
        }
     },
    "catalyst_load": {
        "implementation": "paraview",
        "search_paths": {
            "paraview": "LOCATION OF LIBCATALYST-PARAVIEW DIRECTORY"
        }
    }
}

```
### input.yaml:
```yaml
---
  catalyst:
    scripts:
      # Filename refers to the ParaView Catalyst Pipeline to be used
      script0: "LOCATION OF YOUR PARAVIEW CATALYST SCRIPT"

  catalyst_load:
    implementation: paraview
    search_paths:
      # This should be set to the directory where the ParaView Catalyst Libraries are located
      paraview: "LOCATION OF LIBCATALYST-PARAVIEW DIRECTORY"

```
The benefit of this approach is that exports are no longer needed and the input file completely specifies all of the information that Catalyst's initialize needs. Implementing this change is pretty straightforward and in fact will simplify things:

#### `lulesh.h`:
The first change is that we would no longer need to deal with multiple scripts.  If multiple scripts are required we would simply add them to the Catalyst input file.  So we can now use a single string for the ``-x`` option.
```diff
struct cmdLineOpts {
...
    Int_t viz; // -v
    Int_t cost; // -c
    Int_t balance; // -b
#if VIZ_CATALYST
-   std::vector<std::string> scripts; // -x
+   std::string catalystInput; // -x
#endif
```
#### `lulesh-util.cc`:
Here we are just cleaning things up to reflect the change of the ``-x`` option in the help message.
```diff
       printf(" -f <numfiles>   : Number of files to split viz dump into (def: (np+10)/9)\n");
       printf(" -p              : Print out progress\n");
       printf(" -v              : Output viz file (requires compiling with -DVIZ_MESH\n");
 -     printf(" -x <script>     : ParaView analysis script (requires compiling with -DVIZ_CATALYST)\n");
 +     printf(" -x <input>      : Catalyst input file (requires compiling with -DVIZ_CATALYST)\n");
       printf(" -h              : This message\n");
       printf("\n\n");
    }
```
Now we need to change the command tool processing logic to only support a single ``-x`` option.
```cpp
void ParseCommandLineOptions(int argc, char *argv[],
...
             i++;
          }
          // new option
         /* -x */
         else if (strcmp(argv[i], "-x") == 0) {
#if VIZ_CATALYST
            // See if this is the first time we have seen the -x option
            if (opts->catalystInput.empty()) {
                opts->catalystInput = argv[i+1];
            }
            else {
             ParseError("Encountered multiple -x options - ignoring all but the first.", myRank);
            }
#else
             ParseError("Use of -x requires compiling with Catalyst support.", myRank);
#endif
            i+=2;
         }
          /* -h */
          else if (strcmp(argv[i], "-h") == 0) {
             PrintCommandLineOptions(argv[0], myRank);
```
Finally, we need to simplify ``InitializeCatalyst`` to parse the contents of the Catalyst input file using the ``conduit_node_parse`` function and pass that node to ``catalyst_initialize``.

### `lulesh-catalyst.cc`:
```cpp
#include "lulesh-catalyst.h"
#ifdef VIZ_CATALYST

#include <fstream>
#include <iostream>
#include <sstream>
#include <string>
#include "lulesh.h"

#include <catalyst.hpp>
#include <catalyst_conduit.hpp>

void InitializeCatalyst(const cmdLineOpts& opts)
{
  // Use the contents of the input file to initialize Catalyst
  std::ifstream input(opts.catalystInput);

  if (!input.is_open())
  {
    std:: string temp = "Could not open: ";
    temp.append(opts.catalystInput);
    throw std::runtime_error(temp);
  }

  std::stringstream buffer;
  buffer << input.rdbuf();

  // Populate the catalyst_initialize argument based on the "initialize" protocol [1].
  // [1] https://docs.paraview.org/en/latest/Catalyst/blueprints.html#protocol-initialize
  conduit_cpp::Node node;
  // Note that parsing the string using yaml format will also work with json format
  conduit_node_parse(conduit_cpp::c_node(&node), buffer.str().c_str(), "yaml");
  catalyst_status err = catalyst_initialize(conduit_cpp::c_node(&node));
  if (err != catalyst_status_ok)
  {
    std::cerr << "Failed to initialize Catalyst: " << err << std::endl;
  }
}
#else
void InitializeCatalyst(const std::string& catalystInputPath)
 ```

 Now you can edit the JSON or YAML version of the input file to reflect the location of the ParaView Catalyst library as well as the path of the Catalyst script.

### Auto-configuring your Catalyst Input File
One of the benefits of using CMake is that it can auto-configure files for you during the configuration step. Lets create the following file in your LULESH source directory:

### input.yaml:
```yaml
---
  catalyst:
    scripts:
      # Filename refers to the ParaView Catalyst Pipeline to be used
      script0: "@CMAKE_CURRENT_SOURCE_DIR@/script.py"

  catalyst_load:
    implementation: paraview
    search_paths:
      # This should be set to the directory where the ParaView Catalyst Libraries are located
      paraview: "@ParaView_CATALYST_DIR@"

```

Lets also move the ParaView Catalyst script ``script.py`` into your LULESH source directory.

Finally, lets change the CMakeList.txt in the source directory to the following:

```diff
if (WITH_CATALYST)
  find_package(catalyst REQUIRED)
+  find_path(ParaView_CATALYST_DIR lib*-catalyst.* REQUIRED DOC "Location to ParaViewCatalyst Library")
+  configure_file(
+  ${CMAKE_CURRENT_SOURCE_DIR}/input.yaml.in
+  ${CMAKE_CURRENT_BINARY_DIR}/input.yaml
+  @ONLY)

endif()
```
These changes will now require you to specify the location of the ParaView Catalyst libraries and will create a file called input.yaml in your build directory that is fully configured.

Now when you build this version of LULESH you will use the following command:

```bash
cmake -G Ninja -S myLulesh -B myLulesh-build -DWITH_CATALYST=1 -DMPI=1 \
      -DCMAKE_PREFIX_PATH=$CATALYSTBUILD \
      -DParaView_CATALYST_DIR={Location of the ParaView Catalyst Library Directory}
cmake --build myLulesh-build
```

To run it you would so the following:
```bash
cd myLulesh-build
./lulesh2.0 -s 10 -i 30 -p -x ./input.yaml
```

::: tip NOTE

 At this point your code (including your script) should now resemble the source in the ``Version5``.

:::



For a guide of how to create more complex pipelines see [here](./using-paraview.md)
