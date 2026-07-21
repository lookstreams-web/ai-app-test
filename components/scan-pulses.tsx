import styles from "./scan-pulses.module.css";

/**
 * Anillos de "escaneo" ambientales. El contenedor que los reciba debe tener
 * `position: relative` + `isolation: isolate` para que queden detrás del contenido.
 */
export function ScanPulses() {
  return (
    <div aria-hidden className={styles.pulses}>
      <span />
      <span />
      <span />
    </div>
  );
}
