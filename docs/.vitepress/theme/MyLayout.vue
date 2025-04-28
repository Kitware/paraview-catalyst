<!--.vitepress/theme/MyLayout.vue-->
<script setup>
import DefaultTheme from 'vitepress/theme'
const { Layout } = DefaultTheme
</script>

<template>
  <Layout>
    <template #home-hero-image>
      <figure>
      <a href="/paraview-catalyst/usecase/warpx.html"><img src="/assets/images/usecase/gallery/warpX.gif" class="hero-video" /></a>
      <figcaption> An example of ParaView Catalyst being used in a high-energy physics simulation.
      </figcaption>
    </figure>
    </template>
  </Layout>
</template>

<style scoped>
  .hero-video {
    margin-top: calc((var(--vp-nav-height) + var(--vp-layout-top-height, 0px)) * -1);
    padding: calc(var(--vp-nav-height) + var(--vp-layout-top-height, 0px) + 48px) 24px 48px;
    height: 300px;
    aspect-ratio: 1;
  }

  @media (min-width: 640px) {
    .hero-video {
      height: 400px;
    aspect-ratio: 1;
    }
  }
  @media (min-width: 960px) {
    .hero-video {
      margin-left: 2rem; 
      height: 450px;
object-fit: cover;
    }
  }
</style>