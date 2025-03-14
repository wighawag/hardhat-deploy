---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "hardhat-deploy"
  text: "A Hardhat Plugin For Replicable Deployments And Easy Testing"
  tagline: Easy And Flexible Deployment for both development and production
  image:
    dark: /logo.svg
    light: /logo.svg
    alt: hardhat-deploy logo
  actions:
    - theme: brand
      text: Introduction
      link: /introduction
    - theme: alt
      text: github
      link: https://github.com/wighawag/hardhat-deploy/tree/v2#readme

features:
  - title: Declarative Deployments
    details: Define what state you want, hardhat-deploy take care of the rest
  - title: Replicable Deployments
    details: Reuse your deployments in test or for other networks
  - title: Modular
    details: At its core, hardhat-deploy only provide a save and read function for deployment, everything else is an external module
---
