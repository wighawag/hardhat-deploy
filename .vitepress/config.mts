import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "hardhat-deploy",
  description: "A deployment system for EVM Smart Contracts",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "Home", link: "/" },
      { text: "Introduction", link: "/introduction" },
    ],

    // sidebar: [
    // 	{
    // 		text: 'Examples',
    // 		items: [
    // 			{text: 'Markdown Examples', link: '/markdown-examples'},
    // 			{text: 'Runtime API Examples', link: '/api-examples'},
    // 		],
    // 	},
    // ],

    socialLinks: [
      { icon: "github", link: "https://github.com/wighawag/hardhat-deploy" },
    ],
  },

  srcExclude: ["packages/*", "demoes/*"],

  rewrites(id) {
    // console.log({ id });
    if (id === "README.md") {
      return "introduction.md";
    }
    return id;
  },
});
