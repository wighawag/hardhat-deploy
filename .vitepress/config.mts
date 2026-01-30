import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "hardhat-deploy",
  description: "A Hardhat Plugin For Replicable Deployments And Easy Testing",
  head: [
		['link', {rel: 'icon', href: 'https://rocketh.dev/hardha-deploy/icon.png'}],
		['meta', {name: 'theme-color', content: '#000000'}],

		['meta', {name: 'og:url', content: 'https://rocketh.dev/hardha-deploy'}],
		['meta', {name: 'og:title', content: 'hardhat-deploy'}],
		['meta', {name: 'og:description', content: 'A Hardhat Plugin For Replicable Deployments And Easy Testing'}],
		['meta', {name: 'og:type', content: 'website'}],
		['meta', {name: 'og:locale', content: 'en'}],
		['meta', {name: 'og:site_name', content: 'hardhat-deploy'}],
		['meta', {name: 'og:image', content: 'https://rocketh.dev/hardha-deploy/preview.png'}],

		['meta', {name: 'twitter:url', content: 'https://rocketh.dev/hardha-deploy'}],
		['meta', {name: 'twitter:title', content: 'hardhat-deploy'}],
		['meta', {name: 'twitter:description', content: 'A Hardhat Plugin For Replicable Deployments And Easy Testing'}],
		['meta', {name: 'twitter:card', content: 'summary_large_image'}],
		[
			'meta',
			{
				name: 'twitter:image',
				content: 'https://rocketh.dev/hardha-deploy/preview.png',
			},
		],
	],
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
            text: "Guides",
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
                text: "Migrate from v1",
                link: "/documentation/how-to/migration-from-v1",
              },
              {
                text: "Configure Network Helpers",
                link: "/documentation/how-to/configure-network-helpers",
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
            text: "Contract Patterns",
            collapsed: true,
            items: [
              {
                text: "Proxy Contracts",
                link: "/documentation/how-to/deploy-with-proxies",
              },
              {
                text: "Diamond Contracts",
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
              {
                text: "Use Fork Testing",
                link: "/documentation/how-to/use-fork-testing",
              },
            ],
          },
          {
            text: "Development Workflow",
            collapsed: true,
            items: [
              {
                text: "Use Viem Integration",
                link: "/documentation/how-to/use-viem-integration",
              },
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
        link: "https://github.com/wighawag/hardhat-deploy#readme",
      },
    ],

    search: {
      provider: "local",
    },
  },

  base: process.env.VITEPRESS_BASE || undefined,

  srcExclude: ["packages/*", "demoes/*", "./AGENTS.md", "tmp/*"],

  // rewrites(id) {
  //   // console.log({ id });
  //   if (id === "README.md") {
  //     return "documentation/introduction.md";
  //   }
  //   return id;
  // },
});
