import DefaultTheme from "vitepress/theme";
import Layout from "./Layout.vue";
import "./tokens.css";
import "./custom.css";

import DsButton from "./components/DsButton.vue";
import HeroBand from "./components/HeroBand.vue";
import CodeWindowCard from "./components/CodeWindowCard.vue";
import FeatureCard from "./components/FeatureCard.vue";
import ModelComparisonCard from "./components/ModelComparisonCard.vue";
import CtaBand from "./components/CtaBand.vue";
import Tabs from "./components/Tabs.vue";
import TabPanel from "./components/TabPanel.vue";
import Callout from "./components/Callout.vue";
import CodeGroup from "./components/CodeGroup.vue";

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component("DsButton", DsButton);
    app.component("HeroBand", HeroBand);
    app.component("CodeWindowCard", CodeWindowCard);
    app.component("FeatureCard", FeatureCard);
    app.component("ModelComparisonCard", ModelComparisonCard);
    app.component("CtaBand", CtaBand);
    app.component("Tabs", Tabs);
    app.component("TabPanel", TabPanel);
    app.component("Callout", Callout);
    app.component("CodeGroup", CodeGroup);
  }
} as import("vitepress").Theme;
