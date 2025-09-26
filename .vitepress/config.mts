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
      {
        text: "How-To Guides",
        collapsed: false,
        items: [
          {
            text: "Overview",
            link: "/documentation/how-to/index",
          },
          {
            text: "Getting Started",
            collapsed: true,
            items: [
              {
                text: "Set Up Your First Project",
                link: "/documentation/how-to/setup-first-project",
              },
              {
                text: "Configure Named Accounts",
                link: "/documentation/how-to/configure-named-accounts",
              },
              {
                text: "Use Tags and Dependencies",
                link: "/documentation/how-to/use-tags-and-dependencies",
              },
            ],
          },
          {
            text: "Advanced Deployments",
            collapsed: true,
            items: [
              {
                text: "Deploy with Proxies",
                link: "/documentation/how-to/deploy-with-proxies",
              },
              {
                text: "Deploy Diamond Contracts",
                link: "/documentation/how-to/deploy-diamond-contracts",
              },
            ],
          },
          {
            text: "Testing Integration",
            collapsed: true,
            items: [
              {
                text: "Use Deployment Fixtures in Tests",
                link: "/documentation/how-to/deployment-fixtures-in-tests",
              },
            ],
          },
          {
            text: "Development Workflow",
            collapsed: true,
            items: [
              {
                text: "Verify Contracts",
                link: "/documentation/how-to/verify-contracts",
              },
              {
                text: "Export Deployments for Frontend",
                link: "/documentation/how-to/export-deployments",
              },
            ],
          },
        ],
      },
    ],

    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/wighawag/hardhat-deploy",
      },
    ],

    search: {
      provider: "local",
    },
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
