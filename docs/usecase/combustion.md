# Using ParaView Catalyst in Internal Combustion Simulations

Simulating internal combustion engines requires capturing fast, complex physical events—especially phenomena like autoignition, which can lead to damaging engine knock. Knock occurs when combustion initiates at unintended times or locations, potentially degrading engine performance or causing failure. While pressure traces from simulations can reveal when knock occurs, understanding why it happens—by identifying the precise thermodynamic conditions leading up to autoignition—demands high-frequency data capture, which traditionally results in large outputs and long simulation times.

|![Image](/assets/images/usecase/gallery/in-situ-analysis-2-1024x875.jpg)|
|:--:|
|CONVERGE simulation of in-cylinder combustion in a gasoline spark-ignition engine, showing auto-ignition (yellow) occurring in front of the flame front (blue). Image courtesy of Convergent Science.|

To overcome this challenge, [Convergent Science](https://convergecfd.com)’s CFD platform, [CONVERGE](https://convergecfd.com/products/converge-cfd-software), integrates in situ processing through ParaView Catalyst. This approach enables real-time analysis and visualization during the simulation itself, dramatically reducing I/O overhead and minimizing data storage requirements, all while maintaining the resolution needed to investigate fast transient events. For simulation users, this means faster turnaround times, fewer storage headaches, and deeper insight into the root causes of engine knock—without compromising accuracy or fidelity.