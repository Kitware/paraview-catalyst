# Using ParaView to Create the ParaView Catalyst Script

In the [Getting Started Section](getting-started), the Catalyst scripts were already created for you to use.  In the [Instrumenting the Simulation with Catalyst Section](instrumenting-simulations-with-catalyst), we instrumented the LULESH simulation with Catalyst. In this example, we will go through the process of creating a ParaView Catalyst script and demonstrate its use using the instrumented LULESH. Though you can directly create ParaVire Catalyst scripts using a text editor, this example will be using the ParaView Application to generate the script.

## Getting ParaView

If you built your own ParaView from source (perhaps as part of doing the __Getting Started Example__), you will need to make sure to **not** configure your ParaView Build with the "-DPARAVIEW_BUILD_QT_GUI=OFF" option and instead you will need to make sure you have installed QT on your system (See [here](https://gitlab.kitware.com/paraview/paraview/-/blob/master/Documentation/dev/build.md) for more details).  Else you can download a ParaView release from [here](https://www.paraview.org/download/)

## Step 0 - Setup simulation
For this example, we will be using the Lulesh proxy application which we have already instrumented with catalyst.
To compile the simulation code:

```bash
git clone https://gitlab.kitware.com/catalyst-examples.git
cd catalyst-examples/ParaView/Lulesh-tutorial
cmake -G Ninja -S Version5 -B myLulesh-build -DWITH_CATALYST=1 -DWITH_MPI=1 \
      -DCMAKE_PREFIX_PATH=$CATALYSTBUILD \
      -DParaView_CATALYST_DIR={Location of the ParaView Catalyst Library Directory}
cmake --build myLulesh-build
```

## Step 1 - Loading in Sample Data
The first step in the process will be to use some sample data that best represents the structure and fields that ParaView Catalyst will be dealing with.  This could be a result from a previous simulation run.  When loading in the data into ParaView it is important that the name of the source matches that name of the Catalyst Channel being used.  If it does not, make sure to rename it in the ParaView session.  In the case of this example, the name of the Catalyst Channel is **grid**.  The video below shows how to do the following:

 * Loading in the sample data and rename it to **grid** in the pipeline browser if necessary
 * Showing the data's surfaces and edges
 * Coloring the data based on the magnitude of the acceleration field data

<figure>
    <video controls>
        <source src="/assets/images/guide/concepts/paraview1.mp4" alt="Loading Data Video">
    </video>
    <figcaption>This video shows sample data being loading into ParaView.</figcaption>
</figure>

### Where do I get sample data?

 One way of generating sample would be to run the simulation on a smaller problem.  In the Version5 directory we have provided ParaViewCatalyst script that outputs the simulation's geometry and fields.

```bash
cd myLulesh-build
mpiexec -np 8 ./lulesh2.0 -x ../Version5/input.yaml -p -i 30 -s 10
```
The above will create a coarse simulation composed of 30 time-steps.  If we only want to see the last time-step, we could edit script.py and change ``options.GlobalTrigger.Frequency`` parameter from **1** to **30** and then run the above commands.  This will only write out the result for the last time-step.


## Step 2- Adding 3D Visualization Filters
Next lets creates a set of 10 contours based on the artificial viscosity (*q*) field, but first you will need to project the values that are define on each cell to its neighboring points as shown below.

<figure>
    <video controls>
        <source src="/assets/images/guide/concepts/paraview2.mp4" alt="Countours Data Video">
    </video>
    <figcaption>This video shows the creation of contours based on *artificial viscosity(q)*.</figcaption>
</figure>

## Step 3 - Saving the Generated 3D Information
You will now need to add an extractor to the pipeline to save out the 3D representation of the generated contours in VTK format.  This will create a VTK file for each time-step.

<figure>
    <video controls>
        <source src="/assets/images/guide/concepts/paraview3.mp4" alt="3D Extractor Video">
    </video>
    <figcaption>This video shows how to add a 3D Extraction Filter.</figcaption>
</figure>

## Step 4 - Adding a Line Plot
Next lets creates a line plot of the acceleration values along the diagonal of the original data colored by accelerations.  You can add a title to the plot based on the time-step value.

<figure>
    <video controls>
        <source src="/assets/images/guide/concepts/paraview4.mp4" alt="Line Plot Video">
    </video>
    <figcaption>This video shows how to add a line plot.</figcaption>
</figure>

## Step 5 - Adding Additional Output Files
Now lets add some extractors that will allow the following information be also written out:

* An image of the acceleration plot in PNG format
* The plot data itself written out as a CSV file
* An image of the 3D scene in PNG format.

As in the case of saving the generated 3D information these will be  written out for each time-step; however, in general all of these output generations can have different save frequencies.

<figure>
    <video controls>
        <source src="/assets/images/guide/concepts/paraview5.mp4" alt="Additional Outputs Video">
    </video>
    <figcaption>This video shows how to add extractors to save specific data as images.</figcaption>
</figure>

## Step 6 - Saving the ParaView Catalyst Script

Next you will need to save the pipeline you have created as a ParaView Catalyst state Python file that will be used as the script to process the simulation's data in situ.

<figure>
    <video controls>
        <source src="/assets/images/guide/concepts/paraview6.mp4" alt="Saving State Video">
    </video>
    <figcaption>This video shows how to save the created pipeline as a ParaView Catalyst Python state file.</figcaption>
</figure>

## Step 7 - Creating the Catalyst Input File
Lets copy the **input.yaml** file that was created in the myLulesh-build directory and call it **myLulesh.yaml**.  We need to edit this file so that it uses the ParaView Catalyst script file we just created.  Below is an example created of a generated input.yaml file.  What needs to be changed in the line that starts with **filename:**.  You need to replace the string that follows it with the path of the ParaView Catalyst script you just saved. Remember to keep the double quotes around the string!

```yaml
---
  catalyst:
    scripts:
      script:
        # Filename refers to the ParaView Catalyst Pipeline to be used
        filename: "/Users/bob.obara/Projects/Kitware/CatalystExamples/ParaView/Lulesh-tutorial/myLulesh/script.py"
  catalyst_load:
    implementation: paraview
    search_paths:
      # This should be set to the directory where the ParaView Catalyst Libraries are located
      paraview: "/Users/bob.obara/Projects/Kitware/Builds/ParaView_noQt_XC16.2_CM3.31.6/lib/catalyst"

```

## Step 8 - Running the Simulation and Reviewing the Generated Files

Now lets run the simulation:

```bash
cd myLulesh-build
mpiexec -np 8 ./lulesh2.0 -x myLulesh.yaml -p -i 1000 -s 50
```
The simulation will run for a 1000 steps but you can stop it earlier.

You can now examine the following:
 * The generated line plots images
 * The generated images of the 3D data

<figure>
    <video controls>
        <source src="/assets/images/guide/concepts/paraview7.mp4" alt="Examining Files Video">
    </video>
    <figcaption>This video shows a user examining the generated line plot and 3D images as well as the contents of one of the generated CSV files.</figcaption>
</figure>

## Step 9 - Examining the Generated Contour Files in ParaView
The last step is loading the VTK files that were generated (one for each time-step) showing the requested contours.  The video below shows the steps needed to load in the data as well as animating the contours through the saved time-steps.

<figure>
    <video controls>
        <source src="/assets/images/guide/concepts/paraview8.mp4" alt="Examining Files Video">
    </video>
    <figcaption>This video shows a user examining the generated contours using ParaView.</figcaption>
</figure>



