# Instrumenting Simulations with Catalyst

The first step in using ParaView Catalyst (or any Catalyst-based back-end) is the instrumentation of your simulation code.  In this guide will walk you through the instrumentation process using [LULESH](https://asc.llnl.gov/codes/proxy-apps/lulesh) (Livermore Unstructured Lagrangian Explicit Shock Hydrodynamics) code that can be used for modeling shock physics using discretized hydrodynamic equations over unstructured meshes.

## Environment Setup
Before you begin, make sure you have installed the following on your system:
 - git
- [CMake](https://cmake.org/download/) 3.13 or later- for managing the build process used by both Catalyst and ParaView
- [Ninja](https://ninja-build.org) - build system tool.  Not required but highly recommended.
- [MPI](https://www.open-mpi.org) - optional
 - A c++ compiler

## Compiling Catalyst
Get and Compile the catalyst library. This simulation will link to this library. Please see [here](getting-started.md#building-catalyst) for details.


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


## Getting and compiling LULESH

Get and compile the code:
```bash
git clone https://github.com/LLNL/LULESH.git
cmake -S LULESH -B build-lulesh -DWITH_OPENMP=0 -DWITH_MPI=0
cmake --build build-lulesh
cd build-lulesh
./lulesh2.0 -h
```

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

## Creating the catalyst adapter


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

## Where to call Catalyst
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
@@ -2715,7 +2715,8 @@ int main(int argc, char *argv[])
    locDom = new Domain(numRanks, col, row, plane, opts.nx,
                        side, opts.numReg, opts.balance, opts.cost) ;
+
+   InitializeCatalyst();
```

### Finalizing Catalyst
Following the same approach we need to add `FinalizeCatalyst` at a spot late in
the simulation before the solver begins to free critical memory.  For symmetry we add it right before the deletion of the `locDom` in `lulesh.cc`


```diff
@@ -2782,6 +2782,7 @@ int main(int argc, char *argv[])
       VerifyAndWriteFinalOutput(elapsed_timeG, *locDom, opts.nx, numRanks);
    }

+   FinalizeCatalyst();
    delete locDom;
```


### Catalyst Execution

Finding the proper spot to call `ExecuteCatalyst`  depends heavily on the simulation. In general, we start by identifying the main loop of the simulation that advances the simulation time.

In this example, the simulation loop in around line 2745 of `lulesh.cc` file.

```diff
@@ -2754,6 +2754,8 @@ int main(int argc, char *argv[])
                    << "dt="     << double(locDom->deltatime()) << "\n";
          std::cout.unsetf(std::ios_base::floatfield);
       }
+
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
Before we move on to the next example, it is good practice to add a new build option that enables/disables the use of Catalyst allowing the Catalyst instrumentation optional w/r the simulation code.  First we should create 2 versions of the 3 main Catalyst functions.  The original set that we will next expand with additional functionality and the second set consisting on empty bodies which will be used when not using Catalyst.  We will use an *ifdef* condition to switch between the two at compile time.

`lulesh-catalyst.cc`
```diff
@@ -1,3 +1,4 @@
+#ifdef VIZ_CATALYST
 #include <iostream>
 void InitializeCatalyst()
 {
@@ -13,3 +14,16 @@ void FinalizeCatalyst()
 {
   std::cerr << "FinalizeCatalyst" << std::endl;
 }
+#else
+void InitializeCatalyst()
+{
+}
+
+void ExecuteCatalyst()
+{
+}
+
+void FinalizeCatalyst()
+{
+}
+#endif
```

Next we will update the CMake file to allow the user to turn on/off the Catalyst support.
`CMakeLists.txt`
```diff
@@ -5,6 +5,7 @@ project(LULESH CXX)
 option(WITH_MPI    "Build LULESH with MPI"          TRUE)
 option(WITH_OPENMP "Build LULESH with OpenMP"       TRUE)
 option(WITH_SILO   "Build LULESH with silo support" FALSE)
+option(WITH_CATALYST "Build LULESH with Catalyst enabled" FALSE)

 if (WITH_MPI)
   find_package(MPI REQUIRED)
@@ -54,3 +55,10 @@ set(LULESH_EXEC lulesh2.0)

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
cmake -S LULESH -B build-lulesh -DWITH_CATALYST=1 
```

## 4. Link to catalyst library
Before populating the catalyst calls let's link the simulation to the catalyst library we build in step 1.
First, update `CMakeLists.txt`:

```diff
@@ -43,6 +43,10 @@ if (WITH_SILO)
   endif()
 endif()

+if (WITH_CATALYST)
+  find_package(catalyst REQUIRED)
+endif()
+
 set(LULESH_SOURCES
   lulesh-catalyst.cc
   lulesh-comm.cc
@@ -57,6 +61,8 @@ add_executable(${LULESH_EXEC} ${LULESH_SOURCES})
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

In the build directory export the path to the catalyst library and  recompile:

```bash
export CMAKE_PREFIX_PATH=<path to build-catalyst>
make
```

## 5. Implement `InitializeCatalyst`
In this step, we will replace the placeholder implementation of this call with the actual code that ParaViewCatalyst needs.

`InitializeCatalyst` will call `catalyst_initialize`. `catalyst_initialize` has a single argument which is a conduit node (think of JSON) and needs to adhere to [this](https://docs.paraview.org/en/latest/Catalyst/blueprints.html#protocol-initialize) protocol.

For this example we will pass only the script(s) and define  everything else via environmental variables.

( TODO show the new json way ?)

So, we need to add an argument in the simulation's command line to pass the script(s). Here are the required changes:

`lulesh.h`:
```diff
@@ -608,6 +608,9 @@ struct cmdLineOpts {
    Int_t viz; // -v
    Int_t cost; // -c
    Int_t balance; // -b
+#if VIZ_CATALYST
+   std::vector<std::string> scripts; // -x
+#endif
 };
 ```

`lulesh-util.cc`:
```diff
@@ -43,6 +43,7 @@ static void PrintCommandLineOptions(char *execname, int myRank)
       printf(" -f <numfiles>   : Number of files to split viz dump into (def: (np+10)/9)\n");
       printf(" -p              : Print out progress\n");
       printf(" -v              : Output viz file (requires compiling with -DVIZ_MESH\n");
+      printf(" -x <script>     : ParaView analysis script (requires compiling with -DVIZ_CATALYST)\n");
       printf(" -h              : This message\n");
       printf("\n\n");
    }
```
```diff
@@ -151,6 +152,15 @@ void ParseCommandLineOptions(int argc, char *argv[],
 #endif
             i++;
          }
+         /* -x */
+         else if (strcmp(argv[i], "-x") == 0) {
+#if VIZ_CATALYST
+             opts->scripts.push_back(argv[i+1]);
+#else
+             ParseError("Use of -x requires compiling with Catalyst support.", myRank);
+#endif
+            i+=2;
+         }
          /* -h */
          else if (strcmp(argv[i], "-h") == 0) {
             PrintCommandLineOptions(argv[0], myRank);
```

Next we update `InitializeCatalyst` definition to accept `cmdLineOpts` as an argument:

`lulesh-catalyst.cc`:
```diff
@@ -1,6 +1,8 @@
+#include "lulesh-catalyst.h"
 #ifdef VIZ_CATALYST
 #include <iostream>
-void InitializeCatalyst()
+#include "lulesh.h"
+void InitializeCatalyst(const cmdLineOpts& opts)
 {
   std::cerr << "InitializeCatalyst" << std::endl;
 }
@@ -15,7 +17,7 @@ void FinalizeCatalyst()
   std::cerr << "FinalizeCatalyst" << std::endl;
 }
 #else
-void InitializeCatalyst()
+void InitializeCatalyst(const cmdLineOpts& opts)
 {
 }
 ```

`lulesh-catalyst.h`:
```diff
@@ -1,6 +1,7 @@
 #ifndef LULESH_CATALYST_H
 #define LULESH_CATALYST_H
-void InitializeCatalyst();
+struct cmdLineOpts;
+void InitializeCatalyst(const cmdLineOpts& opts);
 void ExecuteCatalyst();
 void FinalizeCatalyst();
 #endif
 ```

 And finally, update the calling site of `InitializeCatalyst`

`lulesh.cc`:
```diff
@@ -2715,7 +2715,7 @@ int main(int argc, char *argv[])
    locDom = new Domain(numRanks, col, row, plane, opts.nx,
                        side, opts.numReg, opts.balance, opts.cost) ;

-   InitializeCatalyst();
+   InitializeCatalyst(opts);
```
Make sure the code compiles with no issues.


We are now ready to write the actual implementation

`lulesh-catalyst.cc`:
```diff
@@ -3,9 +3,23 @@
 #include "lulesh.h"
 #include <iostream>

+#include <catalyst.hpp>
+#include <catalyst_conduit.hpp>
+
 void InitializeCatalyst(const cmdLineOpts& opts)
 {
-  std::cerr << "InitializeCatalyst" << std::endl;
+  conduit_cpp::Node node;
+  for (size_t cc=0; cc < opts.scripts.size(); ++cc)
+  {
+    conduit_cpp::Node list_entry = node["catalyst/scripts/script_" + std::to_string(cc)].append();
+    list_entry.set(opts.scripts[cc]);
+  }
+
+  catalyst_status err = catalyst_initialize(conduit_cpp::c_node(&node));
+  if (err != catalyst_status_ok)
+  {
+    std::cerr << "Failed to initialize Catalyst: " << err << std::endl;
+  }
 }
 ```

 Let's break this down.

 ```diff
+#include <catalyst.hpp>
+#include <catalyst_conduit.hpp>
```
We will be using the C++ wrappings of catalyst so we need to include these two files.

```diff
+  conduit_cpp::Node node;
```
This is the argument we will be passing to `catalyst_initialize`. Its API resembles closely that of a map/JSON structure.
For a description of the conduit API see [here](https://llnl-conduit.readthedocs.io/en/latest/tutorial_cpp.html)

The node structure  needs to adhere to the [initialize](https://docs.paraview.org/en/latest/Catalyst/blueprints.html#protocol-initialize) protocol of ParaViewCatalyst. 

```diff
+ for (size_t cc=0; cc < opts.scripts.size(); ++cc)
+  {
+    node["catalyst/scripts/script_" + std::to_string(cc)] = opts.scripts[cc];
+  }
```

For every provided script we create an entry under `catalyst/scripts`.

```diff
+  catalyst_status err = catalyst_initialize(conduit_cpp::c_node(&node));
+  if (err != catalyst_status_ok)
+  {
+    std::cerr << "Failed to initialize Catalyst: " << err << std::endl;
+  }
```
Finally, we pass the node to `catalyst_execute` and check its return value.

## 6. Implement `FinalizeCatalyst`
For finalize catalyst we just pass an empty node.

`lulesh-catalyst.cc`:
```diff
 void FinalizeCatalyst()
 {
-  std::cerr << "FinalizeCatalyst" << std::endl;
+  conduit_cpp::Node node;
+  catalyst_status err = catalyst_finalize(conduit_cpp::c_node(&node));
+  if (err != catalyst_status_ok)
+  {
+    std::cerr << "Failed to finalize: " << err << std::endl;
+  }
 }
 ```

## 7. Passing Data to ParaView

Now comes the interesting where we pass simulation data to ParaView. As one
might imagine this step varies significantly from simulation to simulation. 

For Lulesh the data structure of interest is the class `Domain` declared around
line 152 of `lulesh.h`. At each iteration we want pass the
coordinates,connectivity, point- and cell-data of this domain to ParaView.
Since the arrays of interest are not exposed via any Domain method we will be
adding a new method `conduit_cpp::Node& node()` that returns a conduit node
that describes the domain.

```diff
@@ -22,6 +22,10 @@
 #include <vector>

 #include "lulesh-catalyst.h"
+#ifdef VIZ_CATALYST
+#include "catalyst.hpp"
+#include "catalyst_conduit.hpp"
+#endif

 //**************************************************
 // Allow flexibility for arithmetic representations
@@ -444,6 +448,9 @@ class Domain {
    MPI_Request sendRequest[26] ; // 6 faces + 12 edges + 8 corners
 #endif

+#ifdef VIZ_CATALYST
+  conduit_cpp::Node& node() { return m_node; }
+#endif
   private:

    void BuildMesh(Int_t nx, Int_t edgeNodes, Int_t edgeElems);
@@ -594,6 +601,9 @@ class Domain {
    Index_t m_colMin, m_colMax;
    Index_t m_planeMin, m_planeMax ;

+#ifdef VIZ_CATALYST
+   conduit_cpp::Node m_node;
+#endif
 } ;
 ```
When it comes to the contents of the node ParaViewCatalyst uses the Conduit
Mesh
[protocol](https://llnl-conduit.readthedocs.io/en/latest/blueprint_mesh.html)
to describe the data.

Lulesh uses a axis-aligned structured mesh which corresponds to the
[structured-topology](https://llnl-conduit.readthedocs.io/en/latest/blueprint_mesh.html#structured-topology)
so we only need to pass the point coordinates and the dimensions of the domain
along each axis. The coordinates are held in the `m_x`,`m_y`,`m_z` arrays while
the size is given by the `nx` parameter of the `Domain` constructor. 

Let's populate the `m_node` argument during the construction of the domain.
First, we pass information for the coordinates.  This follows the [Coordinate
Sets](https://llnl-conduit.readthedocs.io/en/latest/blueprint_mesh.html#coordinate-sets)
protocol:

`lulesh-init.cc`:
```diff
@@ -191,6 +191,14 @@ Domain::Domain(Int_t numRanks, Index_t colLoc,
    //set initial deltatime base on analytic CFL calculation
    deltatime() = (Real_t(.5)*cbrt(volo(0)))/sqrt(Real_t(2.0)*einit);
+
+#ifdef VIZ_CATALYST
+   this->m_node["coordsets/coords/type"] = "explicit";
+   this->m_node["coordsets/coords/values/x"].set_external(m_x);
+   this->m_node["coordsets/coords/values/y"].set_external(m_y);
+   this->m_node["coordsets/coords/values/z"].set_external(m_z);
+#endif
```
Note that using `set_external` passes only a **reference** to ParaView and thus
no copy of data will be performed when passing the data.

For the connectivity (or Topology) we use the [Structured
Topology](https://llnl-conduit.readthedocs.io/en/latest/blueprint_mesh.html#structured-topology)
protocol.

`lulesh-init.cc`:
```diff
@@ -198,7 +198,11 @@ Domain::Domain(Int_t numRanks, Index_t colLoc,
    this->m_node["coordsets/coords/values/y"].set_external(m_y);
    this->m_node["coordsets/coords/values/z"].set_external(m_z);

+   this->m_node["topologies/mesh/type"] = "structured";
+   this->m_node["topologies/mesh/coordset"] =  "coords";
+   this->m_node["topologies/mesh/elements/dims/i"] = nx;
+   this->m_node["topologies/mesh/elements/dims/j"] = nx;
+   this->m_node["topologies/mesh/elements/dims/k"] = nx;
 #endif
```


::: tip NOTE

Make sure to check other examples here TODO where we create adaptors for different types of data.

:::


We are done with passing the geometry of the domain ! Let's move to updating
`ExecuteCatalyst` and write our first catalyst pipeline!

## 8. Implementing `ExecuteCatalyst`:
Similar to `catalyst_initialize` , `catalyst_execute` expects a conduit node
that adheres to a specific protocol described
[here](https://docs.paraview.org/en/latest/Catalyst/blueprints.html#protocol-execute).
The purpose in this step is to pass information about the iteration step and
simulation time as well as the conduit representation of the domain we just
created.

First we update the signature of `ExecuteCatalyst` to pass the domain by reference.

`lulesh-catalyst.h`:
```diff
@@ -1,7 +1,8 @@
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
`lulesh-catalyst.cc`
```diff
@@ -21,7 +21,7 @@ void InitializeCatalyst(const cmdLineOpts& opts)
   }
 }

-void ExecuteCatalyst()
+void ExecuteCatalyst(Domain& localDomain)
 {
   std::cerr << "ExecuteCatalyst" << std::endl;
 }
@@ -40,7 +40,7 @@ void InitializeCatalyst(const cmdLineOpts& opts)
 {
 }

-void ExecuteCatalyst()
+void ExecuteCatalyst(Domain& localDomain)
 {
 }
```

`lulesh.cc`:
```diff
@@ -2755,7 +2755,7 @@ int main(int argc, char *argv[])
          std::cout.unsetf(std::ios_base::floatfield);
       }

-      ExecuteCatalyst();
+      ExecuteCatalyst(*locDom);
    }
```
Finally, we update `ExecuteCatalyst` to call `catalyst_execute`:

`lulesh-catalyst.cc`:
```diff
@@ -23,7 +23,18 @@ void ExecuteCatalyst(Domain& localDomain)
 {
-  std::cerr << "ExecuteCatalyst" << std::endl;
+  conduit_cpp::Node node;
+  node["catalyst/state/cycle"] = localDomain.cycle();
+  node["catalyst/state/time"] = localDomain.time();
+  node["catalyst/channels/grid/type"] = "mesh";
+  node["catalyst/channels/grid/data"] = localDomain.node();
+
+  catalyst_status err = catalyst_execute(conduit_cpp::c_node(&node));
+  if (err != catalyst_status_ok)
+  {
+    std::cerr << "Failed to execute Catalyst: " << err << std::endl;
+  }
```

That's it! We are passing data to ParaView ! In the next step we will be saving
the data into a file which although it contradicts the idea of insitu, it
allows us to visually inspect the domain in ParaView.

## 9. Running your first ParaViewCatalyst script
Let's save the grid as a vtk file and visualize it in ParaView.
First, create a simple catalyst script:

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
- catalystChannel **needs** to match one of the entries under 
`catalyst/channels/*` of the conduit node we passed in `catalyst_execute`.
- Files will be written under `./datasets` in the current working directory.
- The data will be saved at every iteration.

To run the script:
```bash
export CATALYST_IMPLEMENTATION_NAME="paraview"
export CATALYST_IMPLEMENTATION_PATHS=<path to libcatalyst-paraview>
./lulesh2.0 -s 10 -i 30 -p -x ./script.py
```

Under the `datasets` directory you should now have a collection of 30
`grid_000XXX.vtpd` files which you can open in ParaView to validate the
adaptor.

## 10. Passing solution fields

Exporting the mesh data without the actual quantities does not bring much value besides debugging.
So, let's see how pass nodal and cell data to ParaView.

The `Domain` class holds a number of arrays of interest like energy `m_e` and pressure `m_p` stored for each cell.
It also has scalar nodal arrays like `m_nodalMass` as well as vector quantities like velocity `m_xd,m_yd,m_zd` and 
acceleration `m_xdd,m_ydd,m_zdd`. 
When passing these arrays to catalyst we need to follow the
[fields](https://llnl-conduit.readthedocs.io/en/latest/blueprint_mesh.html#fields)
protocol of the Conduit Mesh Blueprint. 

This is how this looks for the energy `m_e` array:

```
conduit_cpp::Node node;
node["fields/energy/association"] = "element";
node["fields/energy/topology"] = "mesh";
node["fields/energy/values"].set_external(m_e);
```
The `association` entry indicates whether this is a nodal or element value.
`topology` is the name of the topology these values should be associated with.
This names should have been defined already under the `/topologies` leaf of the
conduit node. Indeed if you look back in step 7 you will notice we added all
entries under `/topologies/mesh`. Finally, we pass the array as an external
which mean that no copy will take place when passing the data to ParaView. 

Since we have many arrays of this type let's create a helper method:

`lulesh-init.cc`:
```diff
@@ -12,6 +12,20 @@
 #include <cstdlib>
 #include "lulesh.h"

+#ifdef VIZ_CATALYST
+namespace  {
+
+void AddField(conduit_cpp::Node& node, const std::string& name, const std::string& association, std::vector<Real_t>& field)
+{
+  node["fields/" + name + "/association"] = association;
+  node["fields/" + name + "/topology"] = "mesh";
+  node["fields/" + name + "/values"].set_external(field);
+}
+
+}
+
+#endif
+
 /////////////////////////////////////////////////////////////////////
 Domain::Domain(Int_t numRanks, Index_t colLoc,
                Index_t rowLoc, Index_t planeLoc,
@@ -203,6 +217,14 @@ Domain::Domain(Int_t numRanks, Index_t colLoc,
    this->m_node["topologies/mesh/elements/dims/i"] = nx;
    this->m_node["topologies/mesh/elements/dims/j"] = nx;
    this->m_node["topologies/mesh/elements/dims/k"] = nx;
+
+   AddField(this->m_node,"e","element",m_e);
+   AddField(this->m_node,"p","element",m_p);
+   AddField(this->m_node,"q","element",m_q);
+   AddField(this->m_node,"v","element",m_v);
+   AddField(this->m_node,"ss","element",m_ss);
+   AddField(this->m_node,"elemMass","element",m_elemMass);
+   AddField(this->m_node,"nodalMass","vertex",m_nodalMass);
 #endif

 } // End constructor
```

For vector fields the pattern is similar but we need to pass each vector
component separately under a different leaf below `/values` named `u`,`v`,`w`
respectively.

`lulesh-init.cc`
```diff
@@ -22,6 +22,16 @@ void AddField(conduit_cpp::Node& node, const std::string& name, const std::strin
   node["fields/" + name + "/values"].set_external(field);
 }

+
+void AddField(conduit_cpp::Node& node, const std::string& name, const std::string& association, std::vector<Real_t>& fieldX, std::vector<Real_t>& fieldY, std::vector<Real_t>& fieldZ)
+{
+  node["fields/" + name + "/association"] = association;
+  node["fields/" + name + "/topology"] = "mesh";
+  node["fields/" + name + "/values/u"].set_external(fieldX);
+  node["fields/" + name + "/values/v"].set_external(fieldY);
+  node["fields/" + name + "/values/w"].set_external(fieldZ);
+}
+
 }

 #endif
@@ -225,6 +235,10 @@ Domain::Domain(Int_t numRanks, Index_t colLoc,
    AddField(this->m_node,"ss","element",m_ss);
    AddField(this->m_node,"elemMass","element",m_elemMass);
    AddField(this->m_node,"nodalMass","vertex",m_nodalMass);
+
+   AddField(this->m_node,"velocity","vertex",m_xd,m_yd,m_zd);
+   AddField(this->m_node,"acceleration","vertex",m_xdd,m_ydd,m_zdd);
+   AddField(this->m_node,"force","vertex",m_fx,m_fy,m_fz);
 #endif

 } // End constructor
```

Rerunning the simulation and opening the file in ParaView you should be able to see the new arrays available.




For a guide of how to create more complex pipelines see [here](./using-paraview.md)
