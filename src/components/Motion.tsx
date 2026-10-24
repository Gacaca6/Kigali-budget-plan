import { useEffect, useRef, useState, type ReactNode } from "react";
import type { AnimationItem } from "lottie-web";
import wallet from "../animations/wallet.json";
import growth from "../animations/growth.json";
import success from "../animations/success.json";

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)"),
      change = () => setReduced(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  return reduced;
}
export function LocalLottie({
  variant = "wallet",
  className = "",
}: {
  variant?: "wallet" | "growth" | "success";
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null),
    reduced = useReducedMotion();
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let player: AnimationItem | undefined;
    setLoaded(false);
    void import("lottie-web/build/player/lottie_light")
      .then(({ default: lottie }) => {
        if (cancelled || !ref.current) return;
        player = lottie.loadAnimation({
          container: ref.current,
          renderer: "svg",
          loop: false,
          autoplay: !reduced,
          animationData: structuredClone({ wallet, growth, success }[variant]),
          rendererSettings: { progressiveLoad: false },
        });
        player.addEventListener("DOMLoaded", () => {
          if (cancelled) return;
          if (reduced) player?.goToAndStop(60, true);
          setLoaded(true);
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      player?.destroy();
    };
  }, [variant, reduced]);
  return (
    <span className={`local-lottie ${className}`} aria-hidden="true">
      <span ref={ref} className="lottie-canvas" />
      {!loaded && <img className="lottie-fallback" src="/icon.svg" alt="" />}
    </span>
  );
}
export function Launch({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(true),
    [leaving, setLeaving] = useState(false),
    reduced = useReducedMotion();
  useEffect(() => {
    const leave = setTimeout(() => setLeaving(true), reduced ? 120 : 900),
      finish = setTimeout(() => setVisible(false), reduced ? 140 : 1200);
    return () => {
      clearTimeout(leave);
      clearTimeout(finish);
    };
  }, [reduced]);
  return (
    <>
      <div
        className="app-entry"
        inert={visible}
        aria-hidden={visible || undefined}
      >
        {children}
      </div>
      {visible && (
        <div
          className={`splash-screen ${leaving ? "leaving" : ""}`}
          role="status"
          aria-label="Opening KoraBudget"
        >
          <div className="splash-emblem">
            <LocalLottie variant="wallet" className="splash-animation" />
          </div>
          <h1>KoraBudget</h1>
          <span className="splash-progress" />
        </div>
      )}
    </>
  );
}
