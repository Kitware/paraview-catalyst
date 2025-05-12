

<figure>
  <video control loop autoplay>
    <source src="/assets/images/usecase/gallery/phasta-wingtip.mov" alt="PHASTA Simulation">
  </video>
    <figcaption>Catalyst is being used to improve the underlying turbulence models with AI/ML. This visualization shows two data extracts, wall distance, and Q-criterion contours colored by velocity magnitude were captured from the PHASTA CFD simulation code running on 256k MPI processes using Catalyst.</figcaption>
</figure>

Traditional simulation frameworks—honed over decades—are powerful, precise, and deeply specialized. Their complexity and domain specificity, however, make them difficult to modify, and many researchers remain cautious about introducing AI/ML into these workflows. Concerns about the opacity of “black box” models and the lack of consistent, quantifiable benefits have limited the adoption of AI/ML in computational science, where transparency and reproducibility are critical.

To bridge this gap, a promising approach is emerging: targeted, in situ AI/ML integration that complements rather than replaces established simulation codes. Using ParaView Catalyst, we’re developing a modular machine learning toolbox that operates directly within simulation workflows. This approach avoids intrusive code modifications and eliminates the need for costly data movement, enabling researchers to explore tailored AI/ML solutions that enhance performance and insight—while maintaining full control over the scientific process.

You can find more information about this effort [here](https://www.kitware.com/unlocking-ais-potential-in-computational-science-without-compromising-reliability-and-precision/).
