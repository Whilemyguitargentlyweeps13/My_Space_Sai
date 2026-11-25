const stage = document.querySelector("#workspace-stage");
if (!stage) throw new Error("The workspace illustration is missing.");

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const reset = () => {
  stage.style.transform = "";
  stage.classList.remove("is-looking");
};

stage.addEventListener("pointermove", (event) => {
  if (reducedMotion.matches || event.pointerType === "touch") return;
  const bounds = stage.getBoundingClientRect();
  const x = (event.clientX - bounds.left) / bounds.width - 0.5;
  const y = (event.clientY - bounds.top) / bounds.height - 0.5;
  const rotateX = Math.max(-2.2, Math.min(2.2, -y * 4.4));
  const rotateY = Math.max(-2.2, Math.min(2.2, x * 4.4));
  stage.style.transform = `perspective(1100px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-3px)`;
  stage.classList.add("is-looking");
});

stage.addEventListener("pointerleave", reset);
stage.addEventListener("pointercancel", reset);
reducedMotion.addEventListener("change", () => {
  if (reducedMotion.matches) reset();
});
