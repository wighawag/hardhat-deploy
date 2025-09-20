import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "hardhat-deploy",
  description: "A deployment system for EVM Smart Contracts",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "Home", link: "/" },
      { text: "Documentation", link: "/documentation/introduction" },
    ],

    sidebar: [
      {
        text: "Introduction",
        link: "/documentation/introduction",
      },
      {
        text: "What Is It For?",
        link: "/documentation/what-is-it-for",
      },
      {
        text: "In A Nutshell",
        link: "/documentation/in-a-nutshell",
      },
      {
        text: "Installation",
        link: "/documentation/installation",
      },
      {
        text: "Command And Tasks",
        link: "/documentation/command-and-tasks",
      },
      {
        text: "Rocketh Environment",
        link: "/documentation/environment",
      },
      {
        text: "Configuration",
        link: "/documentation/configuration",
      },
      {
        text: "How to deploy contracts",
        link: "/documentation/how-to-deploy-contracts",
      },
    ],

    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/wighawag/hardhat-deploy/tree/v2#readme",
      },
    ],
  },

  base: process.env.VITEPRESS_BASE || undefined,

  srcExclude: ["packages/*", "demoes/*"],

  // rewrites(id) {
  //   // console.log({ id });
  //   if (id === "README.md") {
  //     return "documentation/introduction.md";
  //   }
  //   return id;
  // },
});
