(function () {
  try {
    var stored = window.localStorage.getItem("pf-theme");
    var theme = stored === "LIGHT" || stored === "DARK" ? stored : "SYSTEM";
    var dark =
      theme === "DARK" ||
      (theme === "SYSTEM" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
  } catch (_error) {
    /* storage unavailable: keep the default light theme */
  }
})();
