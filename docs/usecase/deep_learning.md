# Using ParaView Catalyst in Training Deep Learning Workflows

Surrogate models offer a powerful way to approximate the output of complex numerical solvers at a fraction of the computational cost—making them ideal for real-time applications where traditional solvers fall short. Simulations based on partial differential equations, such as those using finite element or finite volume methods, often require extensive computation times, making them impractical for use in dynamic environments like control systems or digital twins.

<figure>
	<iframe style="aspect-ratio: 560/315" width="100%" src="https://player.vimeo.com/video/681359142?h=256ce5d59f&dnt=1&app_id=122963?muted=1&autoplay=1&loop=1" title="Vimeo video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen muted></iframe>
	<figcaption>The video below shows the results of the inference filter, once the turbulent flow is well established.</figcaption>
</figure>

To address this challenge, EDF Lab—the R&D arm of one of Europe’s largest electric utilities—is exploring deep learning techniques to build high-fidelity surrogate models. Their engineers routinely perform large-scale CFD simulations for critical infrastructure such as wind turbines, steam generators, and heat exchangers. These simulations are data-intensive and time-consuming, limiting their utility in scenarios where rapid feedback is essential.

<figure>
	<iframe style="aspect-ratio: 560/315" width="100%" src="https://player.vimeo.com/video/681359049?h=e1ae59fe30&dnt=1&app_id=122963?muted=1&autoplay=1&loop=1" title="Vimeo video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen muted></iframe>
	<figcaption>Full overview of the training process. The top mesh is the objective, the bottom mesh is the prediction.</figcaption>
</figure>

In this novel approach, ParaView Catalyst is used to generate in situ visualizations during training runs, allowing researchers to monitor and evaluate the behavior of the simulation and the surrogate model in real time. This real-time visualization capability not only accelerates the model development cycle but also enables deeper insight into complex fluid behaviors—paving the way for responsive, data-driven engineering solutions like digital twins.

You can find more information about this effort [here](https://www.kitware.com/deep-learning-surrogate-models-in-paraview-viewing-inference-results-and-monitoring-the-training-process-in-real-time-with-catalyst/).
