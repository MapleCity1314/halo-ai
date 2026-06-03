import DefaultTheme from "vitepress/theme";
import "./tokens.css";
import "./custom.css";

import DsButton from "./components/DsButton.vue";
import HeroBand from "./components/HeroBand.vue";
import CodeWindowCard from "./components/CodeWindowCard.vue";
import FeatureCard from "./components/FeatureCard.vue";
import ModelComparisonCard from "./components/ModelComparisonCard.vue";
import CtaBand from "./components/CtaBand.vue";

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component("DsButton", DsButton);
    app.component("HeroBand", HeroBand);
    app.component("CodeWindowCard", CodeWindowCard);
    app.component("FeatureCard", FeatureCard);
    app.component("ModelComparisonCard", ModelComparisonCard);
    app.component("CtaBand", CtaBand);
  }
} as import("vitepress").Theme;
